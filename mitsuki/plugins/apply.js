import * as user from '../commands/user.js';
export default {
  command: 'apply',
  category: 'UTILISATEUR',
  description: 'Applique tes préférences enregistrées',
  handler: async ({ sock, from, sender }) => {
    await sock.sendMessage(from, { text: user.applySettings(sender) });
  },
};
