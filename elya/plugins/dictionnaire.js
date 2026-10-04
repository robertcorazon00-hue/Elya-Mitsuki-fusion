import { lookupDictionary } from '../apis.js';
import { PREFIX } from '../config.js';

export default {
  command: 'dictionnaire',
  aliases: ['dico'],
  category: 'GENERAL',
  description: 'Cherche la définition d\'un mot',
  handler: async ({ sock, chatId, args }) => {
    const word = args.slice(1).join(' ');
    if (!word) {
      await sock.sendMessage(chatId, { text: `📖 Utilise : ${PREFIX}dictionnaire <mot>` });
      return;
    }
    try {
      const data = await lookupDictionary(word);
      const def = data?.definition || data?.result || JSON.stringify(data).slice(0, 500);
      await sock.sendMessage(chatId, { text: `📖 *${word}*\n\n${def}` });
    } catch (e) {
      await sock.sendMessage(chatId, { text: `💛 Mot introuvable ou souci de connexion.` });
    }
  },
};
