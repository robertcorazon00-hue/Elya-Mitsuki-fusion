// server.js — Point d'entrée de la fusion Elya + Mitsuki Kiryu-MD.
//
// Ce fichier n'existait pas dans le zip fourni. Reconstruit à partir de tous les
// indices laissés dans le reste du projet (commentaires dans providers.js, store.js,
// runtime.js, media.js, contrat API attendu par public/index.html...). Il assure :
//   1. La connexion WhatsApp (Baileys), partagée entre Mitsuki (préfixe ".") et Elya (préfixe "!")
//   2. Le moteur de conversation d'Elya (askElya) : routage multi-fournisseurs IA,
//      historique, mémoire, modération, liens, jalons
//   3. Le dashboard web (Express + Socket.io), protégé par DASHBOARD_PASSWORD
//
// C'est la pièce la plus "neuve" de toute la reconstruction : contrairement aux
// fichiers commands/ (récupérés quasi tels quels), rien ici ne provenait d'un projet
// existant. À tester et ajuster une fois déployé.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';

// ── Mitsuki (préfixe ".") ──────────────────────────────────────────────────
import { attachHandlers as attachMitsukiHandlers } from './mitsuki/handler.js';
import { getCommandStats as getMitsukiCommandStats } from './mitsuki/storage.js';

// ── Elya (préfixe "!") ──────────────────────────────────────────────────────
import { BOT_NAME, PREFIX, MAX_HISTORY, OWNER_NUMBERS, isOwner } from './elya/config.js';
import { model, genAI, generateImage, generateNanoBananaImage } from './elya/ai.js';
import { askViaProvider, getSystemPrompt, askUtility, looksLikeCode, looksLikeSearchRequest, askWithGoogleSearch } from './elya/providers.js';
import { transcribeLocally, generateTTS } from './elya/media.js';
import { trackUserMilestone } from './elya/helpers.js';
import * as elyaPlugins from './elya/pluginLoader.js';
import { findElyaCommand } from './elya-menu-data.js';
import * as runtime from './elya/runtime.js';
import {
  historyStore, memoryStore, bannedWordsStore, strikesStore, linksStore,
  groupSettingsStore, lockdownStore, dmIntroStore, introStore, translationStore,
  voixAutoStore, voixGlobalStore, silenceStore, reactionsStore,
  aiModelStore, saveData, extractLinks, isAutoReplyEnabled, isTranscribeEnabled,
  DATA_DIR, logRecentMessage, moodStore, morningStore,
} from './elya/store.js';
import { startScheduler as startSendScheduler, TIMEZONE as REMINDER_TIMEZONE } from './elya-send-scheduler.js';
import { startScheduler as startChannelScheduler } from './elya-channel-posts.js';
import { parseReminder } from './elya/reminderParser.js';
import { addReminder, startReminderScheduler } from './elya-reminders-scheduler.js';
import { startMorningScheduler } from './elya-morning-scheduler.js';
import QRCode from 'qrcode';
import { sendTelegramText, sendTelegramPhoto } from './elya/telegramNotify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────
// Config serveur (contrairement à elya/config.js et mitsuki/config.js, ce qui
// suit ne concerne QUE server.js et le dashboard — voir elya/config.js pour
// le pourquoi de cette séparation).
// ─────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
// AUTH_DIR vit sous DATA_DIR (et non à la racine) pour profiter du même disque
// persistant que le reste des données (voir le disque monté sur /app/data dans
// render.yaml) — sur Heroku (disque éphémère), la session sera perdue à chaque
// redéploiement/redémarrage du dyno, quoi qu'il arrive, sauf ajout d'une
// persistance dédiée pour les identifiants Baileys (hors-scope ici).
const AUTH_DIR = process.env.AUTH_DIR || path.join(DATA_DIR, 'auth_info');
const USE_PAIRING_CODE = (process.env.USE_PAIRING_CODE || 'true').toLowerCase() === 'true';
const PAIRING_NUMBER = process.env.PAIRING_NUMBER || '';
const TARGET_LINKS_GROUP = process.env.TARGET_LINKS_GROUP || '';

let DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;
if (!DASHBOARD_PASSWORD) {
  DASHBOARD_PASSWORD = crypto.randomBytes(6).toString('hex');
  console.error(`⚠️ DASHBOARD_PASSWORD non défini — mot de passe généré pour cette session : ${DASHBOARD_PASSWORD}`);
}

