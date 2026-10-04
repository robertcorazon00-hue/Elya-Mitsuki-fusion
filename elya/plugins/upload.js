import axios from 'axios';
import { PREFIX } from '../config.js';

export default {
  command: 'upload',
  category: 'GENERAL',
  description: 'Convertit un lien en lien temporaire via TmpLink',
  handler: async ({ sock, chatId, args }) => {
    const targetUrl = args[1];
    if (!targetUrl) {
      await sock.sendMessage(chatId, { text: `📎 Utilise : ${PREFIX}upload <url>\nExemple : ${PREFIX}upload https://exemple.com/photo.jpg\n\nJe convertis ce lien en lien temporaire via TmpLink.` });
      return;
    }
    try {
      await sock.sendMessage(chatId, { text: `📎 Envoi vers TmpLink...` });
      const response = await axios.get('https://api.cod3uchiha.com/tools/tmplink', {
        params: { url: targetUrl },
        timeout: 20000,
      });
      const data = response.data;
      const resultUrl =
        (typeof data === 'string' && data.startsWith('http') && data) ||
        data?.url || data?.link || data?.result?.url || data?.data?.url ||
        null;
      if (resultUrl) {
        await sock.sendMessage(chatId, { text: `✅ Lien temporaire :\n${resultUrl}` });
      } else {
        await sock.sendMessage(chatId, { text: `⚠️ Réponse inattendue de TmpLink :\n${JSON.stringify(data).slice(0, 500)}` });
      }
    } catch (e) {
      console.error('Erreur upload TmpLink:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci avec TmpLink (${e.response?.status || e.message}). Réessaie dans un instant.` });
    }
  },
};
