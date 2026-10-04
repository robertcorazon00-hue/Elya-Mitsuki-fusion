// commands/search.js — .gsearch : recherche Google via le pack davidcyriltech.
// Schéma non confirmé par un exemple curl (contrairement aux endpoints /ai/*
// déjà câblés côté Elya) : on suit la même convention que le reste du pack
// (GET, header X-API-Key) avec un paramètre `query`, à ajuster si le format
// réel diffère une fois testé en conditions réelles.
import axios from 'axios';
import { API } from '../config.js';

export async function googleSearch(query) {
  if (!query) throw new Error('Utilise : .gsearch <recherche>');

  let data;
  try {
    const res = await axios.get(`${API.davidcyrilBase}/search/google`, {
      params: { query },
      headers: API.davidcyrilKey ? { 'X-API-Key': API.davidcyrilKey } : {},
      timeout: 20000,
    });
    data = res.data;
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error('cette fonctionnalité demande une clé API (DAVIDCYRIL_API_KEY non configurée ou invalide)');
    }
    throw new Error(err.response?.data?.message || err.message || 'service indisponible, réessaie plus tard');
  }

  const results = data?.result?.results || data?.results || data?.data || data?.result || [];
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`aucun résultat pour "${query}"`);
  }

  return results.slice(0, 5).map((r, i) => {
    const title = r.title || r.name || `Résultat ${i + 1}`;
    const snippet = r.snippet || r.description || '';
    const url = r.link || r.url || '';
    return `${i + 1}. ${title}${url ? `\n${url}` : ''}${snippet ? `\n${snippet}` : ''}`;
  }).join('\n\n');
}
