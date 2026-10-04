// menu.js — Construit le texte du menu .menu
import { BOT_NAME, PREFIX, OWNER, VERSION, MODE } from './config.js';
// Convertit A-Z / a-z / 0-9 en gras italique sans-serif unicode (𝙈𝙞𝙩𝙨𝙪𝙠𝙞, 𝟭.𝟬.𝟬)
function bold(text) {
  const map = {};
  const upperStart = 0x1D63C; // 𝘼
  const lowerStart = 0x1D656; // 𝙖
  const digitStart = 0x1D7EC; // 𝟬
  for (let i = 0; i < 26; i++) {
    map[String.fromCharCode(65 + i)] = String.fromCodePoint(upperStart + i);
    map[String.fromCharCode(97 + i)] = String.fromCodePoint(lowerStart + i);
  }
  for (let i = 0; i < 10; i++) {
    map[String.fromCharCode(48 + i)] = String.fromCodePoint(digitStart + i);
  }
  return text.split('').map((c) => map[c] || c).join('');
}

// Même police pour les noms de commandes (alias conservé pour compat avec le reste du code)
const boldCmd = bold;

const BOX_TOP = '╭────────────•◦°';
const BOX_BOTTOM = '╰────────────•◦°';

const SECTIONS = [
  { emoji: '✦', name: 'GENERAL', cmds: ['menu', 'help', 'ping', 'apropos'] },
  { emoji: '📥', name: 'TELECHARGEMENT', cmds: ['download', 'fb', 'ig', 'mediafire', 'song', 'tt', 'video', 'vv', 'tiktok', 'youtube', 'ytmp3', 'ytmp4', 'apk', 'gdrive', 'webdl', 'web2zip', 'web2apk', 'mediafire2', 'y2mate'] },
  { emoji: '👥', name: 'GROUPE', cmds: ['kick', 'clean', 'add', 'promote', 'demote', 'mute', 'unmute', 'tagall', 'htag', 'invite', 'groupinfo', 'gs', 'lock', 'unlock', 'acceptall', 'rejectall', 'desc', 'gname', 'gpp', 'revoke', 'kickall'] },
  { emoji: '👤', name: 'UTILISATEUR', cmds: ['save', 'active', 'apply', 'profile', 'setting', 'set', 'block', 'unblock', 'jid', 'fullpp', 'getdp', 'leave', 'join', 'pair'] },
  { emoji: '🎉', name: 'FUN', cmds: ['sticker', 'meme', 'quiz', 'joke', 'rate', 'ship', 'love', 'love2'] },
  { emoji: '🤖', name: 'IA', cmds: ['gemini', 'chatgpt5', 'copilot', 'kimi', 'nova', 'flixier', 'translate', 'resume'] },
  { emoji: 'ℹ️', name: 'INFO', cmds: ['weather', 'news', 'calc', 'time', 'wiki', 'fancy', 'blur', 'topdf', 'gsearch', 'compresspdf', 'pdf2jpg', 'jpg2pdf', 'ssweb', 'shorturl', 'tgsticker', 'ghstalk'] },
  { emoji: '🖼️', name: 'MEDIA', cmds: ['toimage', 'tovideo', 'tourl', 'qrcode', 'waifu', 'wallpaper'] },
  { emoji: '📊', name: 'STATUT', cmds: ['setautoreply', 'statusemoji', 'autolike', 'autoreadstatus'] },
  { emoji: '🛡️', name: 'SECURITE', cmds: ['antilink', 'antispam', 'antibot', 'antiedit', 'antidelete', 'antihidetag', 'warns', 'unwarn'] },
  { emoji: '⚙️', name: 'AUTO', cmds: ['autoreact', 'autoread', 'autosave', 'autoreply', 'anticall', 'autorecording', 'autotyping'] },
  { emoji: '👑', name: 'OWNER', cmds: ['ban', 'unban', 'broadcast', 'setname', 'setpp', 'mode', 'createchannel', 'setchannel', 'post'] },
  { emoji: '🀄', name: 'JEU MANGA', cmds: ['animestart', 'mjoin', 'go', 'classement', 'animestop'] },
];

const TOTAL_COMMANDS = SECTIONS.reduce((sum, s) => sum + s.cmds.length, 0);

// Formatte la date du jour en JJ/MM/AAAA sans dépendre des données locale d'ICU
function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Formatte l'uptime du process (process.uptime(), en secondes) en "XhYmZs"
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

