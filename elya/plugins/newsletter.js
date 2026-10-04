export default {
  command: 'newsletter',
  category: 'GENERAL',
  description: 'Affiche le JID de la chaîne WhatsApp actuelle',
  handler: async ({ sock, chatId }) => {
    if (!chatId.endsWith('@newsletter')) {
      await sock.sendMessage(chatId, { text: '• Tape cette commande *directement dans une chaîne WhatsApp* pour récupérer son JID.' });
      return;
    }
    await sock.sendMessage(chatId, { text: `🆔 JID de cette chaîne :\n${chatId}` });
  },
};
