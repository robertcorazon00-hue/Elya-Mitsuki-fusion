import * as local from '../commands/local.js';
import * as download from '../commands/download.js';
import * as media from '../commands/media.js';

const qrcodeCmd = {
  command: 'qrcode',
  category: 'MEDIA',
  description: "Génère un QR code à partir d'un texte ou lien",
  handler: async ({ sock, from, argText }) => {
    if (!argText) { await sock.sendMessage(from, { text: '• Utilise : .qrcode <texte ou lien>' }); return; }
    try {
      const { imageBuffer, caption } = await local.qrcode(argText);
      await sock.sendMessage(from, { image: imageBuffer, caption });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};

const wallpaper = {
  command: 'wallpaper',
  category: 'MEDIA',
  description: "Cherche un fond d'écran 4K",
  handler: async ({ sock, from, argText }) => {
    if (!argText) { await sock.sendMessage(from, { text: '• Utilise : .wallpaper <recherche>' }); return; }
    try {
      const result = await download.wallpaper(argText);
      await sock.sendMessage(from, { image: { url: result.imageUrl }, caption: result.caption });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};

const toimage = {
  command: 'toimage',
  category: 'MEDIA',
  description: 'Convertit un sticker cité en image',
  handler: async ({ sock, from, msg }) => {
    try {
      const found = await media.getQuotedMedia(msg, from, ['stickerMessage']);
      if (!found) { await sock.sendMessage(from, { text: '• Réponds à un sticker avec .toimage' }); return; }
      await sock.sendMessage(from, { image: await media.toimage(found.buffer) });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};

const tovideo = {
  command: 'tovideo',
  category: 'MEDIA',
  description: 'Convertit un sticker animé cité en vidéo',
  handler: async ({ sock, from, msg }) => {
    try {
      const found = await media.getQuotedMedia(msg, from, ['stickerMessage']);
      if (!found) { await sock.sendMessage(from, { text: '• Réponds à un sticker animé avec .tovideo' }); return; }
      const mp4 = await media.tovideo(found.buffer);
      await sock.sendMessage(from, { video: mp4, mimetype: 'video/mp4', gifPlayback: true });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};

const tourl = {
  command: 'tourl',
  category: 'MEDIA',
  description: 'Héberge un média cité et renvoie un lien public',
  handler: async ({ sock, from, msg }) => {
    try {
      const found = await media.getQuotedMedia(msg, from);
      if (!found) { await sock.sendMessage(from, { text: '• Réponds à une image, vidéo, audio, sticker ou document avec .tourl' }); return; }
      const link = await media.tourl(found.buffer, found.media.mimetype, found.media.fileName);
      await sock.sendMessage(from, { text: `🌍 ${link}\n\n⚠️ Ce lien est public.` });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};

export default [qrcodeCmd, wallpaper, toimage, tovideo, tourl];
