import * as local from '../commands/local.js';
export default {
  command: 'rate',
  category: 'FUN',
  description: 'Donne une note aléatoire sur 10 à un mot/nom',
  handler: async ({ sock, from, argText }) => {
    await sock.sendMessage(from, { text: local.rate(argText) });
  },
};
