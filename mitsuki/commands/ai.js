// commands/ai.js — .gemini, .chatgpt5, .copilot, .translate, .resume
// - gemini/translate/resume : utilisent le client Gemini d'Elya (elya/ai.js,
//   même GEMINI_API_KEY — pas de nouvelle clé à fournir).
// - chatgpt5/copilot : endpoints cod3uchiha déjà déclarés dans config.js
//   (API.gpt5 / API.copilot), les mêmes qu'utilise Elya (!ia gpt5 / copilot).
// Non testés en conditions réelles (pas d'accès réseau lors de l'écriture).
import axios from 'axios';
import { API } from '../config.js';
import { model } from '../../elya/ai.js';

async function askGemini(prompt) {
  const result = await model.generateContent(prompt);
  const text = ((await result.response).text() || '').trim();
  if (!text) throw new Error('pas de réponse reçue');
  return text;
}

export function gemini(question) {
  return askGemini(`Réponds dans la langue de la question, de façon claire et concise.\n\n${question}`);
}

async function cod3uchiha(baseUrl, text) {
  let data;
  try {
    ({ data } = await axios.get(baseUrl + encodeURIComponent(text), { timeout: 30000 }));
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'service indisponible, réessaie plus tard');
  }
  const answer = typeof data === 'string' ? data : (data?.response || data?.result || data?.message);
  if (!answer) throw new Error('pas de réponse reçue');
  return String(answer).trim();
}

export const chatgpt5 = (question) => cod3uchiha(API.gpt5, question);
export const copilot = (question) => cod3uchiha(API.copilot, question);

// .translate [langue] <texte> — Google (gtx) d'abord, Gemini en repli
export async function translate(text, lang = 'fr') {
  if (!text) throw new Error('Utilise : .translate [langue] <texte>  (ex : .translate en bonjour)');
  try {
    const { data } = await axios.get(API.googleTranslate, {
      params: { client: 'gtx', sl: 'auto', tl: lang, dt: 't', q: text },
      timeout: 15000,
    });
    const translated = (data?.[0] || []).map((chunk) => chunk?.[0] || '').join('').trim();
    if (translated) return { text: translated, from: data?.[2] || 'auto', to: lang };
  } catch (_) { /* repli Gemini ci-dessous */ }

  const translated = await askGemini(`Traduis ce texte en "${lang}". Réponds uniquement avec la traduction :\n\n${text}`);
  return { text: translated, from: 'auto', to: lang };
}

// .resume <texte> — résumé court
export function resume(text) {
  if (!text) throw new Error('Utilise : .resume <texte>  (ou réponds à un message)');
  const clipped = text.length > 8000 ? text.slice(0, 8000) : text;
  return askGemini(`Résume ce texte en français en 3 à 5 phrases claires, sans rien ajouter d'extérieur :\n\n${clipped}`);
}
