import { trueFalseState } from '../store.js';
import { PREFIX } from '../config.js';

export default {
  command: 'vrai',
  aliases: ['faux'],
  category: 'FUN',
  description: 'Répond à une question Vrai/Faux lancée par .vraifaux',
  handler: async ({ sock, chatId, cmd }) => {
    const state = trueFalseState[chatId];
    if (!state) {
      await sock.sendMessage(chatId, { text: `💛 Lance d'abord une question avec ${PREFIX}vraifaux !` });
      return;
    }
    const guess = cmd.toUpperCase();
    const correct = guess === state.answer;
    delete trueFalseState[chatId];
    await sock.sendMessage(chatId, {
      text: `${correct ? '✅ Bonne réponse' : '❌ Raté'} ! La réponse était *${state.answer}*.\n\n_"${state.statement}"_`
    });
  },
};
