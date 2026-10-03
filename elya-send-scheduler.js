// elya-send-scheduler.js — Envois WhatsApp programmés (!send), séparé de
// elya/plugins/send.js pour pouvoir être démarré depuis server.js une seule fois
// au lancement du bot (même principe que elya-channel-posts.js).
//
// Persistance : elya/store.js (scheduledSendsStore), donc via shared/db.js
// (JSON par défaut, ou Mongo/Postgres/MySQL si configuré) — survit aux redémarrages.

import { scheduledSendsStore, saveData } from './elya/store.js';

export const TIMEZONE = 'Africa/Lome';
const CHECK_INTERVAL_MS = 30_000; // vérifie toutes les 30s les envois arrivés à échéance
const DELAY_BETWEEN_SENDS_MS = 1500; // petit délai entre deux envois d'un même passage

// ─── Fuseau horaire (aucune dépendance externe : Intl suffit) ──────────────
// Africa/Lome n'a pas d'heure d'été (UTC+0 toute l'année), mais ces helpers
// restent génériques au cas où le fuseau change un jour.
export function componentsInZone(instant, timeZone = TIMEZONE) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second),
  };
}

export function nowInZone(timeZone = TIMEZONE) {
  return componentsInZone(new Date(), timeZone);
}

// Ajoute (ou retire) des jours calendaires dans le fuseau donné. On part de
// midi UTC ce jour-là pour rester loin de tout bord lié à un changement d'heure.
export function addDaysInZone(year, month, day, days, timeZone = TIMEZONE) {
  const base = Date.UTC(year, month - 1, day, 12, 0, 0);
  const c = componentsInZone(new Date(base + days * 86400000), timeZone);
  return { year: c.year, month: c.month, day: c.day };
}

// Convertit une heure "murale" locale (dans timeZone) en instant UTC réel, en
// devinant puis en corrigeant l'écart observé.
export function zonedTimeToUtc(year, month, day, hour, minute, timeZone = TIMEZONE) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const asIfLocal = componentsInZone(guess, timeZone);
  const asIfLocalUtc = Date.UTC(
    asIfLocal.year, asIfLocal.month - 1, asIfLocal.day,
    asIfLocal.hour, asIfLocal.minute, asIfLocal.second
  );
  return new Date(guess + (guess - asIfLocalUtc));
}

// ─── Accès aux données (persistées via elya/store.js) ──────────────────────
export function listPendingSends() {
  return scheduledSendsStore.items
    .filter((it) => it.status === 'pending')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

// Historique complet pour le dashboard web (tous statuts), le plus récent en premier.
export function listAllSends() {
  return scheduledSendsStore.items
    .slice()
    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
}

export async function addScheduledSend({ digits, display, message, scheduledAt, createdBy }) {
  const item = {
    id: scheduledSendsStore.nextId++,
    digits,
    toDisplay: display,
    message,
    scheduledAt: scheduledAt.toISOString(),
    createdAt: new Date().toISOString(),
    createdBy,
    status: 'pending',
    error: null,
  };
  scheduledSendsStore.items.push(item);
  await saveData('scheduledSends', scheduledSendsStore);
  return item;
}

export async function cancelScheduledSend(id) {
  const item = scheduledSendsStore.items.find((it) => it.id === id && it.status === 'pending');
  if (!item) return null;
  item.status = 'cancelled';
  await saveData('scheduledSends', scheduledSendsStore);
  return item;
}

// ─── Planificateur : vérifie toutes les 30s les envois arrivés à échéance ──
let schedulerStarted = false;
export function startScheduler(sock) {
  if (schedulerStarted) return;
  schedulerStarted = true;

  setInterval(async () => {
    const now = new Date();
    const due = scheduledSendsStore.items.filter(
      (it) => it.status === 'pending' && new Date(it.scheduledAt) <= now
    );
    if (due.length === 0) return;

    for (const item of due) {
      // Revérifie que le numéro est bien sur WhatsApp juste avant l'envoi
      // (il peut avoir changé depuis la programmation).
      try {
        const [check] = await sock.onWhatsApp(item.digits);
        if (!check?.exists) {
          item.status = 'failed';
          item.error = 'ce numéro ne semble plus être sur WhatsApp';
        } else {
          await sock.sendMessage(check.jid, { text: item.message });
          item.status = 'sent';
          item.sentAt = new Date().toISOString();
        }
      } catch (err) {
        item.status = 'failed';
        item.error = err.message;
      }
      await saveData('scheduledSends', scheduledSendsStore);

      try {
        const notif = item.status === 'sent'
          ? `✅ Message envoyé à ${item.toDisplay} (référence #${item.id}).`
          : `❌ Échec de l'envoi programmé à ${item.toDisplay} (référence #${item.id}) : ${item.error}`;
        await sock.sendMessage(item.createdBy, { text: notif });
      } catch (e) {
        console.error('Erreur notification envoi programmé:', e.message);
      }

      // Petit délai entre deux envois pour éviter de spammer WhatsApp d'un coup.
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_SENDS_MS));
    }
  }, CHECK_INTERVAL_MS);
}
