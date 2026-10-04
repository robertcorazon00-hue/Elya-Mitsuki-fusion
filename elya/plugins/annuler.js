import * as channelPosts from '../../elya-channel-posts.js';

export default {
  command: 'annuler',
  category: 'GENERAL',
  description: 'Annule la configuration de projet/programmation en cours',
  handler: async ({ sock, chatId }) => {
    if (channelPosts.getState(chatId)) {
      channelPosts.clearState(chatId);
      await sock.sendMessage(chatId, { text: '• Configuration annulée.' });
    } else {
      await sock.sendMessage(chatId, { text: '• Rien à annuler.' });
    }
  },
};
