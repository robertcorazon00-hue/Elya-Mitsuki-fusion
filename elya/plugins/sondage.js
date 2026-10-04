import { PREFIX } from '../config.js';

export default {
  command: 'sondage',
  aliases: ['poll'],
  category: 'GENERAL',
  description: 'Crée un sondage WhatsApp (ex: !sondage Question | Option 1 | Option 2)',
  handler: async ({ sock, chatId, text, cmd }) => {
    const rawArgs = text.slice(PREFIX.length + cmd.length).trim();
    const parts = rawArgs.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) {
      await sock.sendMessage(chatId, {
        text: `📊 Utilise : ${PREFIX}sondage Question | Option 1 | Option 2 | Option 3...\n\nEx: ${PREFIX}sondage On mange où ce soir ? | Pizza | Burger | Chinois`,
      });
      return;
    }
    const [question, ...options] = parts;
    if (options.length > 12) {
      await sock.sendMessage(chatId, { text: `💛 Maximum 12 options pour un sondage WhatsApp.` });
      return;
    }
    try {
      await sock.sendMessage(chatId, { poll: { name: question, values: options, selectableCount: 1 } });
    } catch (e) {
      console.error('Erreur sondage:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci pour créer le sondage, réessaie.` });
    }
  },
};
