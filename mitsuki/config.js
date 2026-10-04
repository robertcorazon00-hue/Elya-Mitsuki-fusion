// config.js — Réglages globaux de Mitsuki Kiryu-MD (portés en ESM pour la fusion avec Elya)
// Note : BOT_NAME et PREFIX ne lisent PAS process.env ici — ces variables d'env (voir
// app.json) pilotent le nom/préfixe d'Elya (elya/config.js). Mitsuki garde son propre
// préfixe "." en dur : c'est ce qui distingue les deux bots sur le même socket partagé.
export const BOT_NAME = 'Mitsuki Kiryu-MD';
export const PREFIX = '.';
export const OWNER = 'RobertCorazon';
export const VERSION = '1.0.0';
// 'Public' par défaut ; owner.setMode() change bot.mode via storage, mais cette
// constante reste le libellé statique affiché dans .menu (comme dans l'original).
export const MODE = 'Public';
export const CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb7tzDqJpe8eHX2v3i3z';

// Endpoints API (cod3uchiha + maxxtech)
export const API = {
  copilot: 'https://api.cod3uchiha.com/ai/copilot?text=',
  gpt5: 'https://api.cod3uchiha.com/ai/gpt5?text=',
  tiktokdl: 'https://api.cod3uchiha.com/downloaders/tiktokdl?url=', // conservé en fallback, plus utilisé par défaut
  ytdl: 'https://api.cod3uchiha.com/downloaders/ytdl',
  ytplay: 'https://api.cod3uchiha.com/downloaders/play?query=',
  ytmp3: 'https://api.cod3uchiha.com/downloaders/ytmp3', // plus utilisé, remplacé par yt-dlp local
  ytmp4: 'https://api.cod3uchiha.com/downloaders/ytmp4', // plus utilisé, remplacé par yt-dlp local
  waifu: 'https://api.cod3uchiha.com/random/waifu', // plus utilisé, remplacé par waifu.pics
  imdb: 'https://api.cod3uchiha.com/search/imdb?query=',
  wikipedia: 'https://api.cod3uchiha.com/search/wikipedia', // plus utilisé, remplacé par l'API Wikipedia officielle
  translate: 'https://api.cod3uchiha.com/tools/trt',

  maxxtechBase: 'https://api.maxxtech.co.ke',
  maxxtechKey: process.env.MAXXTECH_API_KEY || 'carlymaxx',

  davidcyrilBase: 'https://apis.davidcyriltech.my.id',
  davidcyrilKey: process.env.DAVIDCYRIL_API_KEY || '',

  // ── Nouvelles APIs de remplacement (fiables, gratuites, sans clé) ──
  tikwm: 'https://www.tikwm.com/api/',
  waifuPics: 'https://api.waifu.pics/sfw/waifu',
  wikipediaOfficial: 'https://fr.wikipedia.org/w/api.php',
  prexzyDeepquery: 'https://prexzyapis.com/ai/deepquery?prompt=',
  openMeteoGeocode: 'https://geocoding-api.open-meteo.com/v1/search',
  openMeteoForecast: 'https://api.open-meteo.com/v1/forecast',
  newsApiNoKey: 'https://saurav.tech/NewsAPI',
  mediafireWorker: 'https://mediafire.m2hgamerz.workers.dev/api',

  // ── Ajoutés pour .meme / .translate / .tourl (gratuits, sans clé) ──
  memeApi: 'https://meme-api.com/gimme',
  googleTranslate: 'https://translate.googleapis.com/translate_a/single',
  catbox: 'https://catbox.moe/user/api.php',
  zeroX0: 'https://0x0.st',
};
