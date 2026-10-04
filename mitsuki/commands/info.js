// commands/info.js — .weather, .news, .wiki, .fancy, .meme
// APIs gratuites et sans clé (voir config.js : openMeteo*, newsApiNoKey,
// wikipediaOfficial, memeApi). Non testées en conditions réelles (pas d'accès
// réseau lors de l'écriture) : format des réponses connu, mais à vérifier au
// premier essai.
import axios from 'axios';
import { API } from '../config.js';
import { buildCard, buildAiCard } from '../card.js';

const UA = { 'User-Agent': 'MitsukiKiryuMD/1.0 (bot WhatsApp)' };

// ── .weather <ville> ──
const WMO = {
  0: ['Ciel dégagé', '☀️'], 1: ['Plutôt dégagé', '🌤️'], 2: ['Partiellement nuageux', '⛅'], 3: ['Couvert', '☁️'],
  45: ['Brouillard', '🌫️'], 48: ['Brouillard givrant', '🌫️'],
  51: ['Bruine légère', '🌦️'], 53: ['Bruine', '🌦️'], 55: ['Bruine forte', '🌧️'],
  56: ['Bruine verglaçante', '🌧️'], 57: ['Bruine verglaçante forte', '🌧️'],
  61: ['Pluie légère', '🌦️'], 63: ['Pluie', '🌧️'], 65: ['Pluie forte', '🌧️'],
  66: ['Pluie verglaçante', '🌧️'], 67: ['Pluie verglaçante forte', '🌧️'],
  71: ['Neige légère', '🌨️'], 73: ['Neige', '🌨️'], 75: ['Neige forte', '❄️'], 77: ['Grains de neige', '❄️'],
  80: ['Averses légères', '🌦️'], 81: ['Averses', '🌧️'], 82: ['Averses violentes', '⛈️'],
  85: ['Averses de neige', '🌨️'], 86: ['Fortes averses de neige', '❄️'],
  95: ['Orage', '⛈️'], 96: ['Orage avec grêle', '⛈️'], 99: ['Orage violent avec grêle', '⛈️'],
};

export async function weather(city) {
  if (!city) throw new Error('Utilise : .weather <ville>');

  let place;
  try {
    const { data } = await axios.get(API.openMeteoGeocode, {
      params: { name: city, count: 1, language: 'fr', format: 'json' },
      timeout: 15000,
    });
    place = data?.results?.[0];
  } catch (_) {
    throw new Error('service météo indisponible, réessaie plus tard');
  }
  if (!place) throw new Error(`ville "${city}" introuvable`);

  let current;
  try {
    const { data } = await axios.get(API.openMeteoForecast, {
      params: {
        latitude: place.latitude,
        longitude: place.longitude,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
        timezone: 'auto',
      },
      timeout: 15000,
    });
    current = data?.current;
  } catch (_) {
    throw new Error('service météo indisponible, réessaie plus tard');
  }
  if (!current) throw new Error('données météo indisponibles pour cette ville');

  const [label, emoji] = WMO[current.weather_code] || ['Conditions inconnues', '🌡️'];
  const where = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
  return buildCard('Météo', [
    ['Lieu', where],
    ['Conditions', `${emoji} ${label}`],
    ['Température', `${current.temperature_2m}°C (ressenti ${current.apparent_temperature}°C)`],
    ['Humidité', `${current.relative_humidity_2m}%`],
    ['Vent', `${current.wind_speed_10m} km/h`],
  ]);
}

// ── .news [catégorie] ──
const NEWS_CATEGORIES = {
  general: 'general', 'général': 'general',
  business: 'business', economie: 'business', 'économie': 'business',
  entertainment: 'entertainment', divertissement: 'entertainment',
  health: 'health', sante: 'health', 'santé': 'health',
  science: 'science',
  sports: 'sports', sport: 'sports',
  technology: 'technology', technologie: 'technology', tech: 'technology',
};

export async function news(categoryArg) {
  const key = (categoryArg || 'general').toLowerCase().trim();
  const category = NEWS_CATEGORIES[key];
  if (!category) {
    throw new Error('catégorie inconnue. Choix : général, économie, divertissement, santé, science, sport, technologie');
  }

  let articles;
  try {
    const { data } = await axios.get(`${API.newsApiNoKey}/top-headlines/category/${category}/fr.json`, { timeout: 15000 });
    articles = (data?.articles || []).filter((a) => a?.title).slice(0, 5);
  } catch (_) {
    throw new Error("service d'actualités indisponible, réessaie plus tard");
  }
  if (!articles.length) throw new Error('aucune actualité disponible pour le moment');

  const lines = articles.map((a, i) => `${i + 1}. ${a.title}${a.url ? `\n${a.url}` : ''}`);
  return buildAiCard('Actualités', lines.join('\n\n'));
}

