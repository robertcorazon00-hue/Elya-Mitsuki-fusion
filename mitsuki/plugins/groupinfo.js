import * as group from '../commands/group.js';
export default {
  command: 'groupinfo',
  category: 'GROUPE',
  description: 'Affiche les infos du groupe',
  groupOnly: true,
  handler: async ({ sock, from }) => {
    const gInfo = await group.groupInfo(sock, from);
    await sock.sendMessage(from, {
      text: `• *${gInfo.subject}*\n👥 ${gInfo.participants} membres\n📝 ${gInfo.description}`,
    });
  },
};
