// elya/plugins/tools-extra.js — Quelques endpoints du pack davidcyriltech côté
// Elya : génération d'image (en plus de !image/!nanobanana), voix Google, et
// deux IA ponctuelles (Kimi, Nova).
//
// Schéma confirmé par 5 exemples curl fournis avec la clé (blackbox,
// gemini-3-pro, gpt-5.5, llama-3.3-70b-instruct, anonymous/chat) : GET, header
// X-API-Key, un seul domaine (apis.davidcyriltech.my.id) pour tout le pack y
// compris /ai/*, paramètre ?prompt= (ou ?q= pour blackbox). Corrigé ici :
// kimi/nova/writecream étaient en POST+JSON sur un second domaine (name.ng),
// déduit à tort d'un seul exemple (deepseek-v3) qui ne représente pas le
// schéma réel de ce pack.
import axios from 'axios';
import { PREFIX } from '../config.js';
import { recordImage } from '../runtime.js';
import { stripReasoningTags } from '../providers.js';

const DCT_BASE = 'https://apis.davidcyriltech.my.id';
const DCT_KEY = process.env.DAVIDCYRIL_API_KEY || '';
const DCT_HEADERS = DCT_KEY ? { 'X-API-Key': DCT_KEY } : {};

function friendlyError(err) {
  if (err.response?.status === 401) {
    return new Error('cette fonctionnalité demande une clé API (DAVIDCYRIL_API_KEY non configurée ou invalide)');
  }
  return new Error(err.response?.data?.message || err.message || 'service indisponible, réessaie plus tard');
}

async function dctGet(path, params) {
  try {
    const { data } = await axios.get(`${DCT_BASE}${path}`, {
      params,
      headers: DCT_HEADERS,
      timeout: 30000,
    });
    return data;
  } catch (err) {
    throw friendlyError(err);
  }
}

function pickUrl(data, ...keys) {
  for (const k of keys) {
    const v = k.split('.').reduce((o, part) => o?.[part], data);
    if (typeof v === 'string' && v) return v;
  }
  return null;
}

const diffusion = {
  command: 'diffusion',
  category: 'GENERAL',
  description: 'Génère une image via Stable Diffusion',
  handler: async ({ sock, chatId, args }) => {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      await sock.sendMessage(chatId, { text: `🎨 Utilise : ${PREFIX}diffusion <description>` });
      return;
    }
    try {
      await sock.sendMessage(chatId, { text: `🎨 Je génère ton image (Stable Diffusion)...` });
      const data = await dctGet('/diffusion', { prompt });
      const imageUrl = typeof data === 'string' ? `${DCT_BASE}/diffusion?prompt=${encodeURIComponent(prompt)}` : pickUrl(data, 'result', 'url', 'data.url', 'image');
      if (!imageUrl) throw new Error("pas d'image reçue");
      await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: `🎨 *${prompt}*` });
      await recordImage();
    } catch (e) {
      console.error('Erreur diffusion:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci pour générer l'image (${e.message}), réessaie.` });
    }
  },
};

const writecream = {
  command: 'writecream',
  category: 'GENERAL',
  description: 'Génère une image via Writecream',
  handler: async ({ sock, chatId, args }) => {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      await sock.sendMessage(chatId, { text: `🎨 Utilise : ${PREFIX}writecream <description>` });
      return;
    }
    try {
      await sock.sendMessage(chatId, { text: `🎨 Je génère ton image (Writecream)...` });
      const data = await dctGet('/ai/writecream/image', { prompt });
      const imageUrl = typeof data === 'string' ? data : pickUrl(data, 'result', 'url', 'data.url', 'image');
      if (!imageUrl) throw new Error("pas d'image reçue");
      await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: `🎨 *${prompt}*` });
      await recordImage();
    } catch (e) {
      console.error('Erreur writecream:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci pour générer l'image (${e.message}), réessaie.` });
    }
  },
};

const ttsg = {
  command: 'ttsg',
  category: 'GENERAL',
  description: 'Synthèse vocale via Google TTS (en ligne, alternative à !tts)',
  handler: async ({ sock, chatId, args }) => {
    const text = args.slice(1).join(' ');
    if (!text) {
      await sock.sendMessage(chatId, { text: `🎙️ Utilise : ${PREFIX}ttsg <texte>` });
      return;
    }
    try {
      const data = await dctGet('/tts/google', { text, lang: 'fr' });
      const audioUrl = typeof data === 'string' ? null : pickUrl(data, 'result', 'url', 'data.url', 'audio');
      if (!audioUrl) throw new Error("pas d'audio reçu");
      await sock.sendMessage(chatId, { audio: { url: audioUrl }, mimetype: 'audio/mpeg', ptt: true });
    } catch (e) {
      console.error('Erreur ttsg:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci pour la synthèse vocale (${e.message}), réessaie.` });
    }
  },
};

const kimi = {
  command: 'kimi',
  category: 'GENERAL',
  description: 'Pose une question à Kimi k2.6 (réponse ponctuelle, sans mémoire de conversation)',
  handler: async ({ sock, chatId, args }) => {
    const text = args.slice(1).join(' ');
    if (!text) {
      await sock.sendMessage(chatId, { text: `💛 Utilise : ${PREFIX}kimi <question>` });
      return;
    }
    try {
      const data = await dctGet('/ai/kimi-k2.6', { prompt: text });
      const answer = stripReasoningTags(typeof data === 'string' ? data : (data.result || data.response || data.message || data.data));
      if (!answer) throw new Error("pas de réponse reçue");
      await sock.sendMessage(chatId, { text: `🤖 *Kimi k2.6*\n\n${answer}` });
    } catch (e) {
      console.error('Erreur kimi:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci avec Kimi (${e.message}), réessaie.` });
    }
  },
};

const nova = {
  command: 'nova',
  category: 'GENERAL',
  description: 'Pose une question à Nova AI (réponse ponctuelle, sans mémoire de conversation)',
  handler: async ({ sock, chatId, args }) => {
    const text = args.slice(1).join(' ');
    if (!text) {
      await sock.sendMessage(chatId, { text: `💛 Utilise : ${PREFIX}nova <question>` });
      return;
    }
    try {
      const data = await dctGet('/ai/nova', { prompt: text });
      const answer = stripReasoningTags(typeof data === 'string' ? data : (data.result || data.response || data.message || data.data));
      if (!answer) throw new Error("pas de réponse reçue");
      await sock.sendMessage(chatId, { text: `🤖 *Nova AI*\n\n${answer}` });
    } catch (e) {
      console.error('Erreur nova:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci avec Nova (${e.message}), réessaie.` });
    }
  },
};

export default [diffusion, writecream, ttsg, kimi, nova];
