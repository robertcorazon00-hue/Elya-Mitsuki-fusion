// elya-reminders-scheduler.js — Rappels programmés par langage naturel
// ("rappelle-moi de X dans 2h", détecté par elya/reminderParser.js).
//
// Même principe que elya-send-scheduler.js (démarré une seule fois depuis
// server.js) mais plus simple : un rappel cible directement le chat où il a
// été demandé (chatId, DM ou groupe) — pas de numéro externe à vérifier via
// sock.onWhatsApp comme pour !send.
//
// Persistance : elya/store.js (remindersStore), donc via shared/db.js.

import { remindersStore, saveData } from './elya/store.js';

const CHECK_INTERVAL_MS = 30_000;

export function listPendingReminders(chatId) {
  return remindersStore.items
    .filter((it) => it.status === 'pending' && (!chatId || it.chatId === chatId))
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

export async function addReminder({ chatId, message, scheduledAt, createdBy, senderName }) {
  const item = {
    id: remindersStore.nextId++,
    chatId,
    message,
    scheduledAt: scheduledAt.toISOString(),
    createdAt: new Date().toISOString(),
    createdBy,
    senderName,
    status: 'pending',
    error: null,
  };
  remindersStore.items.push(item);
  await saveData('reminders', remindersStore);
  return item;
}

export async function cancelReminder(id, chatId) {
  const item = remindersStore.items.find(
    (it) => it.id === id && it.status === 'pending' && (!chatId || it.chatId === chatId)
  );
  if (!item) return null;
  item.status = 'cancelled';
  await saveData('reminders', remindersStore);
  return item;
}

let schedulerStarted = false;
export function startReminderScheduler(sock) {
  if (schedulerStarted) return;
  schedulerStarted = true;

  setInterval(async () => {
    const now = new Date();
    const due = remindersStore.items.filter(
      (it) => it.status === 'pending' && new Date(it.scheduledAt) <= now
    );
    if (due.length === 0) return;

    for (const item of due) {
      try {
        await sock.sendMessage(item.chatId, { text: `⏰ Rappel : ${item.message}` });
        item.status = 'sent';
        item.sentAt = new Date().toISOString();
      } catch (err) {
        item.status = 'failed';
        item.error = err.message;
      }
      await saveData('reminders', remindersStore);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }, CHECK_INTERVAL_MS);
}
