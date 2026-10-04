import { personalityStore, saveData } from '../store.js';
import { PERSONALITIES } from '../helpers.js';
import { PREFIX } from '../config.js';

export default {
  command: 'personnalite',
  aliases: ['personnalité'],
  category: 'GENERAL',
  description: 'Change le ton de conversation d\'Elya pour ce chat',
  handler: async ({ sock, chatId, args }) => {
    const sub = args[1]?.toLowerCase();
    if (!sub) {
      const current = personalityStore[chatId] || 'normale (par défaut)';
      await sock.sendMessage(chatId, {
        text: `🎭 *Personnalité actuelle :* ${current}\n\n` +
          `Modes disponibles :\n` +
          `• ${PREFIX}personnalite prof — pédagogue\n` +
          `• ${PREFIX}personnalite psy — à l'écoute\n` +
          `• ${PREFIX}personnalite dev — technique\n` +
          `• ${PREFIX}personnalite drole — humoristique\n` +
          `• ${PREFIX}personnalite mamie — conseils de grand-mère\n` +
          `• ${PREFIX}personnalite normal — fille normale, naturelle et bien éduquée\n` +
          `• ${PREFIX}personnalite copine — joue la copine de Robert (léger, jamais explicite)\n` +
          `• ${PREFIX}personnalite reset — revenir à la normale`
      });
    } else if (sub === 'reset') {
      delete personalityStore[chatId];
      await saveData('personality', personalityStore);
      await sock.sendMessage(chatId, { text: `🌙 Je reprends ma personnalité par défaut.` });
    } else if (PERSONALITIES[sub]) {
      personalityStore[chatId] = sub;
      await saveData('personality', personalityStore);
      await sock.sendMessage(chatId, { text: `🎭 Mode *${sub}* activé ! Je vais discuter autrement maintenant 💛` });
    } else {
      await sock.sendMessage(chatId, { text: `💛 Mode inconnu. Essaie : prof, psy, dev, drole, mamie, copine ou reset.` });
    }
  },
};
