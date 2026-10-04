import * as group from '../commands/group.js';
import { requireGroupAdmin } from '../pluginHelpers.js';
export default {
  command: 'kickall',
  category: 'GROUPE',
  description: 'Expulse tous les membres non-admins du groupe',
  groupOnly: true,
  handler: async (ctx) => {
    const { sock, from } = ctx;
    if (!(await requireGroupAdmin(ctx))) return;
    if (!(await group.isBotAdmin(sock, from))) {
      await sock.sendMessage(from, { text: "• Je dois être admin du groupe pour faire ça." });
      return;
    }
    try {
      await sock.sendMessage(from, { text: '• Expulsion des membres non-admins en cours...' });
      const n = await group.kickAll(sock, from);
      await sock.sendMessage(from, { text: `✅ ${n} membre(s) expulsé(s).` });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${group.friendlyGroupError(err)}` });
    }
  },
};
