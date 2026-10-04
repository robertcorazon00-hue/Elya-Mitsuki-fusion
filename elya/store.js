// elya/store.js — Tous les stores persistants d'Elya AI (mémoire, historique, stats,
// réglages de groupe, liens, IA...), extraits de server.js pour pouvoir être utilisés
// depuis les futurs plugins Elya sans dépendre de server.js.
//
// Persistance : shared/db.js (JSON par défaut, ou Mongo/Postgres/MySQL si configuré).
// Chaque store garde exactement le même nom de fichier qu'avant pour ne perdre aucune
// donnée existante en migrant (ex: memory.json, history.json...).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDoc, saveDoc } from '../shared/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) {
  return path.join(DATA_DIR, name + '.json');
}

async function loadData(name, defaultValue = {}) {
  return loadDoc(name, filePath(name), defaultValue);
}

export async function saveData(name, data) {
  await saveDoc(name, filePath(name), data);
}

// Chargement initial (top-level await ESM : tout module qui importe elya/store.js
// attend automatiquement que tous ces chargements soient terminés avant de continuer).
export const memoryStore = await loadData('memory');
export const historyStore = await loadData('history');
export const strikesStore = await loadData('strikes');
export const bannedWordsStore = await loadData('bannedWords');
export const statsStore = await loadData('stats');
export const groupSettingsStore = await loadData('groupSettings');
export const linksStore = await loadData('links'); // { links: [{url, sourceChat, sender, senderName, timestamp, title?}] }
export const linkDetectionStore = await loadData('linkDetection'); // { chatId: { enabled: bool } } - désactivé par défaut
export const linkTargetStore = await loadData('linkTarget'); // { targetChatId: '...' } - surcharge dynamique de TARGET_LINKS_GROUP
export const channelWatchStore = await loadData('channelWatch'); // { newsletterJid: { targetChatId, channelName, inviteLink } }
export const lockdownStore = await loadData('lockdown'); // { enabled: bool } - restreint toutes les commandes aux owners si activé
export const personalityStore = await loadData('personality'); // { chatId: 'prof'|'psy'|'dev'|'drole'|'mamie' }
export const introStore = await loadData('intro'); // { chatId: { enabled: bool, pending: [userId,...] } }
export const userCountsStore = await loadData('userCounts'); // { chatId: { userId: { count, name, congratulated: [...] } } }
export const translationStore = await loadData('translation'); // { chatId: { enabled: bool } }
export const antideleteStore = await loadData('antidelete'); // { chatId: { enabled: bool } }
export const voixAutoStore = await loadData('voixAuto'); // { chatId: { enabled: bool } } — !voixauto, réponses en note vocale
export const milestonesStore = await loadData('milestonesConfig'); // { chatId: { enabled: bool } }
export const aiModelStore = await loadData('aiModel'); // { chatId: 'gemini'|'groq'|'openrouter'|'gpt5'|'copilot'|'glm' }
export const aiUsageStore = await loadData('aiUsage'); // { provider: nombre d'appels }
export const autoSearchStore = await loadData('autoSearch'); // { chatId: { enabled: bool } } - activée par défaut
export const dmIntroStore = await loadData('dmIntro'); // { chatId: true } - présentation déjà envoyée en DM
export const voixGlobalStore = await loadData('voixGlobal', { enabled: false }); // { enabled: bool } — !voixtous, owner en DM : voix note à TOUT LE MONDE, partout (DM + groupes)
export const silenceStore = await loadData('silence'); // { chatId: { until: timestampMs } } — !silence [durée], coupe la conversation libre dans ce chat sans désactiver les commandes
export const reactionsStore = await loadData('reactions'); // { chatId: { enabled: bool } } — !reactions on|off, réaction emoji auto à certains messages
export const creatorIndexStore = await loadData('creatorIndex'); // { chatId: nextIndex } - rotation des noms du créateur
export const photosStore = await loadData('photos'); // { senderId: { nom: cheminFichier } } - !addp / !givp

// ─── Coffre global multi-types (!add/!give/!delete/!list) ───
// { type: { nomNormalise: { originalName, content?, filePath?, addedAt } } }
export const vaultStore = await loadData('vault');
export const VAULT_DIR = path.join(DATA_DIR, 'vault');
if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });

