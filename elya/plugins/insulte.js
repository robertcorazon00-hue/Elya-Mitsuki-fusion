import { GENTLE_INSULTS } from '../helpers.js';

export default {
  command: 'insulte',
  category: 'FUN',
  description: 'Insulte amicale et inoffensive (soi-même ou une personne mentionnée)',
  handler: async ({ sock, chatId, senderName, msg }) => {
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0] ? `@${mentioned[0].split('@')[0]}` : senderName;
    const insult = GENTLE_INSULTS[Math.floor(Math.random() * GENTLE_INSULTS.length)];
    await sock.sendMessage(chatId, {
      text: `😹 ${target}, ${insult} !`,
      mentions: mentioned[0] ? [mentioned[0]] : []
    });
  },
};
