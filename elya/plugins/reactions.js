import { reactionsStore, saveData } from '../store.js';
import { PREFIX } from '../config.js';

// !reactions on|off — Elya réagit parfois (~1 message sur 4) avec un emoji
// doux aux messages de conversation dans ce chat, pour donner une présence
// plus vivante (surtout utile en groupe). N'affecte pas les commandes "!...".
export default {
  command: 'reactions',
  aliases: ['reaction'],
  category: 'GENERAL',
  description: 'Active/désactive les réactions emoji automatiques d\'Elya dans ce chat',
  handler: async ({ sock, chatId, args }) => {
    const sub = args[1]?.toLowerCase();
    if (sub === 'on') {
      reactionsStore[chatId] = { enabled: true };
      await saveData('reactions', reactionsStore);
      await sock.sendMessage(chatId, { text: `✨ Réactions activées ici, je réagirai de temps en temps.` });
    } else if (sub === 'off') {
      delete reactionsStore[chatId];
      await saveData('reactions', reactionsStore);
      await sock.sendMessage(chatId, { text: `Réactions désactivées ici.` });
    } else {
      const on = !!reactionsStore[chatId]?.enabled;
      await sock.sendMessage(chatId, {
        text: `✨ Réactions automatiques : ${on ? '✅ Activées' : '🔕 Désactivées'}\n\nUtilise : ${PREFIX}reactions on | off`,
      });
    }
  },
};
