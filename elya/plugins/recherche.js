import { tavilySearch } from '../apis.js';
import { PREFIX } from '../config.js';

export default {
  command: 'recherche',
  category: 'GENERAL',
  description: 'Recherche web (via Tavily)',
  handler: async ({ sock, chatId, args }) => {
    const query = args.slice(1).join(' ');
    if (!query) {
      await sock.sendMessage(chatId, { text: `🔎 Utilise : ${PREFIX}recherche <sujet>` });
      return;
    }
    try {
      const data = await tavilySearch(query);
      const results = data?.results || [];
      if (results.length === 0 && !data?.answer) {
        await sock.sendMessage(chatId, { text: `🔎 Aucun résultat pour "${query}".` });
        return;
      }
      const answerPart = data.answer ? `💡 *Réponse rapide :*\n${data.answer}\n\n` : '';
      const lines = results.slice(0, 5).map((r, i) => `${i + 1}. *${r.title}*\n${r.url}`).join('\n\n');
      await sock.sendMessage(chatId, { text: `🔎 *Résultats pour "${query}" :*\n\n${answerPart}${lines}` });
    } catch (e) {
      console.error('Erreur recherche Tavily:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci de recherche, réessaie.` });
    }
  },
};
