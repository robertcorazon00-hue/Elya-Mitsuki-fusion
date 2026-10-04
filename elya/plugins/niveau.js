import { userCountsStore } from '../store.js';
import { getLevelTitle, LEVELS } from '../helpers.js';

export default {
  command: 'niveau',
  aliases: ['level', 'rang'],
  category: 'GENERAL',
  description: 'Affiche le niveau d\'activité (le tien ou celui d\'un membre mentionné)',
  handler: async ({ sock, chatId, sender, senderName, isGroup, msg }) => {
    if (!isGroup) {
      await sock.sendMessage(chatId, { text: `💛 Cette commande fonctionne uniquement dans les groupes.` });
      return;
    }
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const targetId = mentioned || sender;
    const targetName = mentioned ? `@${mentioned.split('@')[0]}` : senderName;
    const u = userCountsStore[chatId]?.[targetId];
    const count = u?.count || 0;
    const title = getLevelTitle(count);
    const nextLevel = LEVELS.find(l => l.min > count);
    const nextText = nextLevel ? `\nProchain niveau : *${nextLevel.title}* à ${nextLevel.min} messages (encore ${nextLevel.min - count})` : `\n🏆 Niveau maximum atteint !`;
    await sock.sendMessage(chatId, {
      text: `📊 *Niveau de ${targetName}*\n\nMessages : ${count}\nTitre actuel : *${title}*${nextText}`,
      mentions: mentioned ? [mentioned] : []
    });
  },
};
