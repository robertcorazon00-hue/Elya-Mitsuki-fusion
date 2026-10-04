// elya/plugins/send.js — !send : programme l'envoi d'un message WhatsApp à une heure donnée.
//
//   !send <destinataire> <heure> (<message>)
//   !send <destinataire> <heure> message <nom>   — message déjà enregistré via !add message
//   !send list                                    — liste les envois programmés
//   !send cancel <numéro>                         — annule un envoi (numéro donné à la
//                                                    confirmation ou par !send list)
//
// Destinataire : un numéro (22871406871 / +228...), un lien wa.me, ou un nom
// enregistré avec !add contact / !add numero (voir vault.js).
// Heure : "20h10", "20:10", "demain 20h10" ou "25/09 20h10" — fuseau Africa/Lome.
// La logique de planification/persistance/relance vit dans elya-send-scheduler.js
// (démarré une seule fois depuis server.js), ce fichier ne fait que l'interface
// de commande : parser ce que la personne a tapé, puis appeler ce module.
import { vaultStore } from '../store.js';
import { PREFIX } from '../config.js';
import {
  TIMEZONE, nowInZone, addDaysInZone, zonedTimeToUtc, componentsInZone,
  listPendingSends, addScheduledSend, cancelScheduledSend,
} from '../../elya-send-scheduler.js';

