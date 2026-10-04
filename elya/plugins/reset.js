import { historyStore, memoryStore, strikesStore, saveData } from '../store.js';

export default {
  command: 'reset',
  category: 'GENERAL',
  description: 'Efface la mémoire, l\'historique et les strikes de cette conversation',
  handler: async ({ sock, chatId, senderName }) => {
    delete historyStore[chatId];
    delete memoryStore[chatId];
    delete strikesStore[chatId];
    await saveData('history', historyStore);
    await saveData('memory', memoryStore);
    await saveData('strikes', strikesStore);
    await sock.sendMessage(chatId, { text: `🌙 J'ai tout oublié. On repart à zéro, ${senderName} !` });
  },
};
