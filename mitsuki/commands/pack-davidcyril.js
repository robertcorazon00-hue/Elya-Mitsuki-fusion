// commands/pack-davidcyril.js — Reste du pack davidcyriltech côté Mitsuki
// (menu existant mais handlers absents jusqu'ici : apk, gdrive, mediafire,
// webdl, web2zip, web2apk, y2mate, compresspdf, pdf2jpg, ssweb, tgsticker,
// shorturl, ghstalk, flixier). Même patron que commands/search.js côté
// Mitsuki et elya/plugins/tools-extra.js côté Elya : GET, header X-API-Key,
// domaine apis.davidcyriltech.my.id.
//
// ⚠️ Schéma NON confirmé par un exemple curl pour aucun de ces 14 endpoints
// (contrairement aux 5 déjà câblés côté Elya) : noms de paramètres et forme
// de réponse sont des suppositions au mieux, basées sur la convention du
// reste du pack — à vérifier et corriger une fois testé en conditions
// réelles (pas d'accès réseau ici pour le faire).
import axios from 'axios';
import { API } from '../config.js';
import { buildCard } from '../card.js';

function friendlyError(err) {
  if (err.response?.status === 401) {
    return new Error('cette fonctionnalité demande une clé API (DAVIDCYRIL_API_KEY non configurée ou invalide)');
  }
  return new Error(err.response?.data?.message || err.message || 'service indisponible, réessaie plus tard');
}

async function dctGet(path, params) {
  try {
    const { data } = await axios.get(`${API.davidcyrilBase}${path}`, {
      params,
      headers: API.davidcyrilKey ? { 'X-API-Key': API.davidcyrilKey } : {},
      timeout: 30000,
    });
    return data;
  } catch (err) {
    throw friendlyError(err);
  }
}

function pickUrl(data, ...keys) {
  for (const k of keys) {
    const v = k.split('.').reduce((o, part) => (o && typeof o === 'object' ? o[part] : undefined), data);
    if (typeof v === 'string' && v) return v;
  }
  return null;
}

function pickText(data) {
  if (typeof data === 'string') return data;
  return data?.result || data?.response || data?.message || data?.data || null;
}

// ── Téléchargeurs (retournent un lien de fichier) ──

export async function apk(appName) {
  const data = await dctGet('/download/apk', { appName });
  const url = pickUrl(data, 'result.url', 'result.downloadUrl', 'url', 'downloadUrl', 'data.url');
  if (!url) throw new Error('aucun lien de téléchargement reçu pour cette application');
  return { url, fileName: `${appName}.apk` };
}

export async function gdrive(link) {
  const data = await dctGet('/gdrive', { url: link });
  const url = pickUrl(data, 'result.url', 'result.downloadUrl', 'url', 'downloadUrl', 'data.url');
  const fileName = data?.result?.fileName || data?.fileName || 'fichier';
  if (!url) throw new Error('aucun lien reçu pour ce fichier Google Drive');
  return { url, fileName };
}

export async function mediafire(link) {
  const data = await dctGet('/mediafire', { url: link });
  const url = pickUrl(data, 'result.url', 'result.link', 'url', 'link', 'data.url');
  const fileName = data?.result?.fileName || data?.fileName || 'fichier';
  if (!url) throw new Error('aucun lien reçu pour ce fichier Mediafire');
  return { url, fileName };
}

export async function webdl(link) {
  const data = await dctGet('/tools/downloadweb', { url: link });
  const url = pickUrl(data, 'result.url', 'url', 'data.url');
  if (!url) throw new Error('aucun lien reçu pour ce site');
  return { url, fileName: 'site.zip' };
}

export async function web2zip(link) {
  const data = await dctGet('/tools/web2zip', { url: link });
  const url = pickUrl(data, 'result.url', 'url', 'data.url');
  if (!url) throw new Error('aucun lien reçu');
  return { url, fileName: 'site.zip' };
}

export async function web2apk(link) {
  const data = await dctGet('/tools/web2apk', { url: link });
  const url = pickUrl(data, 'result.url', 'url', 'data.url');
  if (!url) throw new Error('aucun lien reçu');
  return { url, fileName: 'app.apk' };
}

export async function y2mate(link) {
  const data = await dctGet('/download/y2mate', { url: link });
  const url = pickUrl(data, 'result.url', 'result.downloadUrl', 'url', 'downloadUrl', 'data.url');
  const title = data?.result?.title || data?.title || 'video';
  if (!url) throw new Error('aucun lien reçu pour cette vidéo');
  return { url, title };
}

// ── Outils PDF / image ──

export async function compresspdf(link) {
  const data = await dctGet('/pdf/compress', { url: link });
  const url = pickUrl(data, 'result.url', 'url', 'data.url');
  if (!url) throw new Error('échec de la compression');
  return { url, fileName: 'compressed.pdf' };
}

export async function pdf2jpg(link) {
  const data = await dctGet('/pdf/pdf-to-jpg', { url: link });
  const single = pickUrl(data, 'result.url', 'url');
  const urls = data?.result?.images || data?.images || (single ? [single] : []);
  if (!Array.isArray(urls) || urls.length === 0) throw new Error('aucune image reçue');
  return urls;
}

// ── Divers ──

export async function ssweb(link) {
  const data = await dctGet('/ssweb', { url: link });
  const url = pickUrl(data, 'result.url', 'url', 'data.url', 'result.image');
  if (!url) throw new Error("échec de la capture d'écran");
  return url;
}

export async function tgsticker(link) {
  const data = await dctGet('/telegram-sticker', { url: link });
  const single = pickUrl(data, 'result.url', 'url');
  const urls = data?.result?.stickers || data?.stickers || (single ? [single] : []);
  if (!Array.isArray(urls) || urls.length === 0) throw new Error('aucun sticker reçu');
  return urls;
}

export async function shorturl(link) {
  const data = await dctGet('/tools/shorturl', { url: link });
  const short = pickUrl(data, 'result.url', 'result.shortUrl', 'url', 'shortUrl') || pickText(data);
  if (!short) throw new Error('échec du raccourcissement');
  return short;
}

export async function ghstalk(username) {
  const data = await dctGet('/githubStalk', { username });
  const r = data?.result || data;
  if (!r || (!r.login && !r.name)) throw new Error(`utilisateur GitHub "${username}" introuvable`);
  return buildCard('GitHub Stalk', [
    ['Utilisateur', r.login || username],
    ['Nom', r.name || '—'],
    ['Bio', r.bio || '—'],
    ['Repos', r.public_repos ?? r.repos ?? '—'],
    ['Followers', r.followers ?? '—'],
  ]);
}

export async function flixier(prompt) {
  const data = await dctGet('/flixier', { prompt });
  const answer = pickText(data);
  if (!answer) throw new Error('pas de réponse reçue');
  return answer;
}

// ── IA (mêmes endpoints que !kimi / !nova côté Elya — schéma confirmé par
// curl : GET /ai/<modèle>?prompt=, header X-API-Key) ──

export async function kimi(prompt) {
  const data = await dctGet('/ai/kimi-k2.6', { prompt });
  const answer = pickText(data);
  if (!answer) throw new Error('pas de réponse reçue');
  return answer;
}

export async function nova(prompt) {
  const data = await dctGet('/ai/nova', { prompt });
  const answer = pickText(data);
  if (!answer) throw new Error('pas de réponse reçue');
  return answer;
}
