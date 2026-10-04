import * as owner from '../commands/owner.js';
export default {
  command: 'ban',
  category: 'OWNER',
  description: 'Bannit un utilisateur du bot (réponds à son message)',
  ownerOnly: true, // pluginLoader bloque automatiquement si !isOwner, pas besoin de le vérifier ici
  handler: async ({ sock, from, msg }) => {
    const target = msg.message.extendedTextMessage?.contextInfo?.participant;
    if (!target) {
      await sock.sendMessage(from, { text: '• Réponds au message de la personne à bannir.' });
      return;
    }
    await sock.sendMessage(from, { text: owner.ban(target) });
  },
};