// Dossier où sont stockés les fichiers image de !addp (le store ci-dessus ne garde que les chemins)
export const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });

// ─── Envois programmés (!send) ───
// { nextId, items: [{ id, digits, toDisplay, message, scheduledAt, createdAt,
//   createdBy, status: 'pending'|'sent'|'failed'|'cancelled', error, sentAt? }] }
export const scheduledSendsStore = await loadData('scheduledSends');

// ─── Rappels en langage naturel ("rappelle-moi de X dans 2h") ───
// Séparé de scheduledSendsStore car ciblé sur un chatId direct (DM ou groupe),
// pas sur un numéro externe vérifié via sock.onWhatsApp — voir elya-reminders-scheduler.js.
// { nextId, items: [{ id, chatId, message, scheduledAt, createdAt, createdBy,
//   senderName, status: 'pending'|'sent'|'failed'|'cancelled', error?, sentAt? }] }
export const remindersStore = await loadData('reminders');

// ─── Mini-suivi d'humeur (!humeur + question occasionnelle du message du matin) ───
// { chatId: [{ date: 'YYYY-MM-DD', text, timestamp }] }
export const moodStore = await loadData('mood');

// ─── Message du matin automatique (!bonjour on|off) — voir elya-morning-scheduler.js ───
// { enabled, hour, minute, lastSentDate: 'YYYY-MM-DD'|null, pendingMoodCheck: timestampMs|null }
export const morningStore = await loadData('morning');

// ── Valeurs par défaut au premier démarrage ─────────────────────────────
if (!statsStore.daily) statsStore.daily = {};
if (!statsStore.totalMessages) statsStore.totalMessages = 0;
if (!statsStore.totalConversations) statsStore.totalConversations = 0;
if (!statsStore.commandsUsed) statsStore.commandsUsed = 0;

if (!Array.isArray(scheduledSendsStore.items)) scheduledSendsStore.items = [];
if (typeof scheduledSendsStore.nextId !== 'number') scheduledSendsStore.nextId = 1;

if (!Array.isArray(remindersStore.items)) remindersStore.items = [];
if (typeof remindersStore.nextId !== 'number') remindersStore.nextId = 1;

if (typeof morningStore.enabled !== 'boolean') morningStore.enabled = false;
if (typeof morningStore.hour !== 'number') morningStore.hour = 8;
if (typeof morningStore.minute !== 'number') morningStore.minute = 0;
if (!('lastSentDate' in morningStore)) morningStore.lastSentDate = null;
if (!('pendingMoodCheck' in morningStore)) morningStore.pendingMoodCheck = null;

if (!bannedWordsStore.words) {
  bannedWordsStore.words = [
    'connard', 'salope', 'pute', 'ntm', 'fdp', 'enculé', 'encule',
    'batard', 'fils de pute', 'ta gueule', 'tg', 'sale merde',
    'nique', 'niquer', 'suicide', 'me tuer', 'me tue'
  ];
  await saveData('bannedWords', bannedWordsStore);
}

// ── Helpers IA ───────────────────────────────────────────────────────────
export function isAutoSearchEnabled(chatId) {
  return !autoSearchStore[chatId] || autoSearchStore[chatId].enabled !== false;
}

export async function trackAiUsage(provider) {
  aiUsageStore[provider] = (aiUsageStore[provider] || 0) + 1;
  await saveData('aiUsage', aiUsageStore);
}

// ── Identité stylisée d'Elya ─────────────────────────────────────────────
export const BOT_STYLIZED_NAME = '𝗘𝗹𝘆𝗮 𝗣𝗿𝗶𝗺𝗲✿';
export const CREATOR_NAMES = ['𝐫𝐨𝐛𝐞𝐫𝐭ᴄᴏʀᴀᴢᴏɴ✦', '𝐫𝐨𝐛𝐞𝐫𝐭ʜᴇʀᴢ❃', 'ᴀɴɢᴇʟ𝐫𝐨𝐛𝐞𝐫𝐭•ᴅᴇᴠ✬'];