// ─── Normalisation (identique à vault.js, dupliquée à dessein — voir la note
// dans mitsuki/pluginHelpers.js sur ce genre de petit helper répété) ───
function normalize(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function digitsOnly(str) {
  return (str || '').replace(/\D/g, '');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// ─── Destinataire : numéro brut, lien wa.me, ou nom enregistré (contact/numero) ───
function looksLikePhone(token) {
  return /^\+?[\d\s-]{8,}$/.test(token) && digitsOnly(token).length >= 8;
}

function resolveDestinataire(token) {
  if (!token) return null;

  const waMe = token.match(/wa\.me\/(\d+)/i);
  if (waMe) return { digits: waMe[1], display: '+' + waMe[1] };

  if (looksLikePhone(token)) {
    const digits = digitsOnly(token);
    return { digits, display: '+' + digits };
  }

  const entry = vaultStore.contact?.[normalize(token)] || vaultStore.numero?.[normalize(token)];
  if (entry?.content) {
    const digits = digitsOnly(entry.content);
    if (digits.length >= 8) return { digits, display: `${entry.originalName} (+${digits})` };
  }

  return null;
}

// ─── Heure : "20h10", "20:10", "demain 20h10", "25/09 20h10" ───
const HEURE_REGEX = /^(?:(demain)\s+)?(?:(\d{1,2})\/(\d{1,2})\s+)?(\d{1,2})[:h](\d{1,2})/i;

function parseHeure(str) {
  const m = str.match(HEURE_REGEX);
  if (!m) return null;
  const [full, demain, dayStr, monthStr, hourStr, minStr] = m;
  const hour = Number(hourStr);
  const minute = Number(minStr);
  if (hour > 23 || minute > 59) return null;

  const now = nowInZone(TIMEZONE);
  let year = now.year, month = now.month, day = now.day;
  const explicitDate = !!(dayStr && monthStr);

  if (explicitDate) {
    day = Number(dayStr);
    month = Number(monthStr);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  } else if (demain) {
    ({ year, month, day } = addDaysInZone(now.year, now.month, now.day, 1, TIMEZONE));
  }

  let date = zonedTimeToUtc(year, month, day, hour, minute, TIMEZONE);
  if (isNaN(date.getTime())) return null;

  const nowUtc = new Date();
  if (date <= nowUtc) {
    if (explicitDate) {
      // Date explicite déjà passée cette année : on suppose l'année suivante.
      date = zonedTimeToUtc(year + 1, month, day, hour, minute, TIMEZONE);
    } else if (!demain) {
      // Juste une heure, déjà passée aujourd'hui : programmée pour demain.
      const t = addDaysInZone(now.year, now.month, now.day, 1, TIMEZONE);
      date = zonedTimeToUtc(t.year, t.month, t.day, hour, minute, TIMEZONE);
    }
  }

  return { date, consumed: full.length };
}

function formatWhen(date) {
  const now = nowInZone(TIMEZONE);
  const z = componentsInZone(date, TIMEZONE);
  const hm = `${pad2(z.hour)}h${pad2(z.minute)}`;
  if (z.year === now.year && z.month === now.month && z.day === now.day) return hm;
  const tmr = addDaysInZone(now.year, now.month, now.day, 1, TIMEZONE);
  if (z.year === tmr.year && z.month === tmr.month && z.day === tmr.day) return `demain ${hm}`;
  return `${pad2(z.day)}/${pad2(z.month)} ${hm}`;
}

// ─── Message : "(texte libre)" ou "message <nom>" (référence vers !add message) ───
function extractMessage(remainder) {
  const firstParen = remainder.indexOf('(');
  const lastParen = remainder.lastIndexOf(')');
  if (firstParen !== -1 && lastParen > firstParen) {
    const content = remainder.slice(firstParen + 1, lastParen).trim();
    return content ? { ok: true, content } : { ok: false };
  }

  const named = remainder.trim().match(/^messages?\s+(.+)$/i);
  if (named) {
    const nom = named[1].trim();
    const entry = vaultStore.message?.[normalize(nom)];
    if (!entry) {
      return { ok: false, reason: `💛 Aucun message enregistré sous *${nom}*.\nEnregistre-le d'abord avec ${PREFIX}add message <texte> (${nom}).` };
    }
    return { ok: true, content: entry.content };
  }

  return { ok: false };
}

const USAGE =
  `💛 Utilise : ${PREFIX}send <destinataire> <heure> (<message>)\n\n` +
  `Ex:\n` +
  `${PREFIX}send 22871406871 20h10 (Salut, tu es dispo ?)\n` +
  `${PREFIX}send Kofi demain 08h00 (Bon réveil !)\n` +
  `${PREFIX}send +22890000000 25/09 20h10 message rappel\n\n` +
  `Destinataire : numéro, lien wa.me, ou nom enregistré via ${PREFIX}add contact/numero.\n` +
  `Heure : 20h10, 20:10, "demain 20h10" ou "25/09 20h10" (fuseau Africa/Lome).\n\n` +
  `Autres commandes : ${PREFIX}send list · ${PREFIX}send cancel <numéro>`;

async function handleList(sock, chatId) {
  const pending = listPendingSends();
  if (pending.length === 0) {
    await sock.sendMessage(chatId, { text: `📅 Aucun envoi programmé pour l'instant.` });
    return;
  }
  const lines = pending.map((it) => {
    const apercu = it.message.length > 60 ? it.message.slice(0, 57) + '...' : it.message;
    return `#${it.id} — ${formatWhen(new Date(it.scheduledAt))} → ${it.toDisplay} : "${apercu}"`;
  });
  await sock.sendMessage(chatId, {
    text: `📅 *Envois programmés (${pending.length}) :*\n\n${lines.join('\n')}\n\n_Annuler : ${PREFIX}send cancel <numéro>_`,
  });
}

async function handleCancel(sock, chatId, arg) {
  const id = parseInt(arg, 10);
  if (!id) {
    await sock.sendMessage(chatId, { text: `💛 Utilise : ${PREFIX}send cancel <numéro>\nLe numéro est celui donné à la programmation, ou par ${PREFIX}send list.` });
    return;
  }
  const cancelled = await cancelScheduledSend(id);
  if (!cancelled) {
    await sock.sendMessage(chatId, { text: `💛 Aucun envoi en attente avec le numéro #${id}. Tape ${PREFIX}send list pour voir les envois en cours.` });
    return;
  }
  await sock.sendMessage(chatId, {
    text: `🗑️ Envoi #${id} annulé (${cancelled.toDisplay}, prévu ${formatWhen(new Date(cancelled.scheduledAt))}).`,
  });
}

export default {
  command: 'send',
  category: 'GENERAL',
  description: "Programme l'envoi d'un message WhatsApp à une heure donnée (réservé au créateur)",
  ownerOnly: true,
  handler: async ({ sock, chatId, cmd, text, args }) => {
    const sub = (args[1] || '').toLowerCase();
    if (sub === 'list') { await handleList(sock, chatId); return; }
    if (sub === 'cancel') { await handleCancel(sock, chatId, args[2]); return; }

    const rest = text.slice(PREFIX.length + cmd.length).replace(/^\s+/, '');
    const tokenMatch = rest.match(/^(\S+)\s*([\s\S]*)$/);
    if (!tokenMatch || !tokenMatch[2]) {
      await sock.sendMessage(chatId, { text: USAGE });
      return;
    }
    const destinataireToken = tokenMatch[1];
    const afterDest = tokenMatch[2];

    const parsedHeure = parseHeure(afterDest);
    if (!parsedHeure) {
      await sock.sendMessage(chatId, { text: `💛 Heure introuvable ou invalide.\n\n${USAGE}` });
      return;
    }

    const messageZone = afterDest.slice(parsedHeure.consumed);
    const msgResult = extractMessage(messageZone);
    if (!msgResult.ok) {
      await sock.sendMessage(chatId, {
        text: msgResult.reason || `💛 Message manquant — mets-le entre parenthèses, ou utilise "message <nom>".\n\n${USAGE}`,
      });
      return;
    }

    const dest = resolveDestinataire(destinataireToken);
    if (!dest) {
      await sock.sendMessage(chatId, {
        text: `💛 Destinataire "${destinataireToken}" introuvable — donne un numéro, un lien wa.me, ou un nom enregistré via ${PREFIX}add contact/numero.`,
      });
      return;
    }

    // Vérifie que le numéro est sur WhatsApp avant de confirmer. Si la
    // vérification échoue techniquement (pas une réponse "n'existe pas"),
    // on programme quand même — le planificateur revérifiera au moment d'envoyer.
    let exists = true;
    try {
      const [check] = await sock.onWhatsApp(dest.digits);
      exists = !!check?.exists;
    } catch (e) { /* voir commentaire ci-dessus */ }

    if (!exists) {
      await sock.sendMessage(chatId, { text: `💛 ${dest.display} ne semble pas être sur WhatsApp. Vérifie le numéro.` });
      return;
    }

    const item = await addScheduledSend({
      digits: dest.digits,
      display: dest.display,
      message: msgResult.content,
      scheduledAt: parsedHeure.date,
      createdBy: chatId,
    });

    await sock.sendMessage(chatId, {
      text: `✅ Message programmé pour ${formatWhen(parsedHeure.date)} à ${dest.display} (référence #${item.id}).`,
    });
  },
};
