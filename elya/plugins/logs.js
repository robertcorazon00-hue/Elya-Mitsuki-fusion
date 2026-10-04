import { errorLog } from '../runtime.js';

export default {
  command: 'logs',
  category: 'GENERAL',
  description: 'Affiche les dernières erreurs enregistrées côté serveur',
  handler: async ({ sock, chatId, args }) => {
    const n = parseInt(args[1], 10) || 10;
    const recent = errorLog.slice(-n);
    if (recent.length === 0) {
      await sock.sendMessage(chatId, { text: `📋 Aucune erreur enregistrée pour l'instant, tout va bien 🌙` });
      return;
    }
    const text = recent.map((e) => {
      const time = new Date(e.time).toLocaleTimeString('fr-FR');
      return `[${time}] ${e.message.slice(0, 200)}`;
    }).join('\n\n');
    await sock.sendMessage(chatId, { text: `📋 *${recent.length} dernière(s) erreur(s) :*\n\n${text}` });
  },
};
