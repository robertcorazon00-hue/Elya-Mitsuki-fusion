// plugins/download-pack.js — Commandes TELECHARGEMENT qui n'avaient pas de
// plugin alors que commands/download.js avait déjà toute la logique prête
// (fb, ig, song, ytmp3, ytmp4, mediafire, generic). Seul .tiktok/.tt et
// .wallpaper/.waifu avaient déjà leur branchement.
import * as download from '../commands/download.js';

function usage(cmd, arg) {
  return { text: `• Utilise : .${cmd} ${arg}` };
}

async function sendGenericResult(sock, from, result) {
  if (result.type === 'image' || result.imageUrl) {
    await sock.sendMessage(from, { image: { url: result.imageUrl || result.mediaUrl }, caption: result.caption });
  } else {
    await sock.sendMessage(from, { video: { url: result.videoUrl || result.mediaUrl }, caption: result.caption });
  }
}

const downloadCmd = {
  command: 'download',
  category: 'TELECHARGEMENT',
  description: 'Télécharge automatiquement (TikTok, Instagram, Facebook, YouTube)',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('download', '<lien>'));
    try {
      const result = await download.generic(argText);
      await sendGenericResult(sock, from, result);
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

// .video et .youtube : même routage automatique que .download (voir le
// commentaire de download.generic dans commands/download.js).
const video = { ...downloadCmd, command: 'video', description: 'Alias de .download' };
const youtube = { ...downloadCmd, command: 'youtube', description: 'Alias de .download (liens YouTube)' };

const fb = {
  command: 'fb',
  category: 'TELECHARGEMENT',
  description: 'Télécharge une vidéo Facebook',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('fb', '<lien Facebook>'));
    try {
      const result = await download.facebook(argText);
      await sock.sendMessage(from, { video: { url: result.mediaUrl }, caption: result.caption });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const ig = {
  command: 'ig',
  category: 'TELECHARGEMENT',
  description: 'Télécharge un contenu Instagram',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('ig', '<lien Instagram>'));
    try {
      const result = await download.instagram(argText);
      // Simplification : envoyé en vidéo par défaut (Reels majoritaires) —
      // à ajuster si le lien pointe vers une simple photo.
      await sock.sendMessage(from, { video: { url: result.mediaUrl }, caption: result.caption });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const song = {
  command: 'song',
  category: 'TELECHARGEMENT',
  description: 'Recherche et télécharge un titre (audio)',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('song', '<nom du titre>'));
    try {
      const result = await download.song(argText);
      await sock.sendMessage(from, { audio: { url: result.audioUrl }, mimetype: 'audio/mpeg' });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const ytmp3 = {
  command: 'ytmp3',
  category: 'TELECHARGEMENT',
  description: 'Télécharge l\'audio d\'une vidéo YouTube',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('ytmp3', '<lien YouTube>'));
    try {
      const result = await download.ytmp3(argText);
      await sock.sendMessage(from, { audio: { url: result.audioUrl }, mimetype: 'audio/mpeg' });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const ytmp4 = {
  command: 'ytmp4',
  category: 'TELECHARGEMENT',
  description: 'Télécharge une vidéo YouTube',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('ytmp4', '<lien YouTube>'));
    try {
      const result = await download.ytmp4(argText);
      await sock.sendMessage(from, { video: { url: result.videoUrl }, caption: result.caption });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

const mediafire2 = {
  command: 'mediafire2',
  category: 'TELECHARGEMENT',
  description: 'Télécharge un fichier Mediafire (extraction directe, sans clé API)',
  handler: async ({ sock, from, argText }) => {
    if (!argText) return sock.sendMessage(from, usage('mediafire2', '<lien Mediafire>'));
    try {
      const result = await download.mediafire(argText);
      await sock.sendMessage(from, { document: { url: result.mediaUrl }, fileName: 'fichier', caption: result.caption });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

export default [downloadCmd, video, youtube, fb, ig, song, ytmp3, ytmp4, mediafire2];
