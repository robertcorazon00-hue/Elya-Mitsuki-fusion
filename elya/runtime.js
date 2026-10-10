// elya/runtime.js — Détient les références partagées (io, sock, config) que server.js
// initialise au démarrage, et les fonctions qui en dépendent (stats, notifications
// dashboard en temps réel). Séparé de store.js pour que store.js reste indépendant
// de tout ce qui touche Baileys/socket.io (testable seul, sans faux sock/io).
import * as store from './store.js';

let io = null;
let sock = null;
let config = {}; // { TARGET_LINKS_GROUP } — passé par server.js via setConfig()

export function setIO(instance) { io = instance; }
export function setSock(instance) { sock = instance; }
export function setConfig(cfg) { config = { ...config, ...cfg }; }
export function getIO() { return io; }
export function getSock() { return sock; }

// ─── Journal des dernières erreurs (pour !logs) ───
export const errorLog = [];
const originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  originalConsoleError(...args);
  errorLog.push({ time: new Date().toISOString(), message: args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ') });
  if (errorLog.length > 50) errorLog.shift();
};

function emitStats() {
  if (io) io.emit('statsUpdate', getStats());
}

export function getStats() {
  const convs = Object.keys(store.historyStore).length;
  const totalMsg = store.statsStore.totalMessages;
  const totalCmd = store.statsStore.commandsUsed;
  const daily = store.statsStore.daily;
  const strikes = store.strikesStore;
  const memories = Object.values(store.memoryStore).reduce((a, b) => a + b.length, 0);
  const banned = store.bannedWordsStore.words.length;

  const userCounts = {};
  Object.entries(store.historyStore).forEach(([chatId, msgs]) => {
    msgs.forEach(m => {
      if (m.role === 'user' && m.userName) {
        userCounts[m.userName] = (userCounts[m.userName] || 0) + 1;
      }
    });
  });
  const topUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    last7.push({ date: ds, ...daily[ds] });
  }

  const allChatIds = new Set([
    ...Object.keys(store.groupSettingsStore),
    ...Object.keys(store.aiModelStore),
    ...Object.keys(store.antideleteStore),
    ...Object.keys(store.introStore),
    ...Object.keys(store.milestonesStore),
    ...Object.keys(store.translationStore),
    ...Object.keys(store.personalityStore),
    ...Object.keys(store.historyStore).filter(id => id.endsWith('@g.us'))
  ]);
  const groupSettings = {};
  allChatIds.forEach(gid => {
    groupSettings[gid] = {
      autoReply: !!(store.groupSettingsStore[gid] && store.groupSettingsStore[gid].autoReply),
      transcribe: !!(store.groupSettingsStore[gid] && store.groupSettingsStore[gid].transcribe),
      aiModel: store.aiModelStore[gid] || 'gemini',
      antidelete: !!(store.antideleteStore[gid] && store.antideleteStore[gid].enabled),
      presentation: !!(store.introStore[gid] && store.introStore[gid].enabled),
      milestones: !!(store.milestonesStore[gid] && store.milestonesStore[gid].enabled),
      translation: !!(store.translationStore[gid] && store.translationStore[gid].enabled),
      personality: store.personalityStore[gid] || 'normale'
    };
  });

  let totalMilestonesHit = 0;
  Object.values(store.userCountsStore).forEach(chatUsers => {
    Object.values(chatUsers).forEach(u => {
      totalMilestonesHit += (u.congratulated || []).length;
    });
  });

  return {
    totalMessages: totalMsg,
    totalConversations: convs,
    totalCommands: totalCmd,
    totalImages: Object.values(daily).reduce((a, b) => a + (b.images || 0), 0),
    totalMemories: memories,
    totalBannedWords: banned,
    activeToday: daily[new Date().toISOString().slice(0, 10)]?.messages || 0,
    topUsers,
    last7Days: last7,
    strikes,
    bannedWords: store.bannedWordsStore.words,
    groupSettings,
    linksCount: (store.linksStore.links || []).length,
    recentLinks: (store.linksStore.links || []).slice(-20).reverse(),
    botStatus: sock ? (sock.user ? 'connected' : 'connecting') : 'disconnected',
    botNumber: sock?.user?.id?.split(':')[0] || 'Non connecté',
    aiUsage: store.aiUsageStore,
    totalMilestonesHit
  };
}

