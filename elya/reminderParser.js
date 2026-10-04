// elya/reminderParser.js — Détecte une demande de rappel en langage naturel
// ("rappelle-moi de X dans 2h", "rappelle-moi X à 18h", "tu peux me rappeler
// de X demain à 10h"...) dans un message libre, et calcule la date cible.
//
// Best-effort par regex, pas un vrai NLU : couvre les tournures les plus
// courantes en français parlé/texté, pas toutes les formulations possibles.
// Pour un cas plus complexe (récurrence, destinataire différent...), !send
// reste disponible avec sa syntaxe explicite.
//
// Réutilise les helpers de fuseau horaire d'elya-send-scheduler.js (même
// logique que elya/plugins/send.js pour !send).

import { TIMEZONE, nowInZone, addDaysInZone, zonedTimeToUtc } from '../elya-send-scheduler.js';

const TRIGGER_REGEX = /rappell[e]?[\s-]*moi\b|tu peux me rappeler\b|n['’]oublie pas de me (?:rappeler|dire)\b/i;

const NUM_WORDS = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, dix: 10, quinze: 15, vingt: 20, trente: 30 };
const NUM_ALTERNATION = ['\\d+', ...Object.keys(NUM_WORDS)].join('|');

function wordOrDigitToNumber(tok) {
  if (/^\d+$/.test(tok)) return parseInt(tok, 10);
  return NUM_WORDS[tok.toLowerCase()] ?? null;
}

function parseRelativeDelay(text) {
  // "dans 1h30" (heures + minutes collées)
  let m = text.match(/dans\s+(\d{1,2})\s*h\s*(\d{1,2})\b/i);
  if (m) {
    const minutes = parseInt(m[2], 10);
    if (minutes <= 59) {
      return { ms: (parseInt(m[1], 10) * 60 + minutes) * 60000, matched: m[0] };
    }
  }

  m = text.match(new RegExp(`dans\\s+(${NUM_ALTERNATION})\\s*(heures?|h)\\b`, 'i'));
  if (m) {
    const n = wordOrDigitToNumber(m[1]);
    if (n) return { ms: n * 3600000, matched: m[0] };
  }

  m = text.match(new RegExp(`dans\\s+(${NUM_ALTERNATION})\\s*(minutes?|min)\\b`, 'i'));
  if (m) {
    const n = wordOrDigitToNumber(m[1]);
    if (n) return { ms: n * 60000, matched: m[0] };
  }

  m = text.match(new RegExp(`dans\\s+(${NUM_ALTERNATION})\\s*(jours?)\\b`, 'i'));
  if (m) {
    const n = wordOrDigitToNumber(m[1]);
    if (n) return { ms: n * 86400000, matched: m[0] };
  }

  return null;
}

function parseAbsoluteTime(text) {
  let m = text.match(/demain\s*(?:à\s*)?(\d{1,2})[:h](\d{1,2})?/i);
  const tomorrow = !!m;
  if (!m) m = text.match(/à\s+(\d{1,2})[:h](\d{1,2})?\b/i);
  if (!m) return null;

  const hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  if (hour > 23 || minute > 59) return null;

  const now = nowInZone(TIMEZONE);
  let { year, month, day } = now;
  if (tomorrow) ({ year, month, day } = addDaysInZone(now.year, now.month, now.day, 1, TIMEZONE));

  let date = zonedTimeToUtc(year, month, day, hour, minute, TIMEZONE);
  if (!tomorrow && date <= new Date()) {
    const t = addDaysInZone(now.year, now.month, now.day, 1, TIMEZONE);
    date = zonedTimeToUtc(t.year, t.month, t.day, hour, minute, TIMEZONE);
  }

  return { date, matched: m[0] };
}

// Retourne :
//  - null                                 → pas un rappel, laisse passer la conversation normale
//  - { needsTime: true }                  → "rappelle-moi" détecté mais aucune heure/durée trouvée
//  - { needsContent: true, scheduledAt }  → heure trouvée mais rien à rappeler
//  - { scheduledAt, content }             → rappel complet, prêt à programmer
export function parseReminder(text) {
  if (!text || !TRIGGER_REGEX.test(text)) return null;

  const relative = parseRelativeDelay(text);
  const absolute = relative ? null : parseAbsoluteTime(text);
  if (!relative && !absolute) return { needsTime: true };

  const scheduledAt = relative ? new Date(Date.now() + relative.ms) : absolute.date;
  const matchedTimeStr = relative ? relative.matched : absolute.matched;

  let content = text.replace(TRIGGER_REGEX, '').replace(matchedTimeStr, '');
  content = content
    .replace(/^[\s,]*(?:d['’]|de\b|que\b|pour\b|à\b|a\b)\s*/i, '')
    .replace(/[\s,]*(?:de|que|pour)\s*$/i, '')
    .trim();

  if (!content) return { needsContent: true, scheduledAt };
  return { scheduledAt, content };
}
