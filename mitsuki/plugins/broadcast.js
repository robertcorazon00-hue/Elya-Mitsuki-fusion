import * as owner from '../commands/owner.js';
export default {
  command: 'broadcast',
  category: 'OWNER',
  description: 'Envoie une annonce à tous les groupes',
  ownerOnly: true,
  handler: async ({ sock, from, argText }) => {
    const count = await owner.broadcast(sock, argText);
    await sock.sendMessage(from, { text: `• Annonce envoyée à ${count} groupes.` });
  },
};
