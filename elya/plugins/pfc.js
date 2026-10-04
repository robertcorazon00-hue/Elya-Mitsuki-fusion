import { playPFC } from '../helpers.js';
import { PREFIX } from '../config.js';

export default {
  command: 'pfc',
  category: 'FUN',
  description: 'Pierre-Feuille-Ciseaux contre Elya',
  handler: async ({ sock, chatId, args }) => {
    const choice = args[1]?.toLowerCase();
    if (!['pierre', 'feuille', 'ciseaux'].includes(choice)) {
      await sock.sendMessage(chatId, { text: `✂️ Utilise : ${PREFIX}pfc pierre | feuille | ciseaux` });
      return;
    }
    const { bot, result } = playPFC(choice);
    const emoji = result === 'gagné' ? '🎉' : result === 'perdu' ? '😅' : '🤝';
    await sock.sendMessage(chatId, {
      text: `✂️ *Pierre-Feuille-Ciseaux*\n\nToi : ${choice}\nMoi : ${bot}\n\n${emoji} Tu as *${result}* !`
    });
  },
};