runtime.setConfig({ TARGET_LINKS_GROUP });

// ─────────────────────────────────────────────────────────────────────────
// Dashboard : Express + Socket.io
// ─────────────────────────────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer);
runtime.setIO(io);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function requireKey(req, res, next) {
  if ((req.query.key || '') !== DASHBOARD_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Mot de passe incorrect.' });
  }
  next();
}

app.get('/api/stats', requireKey, (req, res) => {
  res.json({ ...runtime.getStats(), memory: memoryStore });
});

app.get('/api/mitsuki-stats', requireKey, (req, res) => {
  res.json(getMitsukiCommandStats());
});

app.get('/api/logs', requireKey, (req, res) => {
  res.json({ logs: runtime.errorLog });
});

app.get('/api/conversations', requireKey, (req, res) => {
  const convs = Object.entries(historyStore).map(([id, msgs]) => ({
    id,
    messageCount: msgs.length,
    lastMessage: msgs.length ? (msgs[msgs.length - 1].text || '').slice(0, 200) : '',
  }));
  res.json(convs);
});

app.delete('/api/conversations/:id', requireKey, async (req, res) => {
  delete historyStore[req.params.id];
  await saveData('history', historyStore);
  res.json({ ok: true });
});

app.delete('/api/strikes/:chatId/:userId', requireKey, async (req, res) => {
  const { chatId, userId } = req.params;
  if (strikesStore[chatId]) delete strikesStore[chatId][userId];
  await saveData('strikes', strikesStore);
  res.json({ ok: true });
});

app.post('/api/banned-words', requireKey, async (req, res) => {
  const word = (req.body?.word || '').trim().toLowerCase();
  if (!word) return res.status(400).json({ ok: false, error: 'Mot manquant.' });
  if (!bannedWordsStore.words.includes(word)) bannedWordsStore.words.push(word);
  await saveData('bannedWords', bannedWordsStore);
  res.json({ ok: true });
});

app.delete('/api/banned-words/:word', requireKey, async (req, res) => {
  const word = decodeURIComponent(req.params.word).toLowerCase();
  bannedWordsStore.words = bannedWordsStore.words.filter((w) => w !== word);
  await saveData('bannedWords', bannedWordsStore);
  res.json({ ok: true });
});

app.post('/api/broadcast', requireKey, async (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ ok: false, error: 'Message manquant.' });
  const sock = runtime.getSock();
  if (!sock) return res.status(503).json({ ok: false, error: 'Bot non connecté.' });
  let sent = 0;
  for (const chatId of Object.keys(historyStore)) {
    try {
      await sock.sendMessage(chatId, { text: message });
      sent++;
    } catch (e) {
      console.error('Erreur broadcast vers', chatId, e.message);
    }
  }
  res.json({ ok: true, sent });
});

app.post('/api/group-settings/:chatId/auto-reply', requireKey, async (req, res) => {
  await runtime.setAutoReply(decodeURIComponent(req.params.chatId), !!req.body?.enabled);
  res.json({ ok: true });
});

app.post('/api/group-settings/:chatId/transcribe', requireKey, async (req, res) => {
  await runtime.setTranscribe(decodeURIComponent(req.params.chatId), !!req.body?.enabled);
  res.json({ ok: true });
});

