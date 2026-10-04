import * as local from '../commands/local.js';
import * as info from '../commands/info.js';
import * as media from '../commands/media.js';
import { getQuotedImageBuffer } from '../pluginHelpers.js';

const calc = {
  command: 'calc',
  category: 'INFO',
  description: 'Calcule une expression mathématique',
  handler: async ({ sock, from, argText }) => {
    if (!argText) { await sock.sendMessage(from, { text: '• Utilise : .calc <expression>' }); return; }
    await sock.sendMessage(from, { text: local.calc(argText) });
  },
};

const time = {
  command: 'time',
  category: 'INFO',
  description: "Affiche la date et l'heure actuelles",
  handler: async ({ sock, from }) => {
    await sock.sendMessage(from, { text: local.time() });
  },
};

const weather = {
  command: 'weather',
  category: 'INFO',
  description: "Météo actuelle d'une ville",
  handler: async ({ sock, from, argText }) => {
    try {
      await sock.sendMessage(from, { text: await info.weather(argText) });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const news = {
  command: 'news',
  category: 'INFO',
  description: 'Dernières actualités : .news [général|économie|santé|science|sport|technologie]',
  handler: async ({ sock, from, argText }) => {
    try {
      await sock.sendMessage(from, { text: await info.news(argText) });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const wiki = {
  command: 'wiki',
  category: 'INFO',
  description: 'Résumé Wikipédia sur un sujet',
  handler: async ({ sock, from, argText }) => {
    try {
      const r = await info.wiki(argText);
      if (r.imageUrl) await sock.sendMessage(from, { image: { url: r.imageUrl }, caption: r.caption });
      else await sock.sendMessage(from, { text: r.caption });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const fancy = {
  command: 'fancy',
  category: 'INFO',
  description: 'Écrit ton texte dans plein de polices stylées',
  handler: async ({ sock, from, argText }) => {
    try {
      await sock.sendMessage(from, { text: info.fancy(argText) });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const blur = {
  command: 'blur',
  category: 'INFO',
  description: 'Floute une image citée : .blur [intensité 1-60]',
  handler: async ({ sock, from, msg, args }) => {
    const buffer = await getQuotedImageBuffer(msg, from);
    if (!buffer) { await sock.sendMessage(from, { text: '• Envoie ou cite une image avec .blur [intensité 1-60]' }); return; }
    try {
      const out = await media.blur(buffer, args[0]);
      await sock.sendMessage(from, { image: out });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

export default [calc, time, weather, news, wiki, fancy, blur];
