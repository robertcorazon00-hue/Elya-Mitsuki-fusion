import * as owner from '../commands/owner.js';
export default {
  command: 'setchannel',
  category: 'OWNER',
  description: 'Définit le canal WhatsApp officiel du bot',
  ownerOnly: true,
  handler: async ({ sock, from, argText }) => {
    try {
      if (!argText) { await sock.sendMessage(from, { text: '• Usage: .setchannel https://whatsapp.com/channel/xxxxx' }); return; }
      const reply = await owner.setChannel(sock, argText);
      await sock.sendMessage(from, { text: reply });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};
