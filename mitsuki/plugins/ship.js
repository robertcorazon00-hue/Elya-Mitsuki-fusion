import * as local from '../commands/local.js';
export default {
  command: 'ship',
  category: 'FUN',
  description: 'Calcule un pourcentage de compatibilité entre deux noms',
  handler: async ({ sock, from, args }) => {
    const [a, b] = args;
    await sock.sendMessage(from, { text: local.ship(a, b) });
  },
};
