import { searchNews } from '../apis.js';

export default {
  command: 'actu',
  aliases: ['news'],
  category: 'GENERAL',
  description: 'Affiche les dernières actualités (ex: !actu sport)',
  handler: async ({ sock, chatId, args }) => {
    const query = args.slice(1).join(' ');
    try {
      const results = await searchNews(query || '');
      if (!results || results.length === 0) {
        await sock.sendMessage(chatId, { text: `📰 Aucune actualité trouvée.` });
        return;
      }
      const lines = results.slice(0, 5).map((n, i) => `${i + 1}. *${n.title}*\n${n.link || ''}`).join('\n\n');
      await sock.sendMessage(chatId, { text: `📰 *Actualités${query ? ' — ' + query : ''} :*\n\n${lines}` });
    } catch (e) {
      console.error('Erreur news:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci pour récupérer les actualités.` });
    }
  },
};
