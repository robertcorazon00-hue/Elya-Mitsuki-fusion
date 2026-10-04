// plugins/waifu.js — était un fichier vide (0 octet) dans le zip d'origine :
// .waifu ne faisait donc rien. commands/download.js a pourtant déjà la
// fonction prête (API.waifuPics).
import * as download from '../commands/download.js';
export default {
  command: 'waifu',
  category: 'MEDIA',
  description: 'Envoie une image waifu aléatoire',
  handler: async ({ sock, from }) => {
    try {
      const result = await download.waifu();
      await sock.sendMessage(from, { image: { url: result.imageUrl }, caption: result.caption });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};
