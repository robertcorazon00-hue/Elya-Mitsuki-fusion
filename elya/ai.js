// elya/ai.js — Client Gemini partagé et pools de citations/blagues, pour que les
// plugins IA puissent les utiliser sans dépendre de server.js.
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY manquante ! Crée un fichier .env');
  process.exit(1);
}

export const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });const CHAT_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-flash-latest';

// Shim de compatibilité : garde l'ancienne interface model.generateContent(...)
// utilisée partout dans server.js et maintenant dans les plugins.
export const model = {
  generateContent: async (promptOrOptions) => {
    const contents = typeof promptOrOptions === 'string' ? promptOrOptions : promptOrOptions.contents;
    const response = await genAI.models.generateContent({ model: CHAT_MODEL_NAME, contents });
    return { response: { text: () => response.text, candidates: response.candidates } };
  },
};

// ─── Cache de citations/blagues : évite un appel API à chaque demande ───
export const citationPool = [];
export const blaguePool = [];

export async function refillPool(pool, prompt, count = 5) {
  try {
    const fullPrompt = `${prompt} Génère ${count} propositions différentes. Réponds avec une par ligne, sans numérotation, sans rien d'autre.`;
    const result = await model.generateContent(fullPrompt);
    const lines = (await result.response).text().split('\n').map((l) => l.trim()).filter(Boolean);
    pool.push(...lines);
  } catch (e) {
    console.error('Erreur refillPool:', e.message);
  }
}

export async function getFromPool(pool, prompt, fallbackArray) {
  if (pool.length < 2) await refillPool(pool, prompt);
  if (pool.length > 0) return pool.shift();
  return fallbackArray[Math.floor(Math.random() * fallbackArray.length)];
}

// ─── Génération d'images ───
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY || '';
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';
const NANOBANANA_FALLBACK_URL = 'https://api.cod3uchiha.com/ai/NanoBanana?prompt=';

export async function generateImage(prompt) {
  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
  if (POLLINATIONS_API_KEY) {
    return url + '&key=' + encodeURIComponent(POLLINATIONS_API_KEY);
  }
  return url;
}

export async function generateNanoBananaImage(prompt) {
  try {
    const imgResponse = await genAI.models.generateContent({ model: GEMINI_IMAGE_MODEL, contents: prompt });
    const result = { response: { candidates: imgResponse.candidates } };
    const parts = result.response.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find((p) => p.inlineData);
    if (imgPart) {
      return { buffer: Buffer.from(imgPart.inlineData.data, 'base64'), mimeType: imgPart.inlineData.mimeType || 'image/png' };
    }
    throw new Error('no_image_in_response');
  } catch (e) {
    // Repli sur le wrapper tiers
    const url = NANOBANANA_FALLBACK_URL + encodeURIComponent(prompt);
    return { url };
  }
}