app.post('/api/send-message/:chatId', requireKey, async (req, res) => {
  const sock = runtime.getSock();
  if (!sock) return res.json({ success: false, error: 'Bot non connecté.' });
  try {
    await sock.sendMessage(decodeURIComponent(req.params.chatId), { text: req.body?.message || '' });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

app.get('/api/scheduled-sends', requireKey, async (req, res) => {
  const { listAllSends } = await import('./elya-send-scheduler.js');
  res.json(listAllSends());
});

app.post('/api/scheduled-sends/:id/cancel', requireKey, async (req, res) => {
  const { cancelScheduledSend } = await import('./elya-send-scheduler.js');
  const cancelled = await cancelScheduledSend(parseInt(req.params.id, 10));
  res.json({ ok: !!cancelled });
});

io.on('connection', () => {
  // Rien à faire à la connexion : le dashboard s'abonne lui-même à 'statsUpdate'.
});

// ─────────────────────────────────────────────────────────────────────────
// Moteur de conversation d'Elya (askElya)
// D'après providers.js : "le moteur de conversation principal d'Elya (askElya,
// resté dans server.js)". Gère l'historique, la mémoire, et le routage entre
// Gemini (par défaut) et les autres fournisseurs (!ia <provider>).
// ─────────────────────────────────────────────────────────────────────────
async function askGeminiDirect(chatId, userName, userText, isOwner) {
  const systemPrompt = getSystemPrompt(chatId, userName, isOwner);
  const history = (historyStore[chatId] || []).slice(-MAX_HISTORY);
  const historyText = history.map((h) => `${h.role === 'user' ? userName : BOT_NAME}: ${h.text}`).join('\n');
  const prompt = `${systemPrompt}\n\n${historyText}\n${userName}: ${userText}\n${BOT_NAME}:`;
  const result = await model.generateContent(prompt);
  const text = (await result.response).text();
  return (text || '').trim();
}

async function askElya(chatId, userName, userText, isOwner = false) {
  const provider = aiModelStore[chatId] || 'gemini';
  let reply = null;

  if (provider === 'gemini') {
    // Routage automatique par intention (uniquement quand personne n'a choisi
    // un fournisseur précis via !ia) : recherche -> Google, code -> MiniMax,
    // sinon conversation normale sur Gemini avec repli Groq s'il échoue.
    if (looksLikeSearchRequest(userText)) {
      try {
        reply = await askWithGoogleSearch(chatId, userName, userText, isOwner);
      } catch (e) {
        console.error('Recherche Google échouée, repli conversation normale:', e.message);
      }
    } else if (looksLikeCode(userText)) {
      try {
        reply = await askViaProvider('minimax', chatId, userName, userText, isOwner);
      } catch (e) {
        console.error('MiniMax (code) échoué, repli Gemini:', e.message);
      }
    }
    if (!reply) {
      try {
        reply = await askGeminiDirect(chatId, userName, userText, isOwner);
      } catch (e) {
        console.error('Gemini échoué, repli Groq:', e.message);
        try { reply = await askViaProvider('groq', chatId, userName, userText, isOwner); } catch (_) { /* les deux ont échoué, message générique plus bas */ }
      }
    }
  } else if (provider === 'auto') {
    try {
      reply = await askGeminiDirect(chatId, userName, userText, isOwner);
    } catch (e) {
      console.error('Gemini (auto) échoué, repli en cascade:', e.message);
      for (const fallback of ['groq', 'openrouter', 'huggingface']) {
        try {
          reply = await askViaProvider(fallback, chatId, userName, userText, isOwner);
          if (reply) break;
        } catch (_) { /* on essaie le suivant */ }
      }
    }
  } else {
    try {
      reply = await askViaProvider(provider, chatId, userName, userText, isOwner);
    } catch (e) {
      console.error(`Fournisseur ${provider} échoué, repli Gemini:`, e.message);
    }
    if (!reply) {
      try { reply = await askGeminiDirect(chatId, userName, userText, isOwner); } catch (_) {}
    }
  }

  if (!reply) reply = "Désolée, j'ai un petit souci technique là 💛 réessaie dans un instant.";

  historyStore[chatId] = historyStore[chatId] || [];
  historyStore[chatId].push({ role: 'user', text: userText, userName, date: Date.now() });
  historyStore[chatId].push({ role: 'assistant', text: reply, date: Date.now() });
  const cap = MAX_HISTORY * 2;
  if (historyStore[chatId].length > cap) {
    const dropped = historyStore[chatId].slice(0, historyStore[chatId].length - cap);
    historyStore[chatId] = historyStore[chatId].slice(-cap);
    await summarizeAndArchive(chatId, userName, dropped).catch((e) => console.error('Erreur résumé mémoire:', e.message));
  }
  await saveData('history', historyStore);

  await maybeExtractMemory(chatId, userText);
  return reply;
}

// ── Résumé automatique par IA de l'ancien historique (remplace/complète ─────
// l'extraction par mots-clés ci-dessous) : quand des échanges sortent de la
// fenêtre d'historique active, on les fait résumer en 1-2 phrases par Gemini
// avant de les perdre, pour qu'Elya "s'habitue" vraiment à la personne sur la
// durée sans garder un historique brut qui grossirait indéfiniment.
async function summarizeAndArchive(chatId, userName, droppedMessages) {
  const convo = droppedMessages
    .map((h) => `${h.role === 'user' ? userName : BOT_NAME}: ${h.text}`)
    .join('\n');
  if (convo.trim().length < 40) return; // pas assez de matière pour un résumé utile
  const prompt = `Voici un extrait d'une conversation WhatsApp entre ${BOT_NAME} et ${userName} :\n\n${convo}\n\nRésume en 1 à 2 phrases courtes, à la 3e personne, uniquement les infos personnelles durables sur ${userName} (goûts, situation, projets, relations, humeur générale...) qui mériteraient d'être retenues plus tard. Si rien de notable, réponds juste "RIEN". Ne mentionne rien d'autre.`;

  let summary = null;
  try {
    const result = await model.generateContent(prompt);
    summary = ((await result.response).text() || '').trim();
  } catch (e) {
    console.error('Gemini indisponible pour le résumé mémoire, repli Groq/OpenRouter:', e.message);
    summary = (await askUtility(prompt).catch(() => null))?.trim() || null;
  }
  if (!summary || /^rien\.?$/i.test(summary)) return;
  memoryStore[chatId] = memoryStore[chatId] || [];
  memoryStore[chatId].push({ text: summary, date: Date.now(), fromSummary: true });
  if (memoryStore[chatId].length > 80) memoryStore[chatId] = memoryStore[chatId].slice(-80);
  await saveData('memory', memoryStore);
}

// ── Extraction de mémoire (heuristique) ──────────────────────────────────
// Complète le résumé IA ci-dessus : capture immédiatement certains signaux
// clairs (mots-clés) sans attendre que l'historique déborde.
const MEMORY_CUES = [
  "j'aime", "j'adore", 'je déteste', 'je deteste', 'je préfère', 'je prefere',
  'mon anniversaire', "j'habite", 'je travaille', 'je m\'appelle', 'ma passion',
  'mon copain', 'ma copine', 'mon mari', 'ma femme', 'mon petit ami', 'ma petite amie',
  'mon frère', 'ma sœur', 'ma soeur', 'mes parents', 'mon père', 'ma mère',
  'je suis en couple', 'je suis célibataire', 'je fais des études', "j'étudie",
  'mon métier', 'mon rêve', 'mon objectif', 'ma peur', 'mon problème', 'je stresse',
];
async function maybeExtractMemory(chatId, userText) {
  const lower = userText.toLowerCase();
  if (!MEMORY_CUES.some((cue) => lower.includes(cue))) return;
  if (userText.length > 300) return; // évite de mémoriser de longs pavés
  memoryStore[chatId] = memoryStore[chatId] || [];
  memoryStore[chatId].push({ text: userText, date: Date.now() });
  if (memoryStore[chatId].length > 80) memoryStore[chatId] = memoryStore[chatId].slice(-80);
  await saveData('memory', memoryStore);
}

// ── Analyse d'image / PDF (envoi automatique, sans commande) ─────────────
async function analyzeMedia(buffer, mimeType, caption) {
  const prompt = caption?.trim()
    ? caption
    : "Décris et commente ce document en 2 à 4 phrases, avec ton ton chaleureux habituel.";
  const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const response = await genAI.models.generateContent({
    model: modelName,
    contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType, data: buffer.toString('base64') } }] }],
  });
  return (response.text || '').trim() || "Je n'ai pas réussi à analyser ce fichier, désolée 💛";
}

