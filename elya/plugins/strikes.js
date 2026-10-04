import { strikesStore } from '../store.js';

export default {
  command: 'strikes',
  category: 'GENERAL',
  description: 'Affiche les strikes en cours dans cette conversation',
  handler: async ({ sock, chatId }) => {
    const strikes = strikesStore[chatId] || {};
    const entries = Object.entries(strikes);
    if (entries.length === 0) {
      await sock.sendMessage(chatId, { text: `✅ Aucun strike enregistré.` });
    } else {
      const lines = entries.map(([uid, count]) => `• ${uid.split('@')[0]} : ${count}/3`).join('\n');
      await sock.sendMessage(chatId, { text: `⚠️ *Strikes :*\n\n${lines}` });
    }
  },
};
