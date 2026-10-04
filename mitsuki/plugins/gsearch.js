import * as search from '../commands/search.js';
import { buildAiCard } from '../card.js';

export default {
  command: 'gsearch',
  category: 'INFO',
  description: 'Recherche Google',
  handler: async ({ sock, from, argText }) => {
    try {
      const text = await search.googleSearch(argText);
      await sock.sendMessage(from, { text: buildAiCard('Recherche Google', text) });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ ${e.message}` });
    }
  },
};
