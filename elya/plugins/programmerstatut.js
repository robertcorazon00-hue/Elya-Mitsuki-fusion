// elya/plugins/programmerstatut.js — !programmerstatut : programme un statut
// WhatsApp (texte, photo ou vidéo) à une heure donnée. Réservé au créateur.
//
//   !programmerstatut <heure> (<texte>)                — statut texte
//   [en réponse à une photo/vidéo] !programmerstatut <heure> (<légende optionnelle>)
//   !programmerstatut list
//   !programmerstatut cancel <numéro>
//
// Heure : mêmes formats que !send ("20h10", "demain 20h10", "25/09 20h10").
import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { PREFIX } from '../config.js';
import { STATUS_MEDIA_DIR } from '../store.js';
import {
  TIMEZONE, nowInZone, addDaysInZone, zonedTimeToUtc, componentsInZone,
} from '../../elya-send-scheduler.js';
import { listPendingStatus, addScheduledStatus, cancelScheduledStatus } from '../../elya-status-scheduler.js';

function pad2(n) { return String(n).padStart(2, '0'); }

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
      date = zonedTimeToUtc(year + 1, month, day, hour, minute, TIMEZONE);
    } else if (!demain) {
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

function extractTexte(remainder) {
  const firstParen = remainder.indexOf('(');
  const lastParen = remainder.lastIndexOf(')');
  if (firstParen !== -1 && lastParen > firstParen) {
    return remainder.slice(firstParen + 1, lastParen).trim();
  }
  return remainder.trim();
}

const MESSAGE_KEY_BY_TYPE = { image: 'imageMessage', video: 'videoMessage' };

async function getQuotedMedia(msg) {
  const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
  const quotedMsg = quotedInfo?.quotedMessage;
  if (!quotedMsg) return null;
  for (const [type, key] of Object.entries(MESSAGE_KEY_BY_TYPE)) {
    if (quotedMsg[key]) {
      const fakeMsg = {
        key: { remoteJid: msg.key.remoteJid, id: quotedInfo.stanzaId, participant: quotedInfo.participant },
        message: quotedMsg,
      };
      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
      const mimetype = quotedMsg[key].mimetype || (type === 'image' ? 'image/jpeg' : 'video/mp4');
      return { type, buffer, mimetype };
    }
  }
  return null;
}

const USAGE =
  `💛 Utilise : ${PREFIX}programmerstatut <heure> (<texte>)\n` +
  `Ou réponds à une photo/vidéo avec ${PREFIX}programmerstatut <heure> (<légende optionnelle>)\n\n` +
  `Ex: ${PREFIX}programmerstatut 20h10 (Bonne soirée à tous 💛)\n\n` +
  `Autres commandes : ${PREFIX}programmerstatut list · ${PREFIX}programmerstatut cancel <numéro>`;

async function handleList(sock, chatId) {
  const pending = listPendingStatus();
  if (pending.length === 0) {
    await sock.sendMessage(chatId, { text: `📅 Aucun statut programmé pour l'instant.` });
    return;
  }
  const lines = pending.map((it) => {
    const apercu = it.type === 'text'
      ? (it.content.length > 50 ? it.content.slice(0, 47) + '...' : it.content)
      : `[${it.type}]${it.caption ? ' ' + it.caption : ''}`;
    return `#${it.id} — ${formatWhen(new Date(it.scheduledAt))} : ${apercu}`;
  });
  await sock.sendMessage(chatId, {
    text: `📅 *Statuts programmés (${pending.length}) :*\n\n${lines.join('\n')}\n\n_Annuler : ${PREFIX}programmerstatut cancel <numéro>_`,
  });
}

async function handleCancel(sock, chatId, arg) {
  const id = parseInt(arg, 10);
  if (!id) {
    await sock.sendMessage(chatId, { text: `💛 Utilise : ${PREFIX}programmerstatut cancel <numéro>` });
    return;
  }
  const cancelled = await cancelScheduledStatus(id);
  if (!cancelled) {
    await sock.sendMessage(chatId, { text: `💛 Aucun statut en attente avec le numéro #${id}.` });
    return;
  }
  await sock.sendMessage(chatId, { text: `🗑️ Statut #${id} annulé.` });
}

export default {
  command: 'programmerstatut',
  category: 'GENERAL',
  description: 'Programme un statut WhatsApp texte/photo/vidéo à une heure donnée (réservé au créateur)',
  ownerOnly: true,
  handler: async ({ sock, chatId, cmd, text, args, msg }) => {
    const sub = (args[1] || '').toLowerCase();
    if (sub === 'list') { await handleList(sock, chatId); return; }
    if (sub === 'cancel') { await handleCancel(sock, chatId, args[2]); return; }

    const rest = text.slice(PREFIX.length + cmd.length).replace(/^\s+/, '');
    const parsedHeure = parseHeure(rest);
    if (!parsedHeure) {
      await sock.sendMessage(chatId, { text: `💛 Heure introuvable ou invalide.\n\n${USAGE}` });
      return;
    }
    const texteZone = extractTexte(rest.slice(parsedHeure.consumed));

    const media = await getQuotedMedia(msg).catch(() => null);

    if (!media && !texteZone) {
      await sock.sendMessage(chatId, { text: `💛 Mets un texte entre parenthèses, ou réponds à une photo/vidéo.\n\n${USAGE}` });
      return;
    }

    let item;
    if (media) {
      const ext = media.type === 'image' ? '.jpg' : '.mp4';
      const fileName = `status-${Date.now()}${ext}`;
      fs.writeFileSync(path.join(STATUS_MEDIA_DIR, fileName), media.buffer);
      item = await addScheduledStatus({
        type: media.type, mediaFileName: fileName, mimetype: media.mimetype,
        caption: texteZone || null, scheduledAt: parsedHeure.date, createdBy: chatId,
      });
    } else {
      item = await addScheduledStatus({
        type: 'text', content: texteZone, scheduledAt: parsedHeure.date, createdBy: chatId,
      });
    }

    await sock.sendMessage(chatId, {
      text: `✅ Statut programmé pour ${formatWhen(parsedHeure.date)} (référence #${item.id}).`,
    });
  },
};