export async function recordMessage(chatId, isCommand = false) {
  store.statsStore.totalMessages++;
  if (isCommand) store.statsStore.commandsUsed++;
  const today = new Date().toISOString().slice(0, 10);
  if (!store.statsStore.daily[today]) store.statsStore.daily[today] = { messages: 0, commands: 0, images: 0 };
  store.statsStore.daily[today].messages++;
  if (isCommand) store.statsStore.daily[today].commands++;
  await store.saveData('stats', store.statsStore);
  emitStats();
}

export async function recordImage() {
  const today = new Date().toISOString().slice(0, 10);
  if (!store.statsStore.daily[today]) store.statsStore.daily[today] = { messages: 0, commands: 0, images: 0 };
  store.statsStore.daily[today].images++;
  await store.saveData('stats', store.statsStore);
  emitStats();
}

export async function setAutoReply(chatId, enabled) {
  await store.setAutoReplyRaw(chatId, enabled);
  emitStats();
}

export async function setTranscribe(chatId, enabled) {
  await store.setTranscribeRaw(chatId, enabled);
  emitStats();
}

// ─── Avertissement générique (incrémente le même compteur que les mots
// bannis — visible via !strikes) : utilisé aussi par l'anti-flood. ───
export async function addStrike(userId, chatId) {
  if (!store.strikesStore[chatId]) store.strikesStore[chatId] = {};
  if (!store.strikesStore[chatId][userId]) store.strikesStore[chatId][userId] = 0;

  store.strikesStore[chatId][userId]++;
  await store.saveData('strikes', store.strikesStore);
  emitStats();

  return store.strikesStore[chatId][userId];
}

// ─── Modération : mots bannis -> strikes ───
export async function checkModeration(text, userId, chatId) {
  const lower = text.toLowerCase();
  const words = store.bannedWordsStore.words || [];
  let triggered = false;

  for (const word of words) {
    if (lower.includes(word.toLowerCase())) {
      triggered = true;
      break;
    }
  }

  if (!triggered) return { strike: false, count: 0 };

  const count = await addStrike(userId, chatId);
  return { strike: true, count };
}

export async function saveAndForwardLink(url, sourceChat, sender, senderName, sockForForward, messageText) {
  if (!store.linksStore.links) store.linksStore.links = [];

  const recent = store.linksStore.links.slice(-30);
  if (recent.some(l => l.url === url)) return null;

  const entry = {
    id: 'link_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    url,
    sourceChat,
    sender,
    senderName,
    timestamp: Date.now(),
    trust: store.checkLinkTrust(url),
    isChannel: store.isChannelLink(url),
    context: (messageText || '').slice(0, 500)
  };

  store.linksStore.links.push(entry);
  if (store.linksStore.links.length > 500) store.linksStore.links = store.linksStore.links.slice(-500);
  await store.saveData('links', store.linksStore);
  emitStats();

  const targetGroup = store.getTargetLinksGroup(config.TARGET_LINKS_GROUP);
  if (targetGroup && sockForForward && sockForForward.user && sourceChat !== targetGroup && !sourceChat.endsWith('@newsletter')) {
    try {
      const typeEmoji = entry.isChannel ? '📢' : (entry.trust === 'trusted' ? '✅' : entry.trust === 'suspicious' ? '⚠️' : '🔗');
      const sourceName = sourceChat.endsWith('@g.us') ? 'un groupe' : 'une conversation';
      await sockForForward.sendMessage(targetGroup, {
        text: `${typeEmoji} *${entry.isChannel ? 'Lien de chaîne détecté' : 'Nouveau lien détecté'}*\n\n` +
              `📎 ${url}\n\n` +
              (entry.context ? `💬 Message : "${entry.context}"\n\n` : '') +
              `👤 Partagé par : ${senderName}\n` +
              `📍 Source : ${sourceName}\n` +
              `🕐 ${new Date().toLocaleString('fr-FR')}\n\n` +
              `${entry.trust === 'suspicious' ? '⚠️ *Source potentiellement douteuse*' : ''}`
      });
    } catch (e) {
      console.error('Erreur forward lien:', e.message);
    }
  }

  return entry;
}
