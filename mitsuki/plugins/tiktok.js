import * as download from '../commands/download.js';
export default {
  command: 'tiktok',
  aliases: ['tt'],
  category: 'TELECHARGEMENT',
  description: 'Télécharge une vidéo TikTok sans watermark',
  handler: async ({ sock, from, argText }) => {
    const result = await download.tiktok(argText);
    await sock.sendMessage(from, { video: { url: result.videoUrl }, caption: result.caption });
  },
};
