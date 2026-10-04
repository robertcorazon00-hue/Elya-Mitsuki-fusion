import { citationPool, getFromPool } from '../ai.js';
import { BOT_NAME } from '../config.js';

export default {
  command: 'citation',
  category: 'GENERAL',
  description: 'Génère une citation inspirante originale',
  handler: async ({ sock, chatId }) => {
    try {
      const q = await getFromPool(
        citationPool,
        `Invente une citation inspirante originale (pas une vraie citation existante, pas de nom d'auteur), une seule phrase courte et poétique, en français.`,
        ["La patience transforme la feuille en fleur."]
      );
      await sock.sendMessage(chatId, { text: `✨ _"${q}"_\n\n— ${BOT_NAME}` });
    } catch (e) {
      await sock.sendMessage(chatId, { text: `✨ _"La patience transforme la feuille en fleur."_\n\n— ${BOT_NAME}` });
    }
  },
};
