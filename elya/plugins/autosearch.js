import { autoSearchStore, saveData, isAutoSearchEnabled } from '../store.js';
import { PREFIX } from '../config.js';

export default {
  command: 'autosearch',
  aliases: ['recherchauto'],
  category: 'GENERAL',
  description: 'Active/désactive la recherche web automatique',
  handler: async ({ sock, chatId, args }) => {
    const sub = args[1]?.toLowerCase();
    if (sub === 'on') {
      autoSearchStore[chatId] = { enabled: true };
      await saveData('autoSearch', autoSearchStore);
      await sock.sendMessage(chatId, { text: `🔎 Recherche web automatique *activée*.\n\nJe lancerai une recherche moi-même quand j'en aurai besoin pour répondre correctement (actualités, prix, faits récents...).` });
    } else if (sub === 'off') {
      autoSearchStore[chatId] = { enabled: false };
      await saveData('autoSearch', autoSearchStore);
      await sock.sendMessage(chatId, { text: `🔕 Recherche web automatique *désactivée*.\n\nTu peux toujours utiliser ${PREFIX}recherche <sujet> manuellement.` });
    } else {
      const on = isAutoSearchEnabled(chatId);
      await sock.sendMessage(chatId, { text: `🔎 Recherche web automatique : ${on ? '✅ Activée' : '🔕 Désactivée'}\n\nUtilise : ${PREFIX}autosearch on | off` });
    }
  },
};
