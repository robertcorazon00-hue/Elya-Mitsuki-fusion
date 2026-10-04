import { setAutoReply } from '../runtime.js';
import { BOT_NAME } from '../config.js';

export default [
  {
    command: 'elyaon',
    category: 'GENERAL',
    description: 'Fait répondre Elya à tous les messages du groupe, sans être taguée',
    handler: async ({ sock, chatId, isGroup }) => {
      if (!isGroup) {
        await sock.sendMessage(chatId, { text: `💛 Cette commande fonctionne uniquement dans les groupes.` });
        return;
      }
      await setAutoReply(chatId, true);
      await sock.sendMessage(chatId, { text: `✅ Mode *Elya répond à tout* activé dans ce groupe.\nJe répondrai à chaque message sans être taguée. 🌙` });
    },
  },
  {
    command: 'elyaoff',
    category: 'GENERAL',
    description: 'Elya ne répond plus qu\'en étant mentionnée',
    handler: async ({ sock, chatId, isGroup }) => {
      if (!isGroup) {
        await sock.sendMessage(chatId, { text: `💛 Cette commande fonctionne uniquement dans les groupes.` });
        return;
      }
      await setAutoReply(chatId, false);
      await sock.sendMessage(chatId, { text: `🔕 Mode *${BOT_NAME} répond à tout* désactivé.\nTague-moi (@${BOT_NAME}) pour que je réponde.` });
    },
  },
];
