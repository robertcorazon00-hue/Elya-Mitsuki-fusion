import * as statusCmd from '../commands/status.js';
export default {
  command: 'setautoreply',
  aliases: ['setautoreplystatus'],
  category: 'STATUT',
  description: 'Active/désactive la réponse automatique aux statuts',
  handler: async ({ sock, from, args }) => {
    const reply = statusCmd.toggleStatusSetting('autoreplystatus', args[0]);
    await sock.sendMessage(from, { text: reply });
  },
};
