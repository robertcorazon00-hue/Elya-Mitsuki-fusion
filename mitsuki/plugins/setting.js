import * as user from '../commands/user.js';
export default {
  command: 'setting',
  category: 'UTILISATEUR',
  description: 'Affiche tes préférences personnelles',
  handler: async ({ sock, from, sender }) => {
    await sock.sendMessage(from, { text: user.showSettings(sender) });
  },
};