// Icône "vrai dessin" propre à chaque commande. Fallback '❆' si une commande n'a pas d'icône dédiée.
const DEFAULT_ICON = '❆';
const CMD_ICONS = {
  // GENERAL
  menu: '📖', help: '❓', ping: '🏓', apropos: 'ℹ️',
  // TELECHARGEMENT
  download: '📥', fb: '📘', ig: '📸', mediafire: '🗂️', song: '🎵', tt: '🎥',
  video: '🎬', vv: '🔁', tiktok: '🎶', youtube: '▶️', ytmp3: '🎧', ytmp4: '📹',
  // GROUPE
  kick: '👢', clean: '🧹', add: '➕', promote: '⬆️', demote: '⬇️', mute: '🔇',
  unmute: '🔊', tagall: '📢', htag: '🏷️', invite: '✉️', groupinfo: '📋', gs: '🛠️',
  lock: '🔒', unlock: '🔓', acceptall: '✅', rejectall: '⛔', desc: '📝',
  gname: '🔤', gpp: '🖼️', revoke: '🔁', kickall: '🧨',
  // UTILISATEUR
  save: '💾', active: '🟢', apply: '📩', profile: '👤', setting: '⚙️', set: '🔧',
  block: '🚫', unblock: '✅', jid: '🆔', fullpp: '🖼️', getdp: '📷', leave: '🚪',
  join: '➡️', pair: '🔗',
  // FUN
  sticker: '🎨', meme: '😂', quiz: '🧠', joke: '🤣', rate: '⭐', ship: '💘',
  love: '❤️', love2: '💞',
  // IA
  gemini: '♊', chatgpt5: '🤖', copilot: '🧑\u200d💻', translate: '🌐', resume: '📄',
  // INFO
  weather: '☀️', news: '📰', calc: '🧮', time: '⏰', wiki: '📚', fancy: '✨',
  blur: '🌫️', topdf: '📑',
  // MEDIA
  toimage: '🖼️', tovideo: '🎞️', tourl: '🌍', qrcode: '🔳', waifu: '🌸', wallpaper: '🏞️',
  // STATUT
  setautoreply: '💬', statusemoji: '😀', autolike: '👍', autoreadstatus: '👁️',
  // SECURITE
  antilink: '🚷', antispam: '🚯', antibot: '🛑', antiedit: '✏️', antidelete: '🗑️',
  antihidetag: '🙈', warns: '⚠️', unwarn: '🆗',
  // AUTO
  autoreact: '😊', autoread: '✔️', autosave: '💿', autoreply: '🗨️', anticall: '📵',
  autorecording: '🎙️', autotyping: '⌨️',
  // OWNER
  ban: '🔨', unban: '♻️', broadcast: '📡', setname: '✍️', setpp: '🎨', mode: '🌓',
  createchannel: '🆕', setchannel: '📺', post: '📮',
  // JEU MANGA
  animestart: '▶️', mjoin: '🙋', go: '🎲', classement: '🏆', animestop: '⏹️',
};

function buildMenu(userName) {
  const blocks = [];

  // Boîte d'en-tête : nom du bot, prefix, version, mode, stats, user, uptime
  const header = [BOX_TOP];
  header.push(`│❆│ ➠ ${bold(BOT_NAME)}`);
  header.push(`│❆│ ➠ ${bold('Prefix')} : ${PREFIX}`);
  header.push(`│❆│ ➠ ${bold('Version')} : ${bold(VERSION)}`);
  header.push(`│❆│ ➠ ${bold('Mode')} : ${bold(MODE || 'Public')}`);
  header.push(`│❆│ ➠ ${bold('Total')} : ${bold(`${TOTAL_COMMANDS} commandes`)}`);
  header.push(`│❆│ ➠ ${bold("Aujourd'hui")} : ${bold(formatDate(new Date()))}`);
  header.push(`│❆│ ➠ ${bold('User')} : ${bold(userName || 'Utilisateur')}`);
  header.push(`│❆│ ➠ ${bold('Uptime')} : ${bold(formatUptime(process.uptime()))}`);
  header.push(BOX_BOTTOM);
  blocks.push(header.join('\n'));

  // Une boîte par section, titre avec l'emoji de section, commandes avec ❆
  for (const section of SECTIONS) {
    const box = [BOX_TOP];
    box.push(`│${section.emoji}│ ➠ ${bold(section.name)}`);
    for (const cmd of section.cmds) {
      box.push(`│❆│ ➠ ${PREFIX}${bold(cmd)}`);
    }
    box.push(BOX_BOTTOM);
    blocks.push(box.join('\n'));
  }

  return blocks.join('\n\n') + `\n\n${bold('By ' + OWNER)}`;
}

// Cherche une commande dans les sections du menu, retourne sa catégorie si trouvée
function findCommand(cmd) {
  const clean = (cmd || '').toLowerCase().replace(/^\./, '');
  for (const section of SECTIONS) {
    if (section.cmds.includes(clean)) {
      return { name: clean, section: section.name, emoji: section.emoji };
    }
  }
  return null;
}

export { buildMenu, bold, boldCmd, findCommand, SECTIONS, CMD_ICONS, TOTAL_COMMANDS };
