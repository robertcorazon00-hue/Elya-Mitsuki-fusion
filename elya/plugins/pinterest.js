import { searchPinterest } from '../apis.js';
import { PREFIX } from '../config.js';

export default {
  command: 'pinterest',
  category: 'GENERAL',
  description: 'Recherche des images sur Pinterest',
  handler: async ({ sock, chatId, args }) => {
    const query = args.slice(1).join(' ');
    if (!query) {
      await sock.sendMessage(chatId, { text: `📌 Utilise : ${PREFIX}pinterest <recherche>` });
      return;
    }
    try {
      const results = await searchPinterest(query);
      if (results.length === 0) {
        await sock.sendMessage(chatId, { text: `📌 Aucun résultat pour "${query}".` });
        return;
      }
      const picks = results.slice(0, 4);
      for (const r of picks) {
        const url = r.url || r.image || r.link || r.src;
        if (url) await sock.sendMessage(chatId, { image: { url }, caption: `📌 ${query}` });
      }
    } catch (e) {
      console.error('Erreur Pinterest:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci Pinterest, réessaie.` });
    }
  },
};
