// storage.js — Stockage persistant pour les réglages (JSON par défaut, ou
// Mongo/Postgres/MySQL si configuré — voir shared/db.js).
// Utilisé par : antilink, antispam, autoreact, ban/unban, block/unblock, mode, etc.
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDoc, saveDoc } from '../shared/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data', 'db.json'); // uniquement utilisé par le backend JSON

const DEFAULT_GROUP_SETTINGS = {
  antilink: false,
  antispam: false,
  antibot: false,
  antiedit: false,
  antidelete: false,
  antihidetag: false,
  autoreact: false,
  autoread: false,
  autosave: false,
  autoreply: false,
  locked: false, // .lock / .unlock
  warns: {}, // { "<jid>": <count> } — pour antihidetag/antilink etc.
};

const DEFAULT_USER_SETTINGS = {
  blocked: false,
  banned: false,
};

const DEFAULT_DB = {
  groups: {},
  users: {},
  bot: {
    name: null,
    mode: 'public',
    autoreply: {
      enabled: false,
      dm: true,
      groupMention: true,
      message: "• Je suis indisponible pour le moment, je reviens vite !",
      cooldowns: {},
    },
  },
};

// Chargé une seule fois au démarrage (top-level await ESM : tout module qui importe
// storage.js attend automatiquement que ce chargement soit terminé avant de continuer).
let cache = await loadDoc('mitsuki', DB_PATH, DEFAULT_DB);

function load() {
  return cache;
}

async function save() {
  await saveDoc('mitsuki', DB_PATH, cache);
}

// ── Réglages de groupe ────────────────────────────────────
function getGroupSettings(groupJid) {
  const db = load();
  if (!db.groups[groupJid]) {
    db.groups[groupJid] = { ...DEFAULT_GROUP_SETTINGS };
    save();
  }
  return db.groups[groupJid];
}

function setGroupSetting(groupJid, key, value) {
  const db = load();
  getGroupSettings(groupJid); // s'assure que le groupe existe
  db.groups[groupJid][key] = value;
  save();
  return db.groups[groupJid];
}

// ── Réglages utilisateur ──────────────────────────────────
function getUserSettings(userJid) {
  const db = load();
  if (!db.users[userJid]) {
    db.users[userJid] = { ...DEFAULT_USER_SETTINGS };
    save();
  }
  return db.users[userJid];
}

function setUserSetting(userJid, key, value) {
  const db = load();
  getUserSettings(userJid);
  db.users[userJid][key] = value;
  save();
  return db.users[userJid];
}

function isBanned(userJid) {
  return getUserSettings(userJid).banned === true;
}

// ── Réglages globaux du bot (mode public/prive, nom, autoreply) ──
function getBotSettings() {
  const db = load();
  if (!db.bot.autoreply) {
    db.bot.autoreply = {
      enabled: false,
      dm: true,
      groupMention: true,
      message: "• Je suis indisponible pour le moment, je reviens vite !",
      cooldowns: {},
    };
    save();
  }
  return db.bot;
}

function setBotSetting(key, value) {
  const db = load();
  db.bot[key] = value;
  save();
  return db.bot;
}

// ── Warns (avertissements) — utilisé par antihidetag, antilink, etc. ──────
function addWarn(groupJid, userJid, reason = '') {
  const settings = getGroupSettings(groupJid);
  if (typeof settings.warns[userJid] === 'number') {
    // Ancien format (juste un nombre) -> on migre vers { count, reasons }
    settings.warns[userJid] = { count: settings.warns[userJid], reasons: [] };
  }
  if (!settings.warns[userJid]) settings.warns[userJid] = { count: 0, reasons: [] };
  settings.warns[userJid].count++;
  settings.warns[userJid].reasons.push({ reason, date: Date.now() });
  save();
  return settings.warns[userJid].count;
}

function getWarns(groupJid, userJid) {
  const w = getGroupSettings(groupJid).warns[userJid];
  return typeof w === 'number' ? w : w?.count || 0;
}

function resetWarns(groupJid, userJid) {
  const settings = getGroupSettings(groupJid);
  delete settings.warns[userJid];
  save();
}

// ── Stats commandes (pour le dashboard) ───────────────────
function trackCommand(cmd) {
  const db = load();
  db.bot.commandStats = db.bot.commandStats || { total: 0, byCommand: {} };
  db.bot.commandStats.total += 1;
  db.bot.commandStats.byCommand[cmd] = (db.bot.commandStats.byCommand[cmd] || 0) + 1;
  save();
}

function getCommandStats() {
  const db = load();
  return db.bot.commandStats || { total: 0, byCommand: {} };
}

// ── Compteur cyclique (pour .love / .love2 : 1,2,3...10 puis retour à 1) ──
function getNextCycleIndex(name, max) {
  const db = load();
  db.bot.cycles = db.bot.cycles || {};
  const current = db.bot.cycles[name] || 0; // 0-based en interne
  const next = (current + 1) % max;
  db.bot.cycles[name] = next;
  save();
  return current; // renvoie l'index utilisé pour CET appel (0 à max-1)
}

export {
  getGroupSettings,
  setGroupSetting,
  getUserSettings,
  setUserSetting,
  isBanned,
  getBotSettings,
  setBotSetting,
  addWarn,
  getWarns,
  resetWarns,
  trackCommand,
  getCommandStats,
  getNextCycleIndex,
};
