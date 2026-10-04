import { blaguePool, getFromPool } from '../ai.js';
import { FALLBACK_JOKES } from '../helpers.js';

export default {
  command: 'blague',
  category: 'GENERAL',
  description: 'Raconte une blague générée par l\'IA',
  handler: async ({ sock, chatId }) => {
    try {
      const j = await getFromPool(
        blaguePool,
        `Raconte une blague courte, drôle et familiale, en français, en 1 à 2 phrases.`,
        FALLBACK_JOKES
      );
      await sock.sendMessage(chatId, { text: `😄 ${j}` });
    } catch (e) {
      const j = FALLBACK_JOKES[Math.floor(Math.random() * FALLBACK_JOKES.length)];
      await sock.sendMessage(chatId, { text: `😄 ${j}` });
    }
  },
};