export async function nextCreatorName(chatId) {
  const idx = creatorIndexStore[chatId] || 0;
  const name = CREATOR_NAMES[idx % CREATOR_NAMES.length];
  creatorIndexStore[chatId] = idx + 1;
  await saveData('creatorIndex', creatorIndexStore);
  return name;
}

export const CREATOR_QUESTION_REGEX = /qui t'a cr[ée][ée]e?|qui est ton cr[ée]ateur|c'est qui ton cr[ée]ateur|ton cr[ée]ateur c'est qui|qui t'a fait|qui t'a con[çc]ue?|qui t'a d[ée]velopp[ée]e?/i;

// ── État en mémoire (non persisté) ────────────────────────────────────────
export const recentMsgCache = new Map(); // chatId -> Map(msgId -> {text, sender, senderName, timestamp})
export const RECENT_CACHE_LIMIT = 300;

// Alimente recentMsgCache pour un chat donné, en gardant au plus RECENT_CACHE_LIMIT
// messages (FIFO — un Map conserve l'ordre d'insertion). Utilisé par !recap.
export function logRecentMessage(chatId, msgId, sender, senderName, text) {
  if (!recentMsgCache.has(chatId)) recentMsgCache.set(chatId, new Map());
  const chatMap = recentMsgCache.get(chatId);
  chatMap.set(msgId, { sender, senderName, text, timestamp: Date.now() });
  if (chatMap.size > RECENT_CACHE_LIMIT) {
    const oldestKey = chatMap.keys().next().value;
    chatMap.delete(oldestKey);
  }
}
export const trueFalseState = {}; // chatId -> { statement, answer }
export const pendingGameOffer = {}; // chatId -> true

// ── Réglages de groupe (autoReply / transcribe) ───────────────────────────
// Note : la version "avec notification dashboard" (io.emit) vit dans elya/runtime.js,
// qui appelle ces deux-ci puis émet lui-même l'événement — voir setAutoReply/setTranscribe là-bas.
export function isAutoReplyEnabled(chatId) {
  return !!(groupSettingsStore[chatId] && groupSettingsStore[chatId].autoReply);
}
export async function setAutoReplyRaw(chatId, enabled) {
  if (!groupSettingsStore[chatId]) groupSettingsStore[chatId] = {};
  groupSettingsStore[chatId].autoReply = enabled;
  await saveData('groupSettings', groupSettingsStore);
}
export function isTranscribeEnabled(chatId) {
  return !!(groupSettingsStore[chatId] && groupSettingsStore[chatId].transcribe);
}
export async function setTranscribeRaw(chatId, enabled) {
  if (!groupSettingsStore[chatId]) groupSettingsStore[chatId] = {};
  groupSettingsStore[chatId].transcribe = enabled;
  await saveData('groupSettings', groupSettingsStore);
}

// ── Détection & gestion des liens ─────────────────────────────────────────
export const URL_REGEX = /(https?:\/\/[^\s<>"{}|\^`\[\]]+)/gi;

export const SUSPICIOUS_DOMAINS = [
  'bit.ly', 'tinyurl.com', 'short.link', 't.co',
  'fake-news.com', 'conspi.fr', 'alerte-info.net'
];
export const TRUSTED_DOMAINS = [
  'lemonde.fr', 'lefigaro.fr', 'liberation.fr', 'france24.com',
  'bbc.com', 'reuters.com', 'apnews.com', 'cnn.com',
  'youtube.com', 'youtu.be', 'github.com', 'stackoverflow.com',
  'wikipedia.org', 'medium.com', 'dev.to'
];

export function extractLinks(text) {
  const matches = text.match(URL_REGEX);
  return matches || [];
}

export function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch { return ''; }
}

export function checkLinkTrust(url) {
  const domain = getDomain(url);
  if (TRUSTED_DOMAINS.some(d => domain.includes(d))) return 'trusted';
  if (SUSPICIOUS_DOMAINS.some(d => domain.includes(d))) return 'suspicious';
  return 'unknown';
}

export function isChannelLink(url) {
  return /whatsapp\.com\/channel\//i.test(url);
}

export function getTargetLinksGroup(defaultTargetLinksGroup) {
  return linkTargetStore.targetChatId || defaultTargetLinksGroup;
}