// ── .wiki <sujet> ──
export async function wiki(query) {
  if (!query) throw new Error('Utilise : .wiki <sujet>');

  let title;
  try {
    const { data } = await axios.get(API.wikipediaOfficial, {
      params: { action: 'query', list: 'search', srsearch: query, srlimit: 1, format: 'json' },
      headers: UA,
      timeout: 15000,
    });
    title = data?.query?.search?.[0]?.title;
  } catch (_) {
    throw new Error('Wikipédia est indisponible, réessaie plus tard');
  }
  if (!title) throw new Error(`aucun article trouvé pour "${query}"`);

  let page;
  try {
    const { data } = await axios.get(API.wikipediaOfficial, {
      params: {
        action: 'query', prop: 'extracts|pageimages|info', exintro: 1, explaintext: 1,
        inprop: 'url', piprop: 'thumbnail', pithumbsize: 600, titles: title, redirects: 1, format: 'json',
      },
      headers: UA,
      timeout: 15000,
    });
    page = Object.values(data?.query?.pages || {})[0];
  } catch (_) {
    throw new Error('Wikipédia est indisponible, réessaie plus tard');
  }

  const extract = (page?.extract || '').trim();
  if (!extract) throw new Error(`l'article "${title}" n'a pas de résumé disponible`);
  const short = extract.length > 700 ? `${extract.slice(0, 700).replace(/\s+\S*$/, '')}…` : extract;

  return {
    imageUrl: page.thumbnail?.source || null,
    caption: buildCard('Wikipédia', [
      ['Article', page.title],
      ['Résumé', short],
      ['Lien', page.fullurl],
    ]),
  };
}

// ── .fancy <texte> — polices Unicode (aucune API) ──
// Seuls les alphabets Unicode « sans trou » sont utilisés (les versions
// script/fraktur/double-barre normales ont des lettres manquantes dans Unicode).
function shift(text, upper, lower, digit) {
  let out = '';
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) out += String.fromCodePoint(upper + c - 65);
    else if (c >= 97 && c <= 122) out += String.fromCodePoint(lower + c - 97);
    else if (digit && c >= 48 && c <= 57) out += String.fromCodePoint(digit + c - 48);
    else out += ch;
  }
  return out;
}

const SMALL_CAPS = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ';
const FANCY_STYLES = [
  ['Gras', (t) => shift(t, 0x1d400, 0x1d41a, 0x1d7ce)],
  ['Gras italique', (t) => shift(t, 0x1d468, 0x1d482, 0x1d7ce)],
  ['Script gras', (t) => shift(t, 0x1d4d0, 0x1d4ea, 0x1d7ce)],
  ['Gothique gras', (t) => shift(t, 0x1d56c, 0x1d586, 0x1d7ce)],
  ['Sans-serif', (t) => shift(t, 0x1d5a0, 0x1d5ba, 0x1d7e2)],
  ['Sans-serif gras', (t) => shift(t, 0x1d5d4, 0x1d5ee, 0x1d7ec)],
  ['Sans-serif italique', (t) => shift(t, 0x1d608, 0x1d622, 0x1d7e2)],
  ['Machine à écrire', (t) => shift(t, 0x1d670, 0x1d68a, 0x1d7f6)],
  ['Pleine largeur', (t) => shift(t, 0xff21, 0xff41, 0xff10)],
  ['Cerclé', (t) => {
    let out = '';
    for (const ch of t) {
      const c = ch.codePointAt(0);
      if (c >= 65 && c <= 90) out += String.fromCodePoint(0x24b6 + c - 65);
      else if (c >= 97 && c <= 122) out += String.fromCodePoint(0x24d0 + c - 97);
      else if (c === 48) out += '⓪';
      else if (c >= 49 && c <= 57) out += String.fromCodePoint(0x2460 + c - 49);
      else out += ch;
    }
    return out;
  }],
  ['Petites capitales', (t) => [...t.toLowerCase()].map((ch) => {
    const i = ch.charCodeAt(0) - 97;
    return i >= 0 && i < 26 ? SMALL_CAPS[i] : ch;
  }).join('')],
];

export function fancy(text) {
  if (!text) throw new Error('Utilise : .fancy <texte>');
  if (text.length > 100) throw new Error('texte trop long (100 caractères maximum)');
  // Les lettres accentuées n'existent pas dans ces alphabets : on retire les accents.
  const plain = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const lines = FANCY_STYLES.map(([, fn]) => fn(plain));
  return buildAiCard('Fancy', lines.join('\n'));
}

// ── .meme ──
export async function meme() {
  for (let i = 0; i < 4; i++) {
    let data;
    try {
      ({ data } = await axios.get(API.memeApi, { timeout: 15000 }));
    } catch (_) {
      throw new Error('service de memes indisponible, réessaie plus tard');
    }
    // On écarte les memes marqués NSFW / spoiler par la source.
    if (data?.url && !data.nsfw && !data.spoiler) return { imageUrl: data.url, caption: data.title || '' };
  }
  throw new Error('pas de meme approprié trouvé, réessaie');
}
