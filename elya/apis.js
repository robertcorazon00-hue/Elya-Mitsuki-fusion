// elya/apis.js — Fonctions d'appel aux APIs externes simples utilisées par plusieurs
// commandes Elya, extraites de server.js pour être réutilisables depuis les plugins.
import axios from 'axios';

export const DICTIONARY_API_URL = 'https://api.cod3uchiha.com/education/dictionary?word=';
export const PINTEREST_API_URL = 'https://christus-api.vercel.app/image/Pinterest?query=';
export const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY || '';
export const NEWSDATA_URL = 'https://newsdata.io/api/1/latest';
export const MAXXTECH_API_KEY = process.env.MAXXTECH_API_KEY || '';
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
export const MAXXTECH_DEEPSEEK_URL = 'https://api.maxxtech.co.ke/ai/deepseek';
export const MAXXTECH_CODE_URL = 'https://api.maxxtech.co.ke/ai/code';
export const MAXXTECH_WEBSEARCH_URL = 'https://api.maxxtech.co.ke/search/web';

// ─── Recherche Pinterest ───
export async function searchPinterest(query) {
  const res = await axios.get(PINTEREST_API_URL + encodeURIComponent(query) + '&limit=10');
  const results = res.data?.result || res.data?.data || res.data?.images || [];
  return Array.isArray(results) ? results : [];
}

// ─── Dictionnaire ───
export async function lookupDictionary(word) {
  const res = await axios.get(DICTIONARY_API_URL + encodeURIComponent(word));
  return res.data;
}

// ─── Actualités (NewsData.io) ───
export async function searchNews(query) {
  const res = await axios.get(NEWSDATA_URL, {
    params: { apikey: NEWSDATA_API_KEY, q: query, language: 'fr' },
  });
  return res.data?.results || [];
}

// ─── DeepSeek, aide au code (maxxtech) ───
export async function askDeepSeek(prompt) {
  const res = await axios.get(MAXXTECH_DEEPSEEK_URL, { params: { prompt, apikey: MAXXTECH_API_KEY } });
  return res.data?.result || res.data?.response || res.data?.message || JSON.stringify(res.data);
}

export async function askAICode(action, text) {
  const res = await axios.get(MAXXTECH_CODE_URL, { params: { action, code: text, apikey: MAXXTECH_API_KEY } });
  return res.data?.result || res.data?.response || res.data?.message || JSON.stringify(res.data);
}

export async function webSearchDuckDuckGo(query) {
  const res = await axios.get(MAXXTECH_WEBSEARCH_URL, { params: { q: query, apikey: MAXXTECH_API_KEY } });
  return res.data?.result || res.data?.results || res.data?.data || [];
}

// ─── Recherche web via Tavily (fiable, pensée pour les IA) ───
export async function tavilySearch(query) {
  const res = await axios.post('https://api.tavily.com/search', {
    api_key: TAVILY_API_KEY,
    query,
    search_depth: 'basic',
    include_answer: true,
    max_results: 5,
  });
  return res.data;
}

// ─── Recherche Google (pack davidcyriltech, /search/google) ───
// Jamais câblée jusqu'ici (référencée dans le menu Mitsuki ".gsearch" mais sans
// implémentation). Schéma non confirmé par un exemple curl, contrairement aux
// endpoints /ai/* de tools-extra.js : on reprend la même convention que le
// reste du pack (GET, header X-API-Key) avec un paramètre `query` — à ajuster
// si le format réel diffère une fois testé en conditions réelles.
export const DAVIDCYRIL_BASE = 'https://apis.davidcyriltech.my.id';
export const DAVIDCYRIL_API_KEY = process.env.DAVIDCYRIL_API_KEY || '';

export async function searchGoogle(query) {
  const res = await axios.get(`${DAVIDCYRIL_BASE}/search/google`, {
    params: { query },
    headers: DAVIDCYRIL_API_KEY ? { 'X-API-Key': DAVIDCYRIL_API_KEY } : {},
    timeout: 20000,
  });
  const data = res.data;
  const results = data?.result?.results || data?.results || data?.data || data?.result || [];
  return Array.isArray(results) ? results : [];
}
