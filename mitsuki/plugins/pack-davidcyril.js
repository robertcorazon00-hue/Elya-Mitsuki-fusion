import * as pack from '../commands/pack-davidcyril.js';
import { buildAiCard } from '../card.js';

function usage(cmd, arg) {
  return { text: `• Utilise : .${cmd} ${arg}` };
}

const apk = {
  command: 'apk',
  category: 'TELECHARGEMENT',
  description: "Cherche et télécharge une application (APK) par son nom",
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('apk', "<nom de l'appli>"));
    try {
      const r = await pack.apk(argText);
      await sock.sendMessage(from, {
        document: { url: r.url },
        mimetype: 'application/vnd.android.package-archive',
        fileName: r.fileName,
      });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const gdrive = {
  command: 'gdrive',
  category: 'TELECHARGEMENT',
  description: 'Télécharge un fichier Google Drive',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('gdrive', '<lien Google Drive>'));
    try {
      const r = await pack.gdrive(argText);
      await sock.sendMessage(from, { document: { url: r.url }, fileName: r.fileName });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const mediafire = {
  command: 'mediafire',
  category: 'TELECHARGEMENT',
  description: 'Télécharge un fichier Mediafire',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('mediafire', '<lien Mediafire>'));
    try {
      const r = await pack.mediafire(argText);
      await sock.sendMessage(from, { document: { url: r.url }, fileName: r.fileName });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const webdl = {
  command: 'webdl',
  category: 'TELECHARGEMENT',
  description: 'Télécharge une page/site web',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('webdl', '<lien du site>'));
    try {
      const r = await pack.webdl(argText);
      await sock.sendMessage(from, { document: { url: r.url }, fileName: r.fileName });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const web2zip = {
  command: 'web2zip',
  category: 'TELECHARGEMENT',
  description: 'Télécharge un site web complet en .zip',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('web2zip', '<lien du site>'));
    try {
      const r = await pack.web2zip(argText);
      await sock.sendMessage(from, { document: { url: r.url }, fileName: r.fileName });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const web2apk = {
  command: 'web2apk',
  category: 'TELECHARGEMENT',
  description: 'Convertit un site web en application (APK)',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('web2apk', '<lien du site>'));
    try {
      const r = await pack.web2apk(argText);
      await sock.sendMessage(from, {
        document: { url: r.url },
        mimetype: 'application/vnd.android.package-archive',
        fileName: r.fileName,
      });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const y2mate = {
  command: 'y2mate',
  category: 'TELECHARGEMENT',
  description: 'Télécharge une vidéo YouTube',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('y2mate', '<lien YouTube>'));
    try {
      const r = await pack.y2mate(argText);
      await sock.sendMessage(from, { video: { url: r.url }, caption: r.title });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const compresspdf = {
  command: 'compresspdf',
  category: 'INFO',
  description: 'Compresse un PDF (donné par lien)',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('compresspdf', '<lien du PDF>'));
    try {
      const r = await pack.compresspdf(argText);
      await sock.sendMessage(from, { document: { url: r.url }, mimetype: 'application/pdf', fileName: r.fileName });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const pdf2jpg = {
  command: 'pdf2jpg',
  category: 'INFO',
  description: 'Convertit un PDF (donné par lien) en image(s)',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('pdf2jpg', '<lien du PDF>'));
    try {
      const urls = await pack.pdf2jpg(argText);
      for (const url of urls.slice(0, 5)) {
        await sock.sendMessage(from, { image: { url } });
      }
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const ssweb = {
  command: 'ssweb',
  category: 'INFO',
  description: "Capture d'écran d'un site web",
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('ssweb', '<lien du site>'));
    try {
      const url = await pack.ssweb(argText);
      await sock.sendMessage(from, { image: { url }, caption: argText });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const tgsticker = {
  command: 'tgsticker',
  category: 'INFO',
  description: 'Récupère un sticker Telegram (donné par lien)',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('tgsticker', '<lien du sticker Telegram>'));
    try {
      const urls = await pack.tgsticker(argText);
      for (const url of urls.slice(0, 5)) {
        await sock.sendMessage(from, { sticker: { url } });
      }
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const shorturl = {
  command: 'shorturl',
  category: 'INFO',
  description: 'Raccourcit un lien',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('shorturl', '<lien à raccourcir>'));
    try {
      const short = await pack.shorturl(argText);
      await sock.sendMessage(from, { text: buildAiCard('Lien raccourci', short) });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const ghstalk = {
  command: 'ghstalk',
  category: 'INFO',
  description: 'Infos sur un profil GitHub',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('ghstalk', "<nom d'utilisateur GitHub>"));
    try {
      const card = await pack.ghstalk(argText);
      await sock.sendMessage(from, { text: card });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const flixier = {
  command: 'flixier',
  category: 'IA',
  description: 'Pose une question à Flixier AI',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('flixier', '<question>'));
    try {
      const answer = await pack.flixier(argText);
      await sock.sendMessage(from, { text: buildAiCard('Flixier AI', answer) });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

export default [
  apk, gdrive, mediafire, webdl, web2zip, web2apk, y2mate,
  compresspdf, pdf2jpg, ssweb, tgsticker, shorturl, ghstalk, flixier,
];
