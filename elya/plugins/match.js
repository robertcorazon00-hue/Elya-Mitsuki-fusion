import { computeMatch } from '../helpers.js';
import { PREFIX } from '../config.js';

export default {
  command: 'match',
  category: 'FUN',
  description: 'Calcule un pourcentage de compatibilité amoureuse entre deux personnes mentionnées',
  handler: async ({ sock, chatId, msg }) => {
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length < 2) {
      await sock.sendMessage(chatId, { text: `💕 Utilise : ${PREFIX}match @personne1 @personne2` });
      return;
    }
    const percent = computeMatch(mentioned[0], mentioned[1]);
    const comment = percent > 80 ? "C'est écrit dans les étoiles ✨" : percent > 50 ? "Il y a du potentiel 😏" : percent > 20 ? "Bon... on peut toujours progresser 😅" : "Aïe, restez amis 😂";
    await sock.sendMessage(chatId, {
      text: `💕 *Compatibilité amoureuse*\n\n@${mentioned[0].split('@')[0]} + @${mentioned[1].split('@')[0]} = *${percent}%*\n\n${comment}`,
      mentions: mentioned.slice(0, 2)
    });
  },
};