// ── Transcription vocale (local d'abord, AssemblyAI en repli) ────────────
async function transcribeVoiceMessage(buffer) {
  try {
    return await transcribeLocally(buffer);
  } catch (_) {
    // Service vocal local indisponible — repli sur AssemblyAI si une clé est fournie.
  }
  const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
  if (!ASSEMBLYAI_API_KEY) throw new Error('Aucun service de transcription disponible.');

  const axios = (await import('axios')).default;
  const uploadRes = await axios.post('https://api.assemblyai.com/v2/upload', buffer, {
    headers: { authorization: ASSEMBLYAI_API_KEY, 'content-type': 'application/octet-stream' },
  });
  const transcriptRes = await axios.post(
    'https://api.assemblyai.com/v2/transcript',
    { audio_url: uploadRes.data.upload_url, language_code: 'fr' },
    { headers: { authorization: ASSEMBLYAI_API_KEY } }
  );
  const id = transcriptRes.data.id;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await axios.get(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: ASSEMBLYAI_API_KEY },
    });
    if (poll.data.status === 'completed') return poll.data.text || '';
    if (poll.data.status === 'error') throw new Error(poll.data.error);
  }
  throw new Error('Timeout de transcription.');
}

// ─────────────────────────────────────────────────────────────────────────
// Boucle de messages d'Elya (préfixe "!" + conversation libre). Écoute
// indépendante de celle de Mitsuki (mitsuki/handler.js) — les deux tournent
// en parallèle sur le même socket, voir le commentaire dans handler.js.
// ─────────────────────────────────────────────────────────────────────────
function attachElyaListener(sock) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.remoteJid === 'status@broadcast') return;

    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const sender = msg.key.participant || chatId;
    const senderName = msg.pushName || sender.split('@')[0];
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.documentMessage?.caption ||
      msg.message.videoMessage?.caption ||
      '';

    try {
      // ── Lockdown : ne traite plus rien côté Elya sauf les owners ──
      if (lockdownStore.enabled && !isOwner(sender) && !msg.key.fromMe) return;

      // ── Journal court du groupe (!recap) : tout message texte non-commande ──
      if (isGroup && text && !text.startsWith(PREFIX) && !text.startsWith('.')) {
        logRecentMessage(chatId, msg.key.id, sender, senderName, text);
      }

      // ── Commandes "!" (autorisées même fromMe, cf. mitsuki/handler.js) ──
      if (text.startsWith(PREFIX)) {
        // args[0] = la commande elle-même, args[1] = 1er argument réel — c'est la
        // convention utilisée par TOUS les plugins Elya (ex: "const sub = args[1]").
        // ⚠️ Avant ce correctif, args excluait la commande (args[0] = 1er argument),
        // ce qui rendait args[1] toujours undefined : !antidelete on, !ia groq,
        // !logs 20, !personnalite prof, !voixtous on, !silence 10, etc. ne
        // recevaient jamais leur argument. Ne pas revenir à l'ancienne forme.
        const args = text.slice(PREFIX.length).trim().split(/\s+/);
        const cmd = (args[0] || '').toLowerCase();
        await runtime.recordMessage(chatId, true);
        const handled = await elyaPlugins.dispatch(cmd, {
          sock, msg, chatId, sender, senderName, isGroup,
          isOwner: isOwner(sender) || msg.key.fromMe,
          cmd, args, text,
        });
        if (!handled) {
          const crossMitsuki = cmd === 'menu' ? null : null; // menu existe des deux côtés, pas de conflit à signaler
          if (!crossMitsuki) {
            await sock.sendMessage(chatId, { text: `💡 Commande "!${cmd}" introuvable. Tape !menu pour voir la liste.` }).catch(() => {});
          }
        }
        return;
      }

      if (msg.key.fromMe) return; // pas de conversation avec soi-même
      if (text.startsWith('.')) return; // laisse ça à Mitsuki

      // ── Modération : mots bannis ──
      if (text) {
        const mod = await runtime.checkModeration(text, sender, chatId);
        if (mod.strike) {
          await sock.sendMessage(chatId, {
            text: `⚠️ @${sender.split('@')[0]}, merci de rester respectueux ici. (avertissement ${mod.count}/3)`,
            mentions: [sender],
          }).catch(() => {});
        }
      }

      // ── Détection & suivi de liens ──
      const links = extractLinks(text);
      if (links.length) {
        for (const url of links) {
          await runtime.saveAndForwardLink(url, chatId, sender, senderName, sock, text);
        }
      }

      // ── Jalons (nombre de messages d'un utilisateur) ──
      if (isGroup) await trackUserMilestone(chatId, sender, senderName).catch(() => {});

      // ── Décide si Elya doit répondre dans ce chat ──
      if (isGroup) {
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const botNumber = sock.user?.id?.split(':')[0];
        const mentioned = mentionedJid.some((j) => j.split('@')[0] === botNumber);
        if (!isAutoReplyEnabled(chatId) && !mentioned) return;
      }

      // ── Silence temporaire actif (!silence) : coupe la conversation, pas les commandes ──
      if (silenceStore[chatId]?.until && silenceStore[chatId].until > Date.now()) return;

      // ── Réaction emoji automatique (présence plus vivante, ~1 message sur 4) ──
      if (reactionsStore[chatId]?.enabled && Math.random() < 0.25) {
        const emojis = ['💛', '😄', '👍', '✨', '🙌', '😂', '🔥'];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        await sock.sendMessage(chatId, { react: { text: emoji, key: msg.key } }).catch(() => {});
      }

      await runtime.recordMessage(chatId, false);

      // ── Présentation automatique en DM (une seule fois) ──
      if (!isGroup && !dmIntroStore[chatId]) {
        dmIntroStore[chatId] = true;
        await saveData('dmIntro', dmIntroStore);
        await sock.sendMessage(chatId, {
          text: `*Salut* ${senderName} !\n*𝗘𝗹𝘆𝗮✿* ici 💛, comment puis-je vous aider ?`,
        }).catch(() => {});
      }

      // ── Image / PDF envoyés sans commande : analyse automatique ──
      const isImage = !!msg.message.imageMessage;
      const isPdf = msg.message.documentMessage?.mimetype === 'application/pdf';
      if (isImage || isPdf) {
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        const mimeType = isImage ? (msg.message.imageMessage.mimetype || 'image/jpeg') : 'application/pdf';
        await sock.sendPresenceUpdate('composing', chatId).catch(() => {});
        const analysis = await analyzeMedia(buffer, mimeType, text);
        await sock.sendMessage(chatId, { text: analysis });
        await runtime.recordImage();
        return;
      }

      // ── Message vocal : transcription (DM toujours, groupe si activé) ──
      if (msg.message.audioMessage) {
        if (isGroup && !isTranscribeEnabled(chatId)) return;
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          const transcription = await transcribeVoiceMessage(buffer);
          if (!transcription) return;
          await sock.sendMessage(chatId, { text: `🎙️ _"${transcription}"_` });
          const reply = await askElya(chatId, senderName, transcription, isOwner(sender) || msg.key.fromMe);
          const wantsVoiceReply = voixGlobalStore.enabled || !!voixAutoStore[chatId]?.enabled;
          if (wantsVoiceReply) {
            try {
              await sock.sendPresenceUpdate('recording', chatId).catch(() => {});
              const audioBuffer = await generateTTS(reply, 'fr');
              await sock.sendMessage(chatId, { audio: audioBuffer, mimetype: 'audio/mpeg', ptt: true });
            } catch (e2) {
              console.error('Erreur TTS réponse (vocal reçu):', e2.message);
              await sock.sendMessage(chatId, { text: reply });
            }
          } else {
            await sock.sendMessage(chatId, { text: reply });
          }
        } catch (e) {
          console.error('Erreur transcription vocale:', e.message);
        }
        return;
      }

      // ── Rappel en langage naturel ("rappelle-moi de X dans 2h") ──
      const reminder = parseReminder(text);
      if (reminder) {
        if (reminder.needsTime) {
          await sock.sendMessage(chatId, { text: `💛 D'accord, mais à quel moment ? (ex : "dans 2h" ou "à 18h")` });
          return;
        }
        if (reminder.needsContent) {
          await sock.sendMessage(chatId, { text: `💛 De quoi tu veux que je te rappelle ?` });
          return;
        }
        const item = await addReminder({
          chatId, message: reminder.content, scheduledAt: reminder.scheduledAt,
          createdBy: sender, senderName,
        });
        const when = reminder.scheduledAt.toLocaleString('fr-FR', {
          timeZone: REMINDER_TIMEZONE, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        await sock.sendMessage(chatId, { text: `✅ C'est noté, je te rappelle ça le ${when} (référence #${item.id}).` });
        return;
      }

      // ── Suivi d'humeur : capture la réponse si on avait posé la question ce matin ──
      if (!isGroup && isOwner(sender) && morningStore.pendingMoodCheck
          && Date.now() - morningStore.pendingMoodCheck < 12 * 3600000 && text) {
        if (!moodStore[chatId]) moodStore[chatId] = [];
        moodStore[chatId].push({ date: new Date().toISOString().slice(0, 10), text, timestamp: Date.now() });
        await saveData('mood', moodStore);
        morningStore.pendingMoodCheck = null;
        await saveData('morning', morningStore);
        // Pas de "return" ici : la conversation continue normalement juste après.
      }

      // ── Conversation libre ──
      if (!text) return;
      await sock.sendPresenceUpdate('composing', chatId).catch(() => {});
      const reply = await askElya(chatId, senderName, text, isOwner(sender) || msg.key.fromMe);

      // ── Mode vocal : global (!voixtous, tous les chats) ou local (!voixauto, ce chat) ──
      const wantsVoice = voixGlobalStore.enabled || !!voixAutoStore[chatId]?.enabled;
      if (wantsVoice) {
        try {
          await sock.sendPresenceUpdate('recording', chatId).catch(() => {});
          const audioBuffer = await generateTTS(reply, 'fr');
          await sock.sendMessage(chatId, { audio: audioBuffer, mimetype: 'audio/mpeg', ptt: true });
        } catch (e) {
          console.error('Erreur TTS réponse auto:', e.message);
          await sock.sendMessage(chatId, { text: reply }); // repli texte si la synthèse vocale échoue
        }
        return;
      }

      // ── Traduction automatique FR<->EN si activée ──
      if (translationStore[chatId]?.enabled) {
        // Traduction confiée au même modèle conversationnel pour rester simple ;
        // reste optionnel (désactivé par défaut).
        try {
          const translated = await askGeminiDirect(chatId, senderName, `Traduis ce texte en anglais, réponds uniquement avec la traduction : "${reply}"`);
          await sock.sendMessage(chatId, { text: `${reply}\n\n🌐 ${translated}` });
        } catch (_) {
          await sock.sendMessage(chatId, { text: reply });
        }
      } else {
        await sock.sendMessage(chatId, { text: reply });
      }
    } catch (err) {
      console.error('Erreur boucle Elya:', err.message);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Connexion WhatsApp (Baileys) — instance unique partagée par Mitsuki et Elya
// ─────────────────────────────────────────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`🌸 Version WA utilisée : ${version.join('.')} (latest: ${isLatest})`);

  const sock = makeWASocket({
    auth: state,
    version,
    browser: Browsers.macOS('Desktop'),
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 15_000,
  });

  runtime.setSock(sock);
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      io.emit('qr', qr);
      if (!USE_PAIRING_CODE) console.log('🌸 QR reçu (scanne-le depuis WhatsApp > Appareils liés) :', qr);
      QRCode.toBuffer(qr, { width: 400 })
        .then((buffer) => sendTelegramPhoto(buffer, '🌸 Scanne ce QR avec WhatsApp > Appareils liés pour connecter Elya Prime.'))
        .catch((e) => console.error('Erreur génération QR pour Telegram:', e.message));
    }
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('🌸 Connexion perdue, nouvelle tentative dans 5s...');
        setTimeout(startBot, 5000);
      } else {
        console.log('🌸 Déconnecté (logged out). Supprime le dossier auth_info et relance.');
        sendTelegramText('🔴 Elya Prime déconnectée de WhatsApp (logged out). Reconnexion manuelle nécessaire.');
      }
    } else if (connection === 'open') {
      console.log(`🌸 ${BOT_NAME} & Mitsuki Kiryu-MD connectés sur le même socket !`);
      sendTelegramText('🟢 Elya Prime est connectée à WhatsApp et prête !');
    }
  });

  if (!state.creds.registered) {
    if (USE_PAIRING_CODE && PAIRING_NUMBER) {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(PAIRING_NUMBER);
          console.log(`\n🌸 Ton pairing code : ${code}\n`);
          console.log('👉 WhatsApp > Paramètres > Appareils liés > Lier avec le numéro de téléphone\n');
          await sendTelegramText(`🌸 <b>Ton pairing code : ${code}</b>\n\n👉 WhatsApp > Paramètres > Appareils liés > Lier avec le numéro de téléphone`);
        } catch (e) {
          console.error('Erreur génération pairing code:', e.message);
        }
      }, 3000);
    } else {
      console.log('🌸 Aucun PAIRING_NUMBER fourni — scanne le QR code affiché ci-dessus (ou dans les logs) avec WhatsApp.');
    }
  }

  attachMitsukiHandlers(sock);
  attachElyaListener(sock);
  startSendScheduler(sock);
  startChannelScheduler(sock);
  startReminderScheduler(sock);
  startMorningScheduler(sock);

  return sock;
}

httpServer.listen(PORT, () => {
  console.log(`🌸 Dashboard disponible sur le port ${PORT}`);
});

startBot();
