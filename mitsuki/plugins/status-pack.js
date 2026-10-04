import * as statusCmd from '../commands/status.js';

const statusemoji = {
  command: 'statusemoji',
  category: 'STATUT',
  description: 'Définit les emojis utilisés pour réagir aux statuts',
  handler: async ({ sock, from, args }) => {
    if (!args.length) { await sock.sendMessage(from, { text: '• Utilise : .statusemoji 😀 🔥 ❤️' }); return; }
    await sock.sendMessage(from, { text: statusCmd.setStatusEmojis(args) });
  },
};

const autolike = {
  command: 'autolike',
  category: 'STATUT',
  description: 'Active/désactive la réaction automatique aux statuts',
  handler: async ({ sock, from, args }) => {
    await sock.sendMessage(from, { text: statusCmd.toggleStatusSetting('autolikestatus', args[0]) });
  },
};

const autoreadstatus = {
  command: 'autoreadstatus',
  category: 'STATUT',
  description: 'Active/désactive la lecture automatique des statuts',
  handler: async ({ sock, from, args }) => {
    await sock.sendMessage(from, { text: statusCmd.toggleStatusSetting('autoreadstatus', args[0]) });
  },
};

export default [statusemoji, autolike, autoreadstatus];
