import * as local from '../commands/local.js';
import { getQuotedImageBuffer } from '../pluginHelpers.js';
export default {
  command: 'sticker',
  category: 'FUN',
  description: 'Convertit une image citée en sticker',
  handler: async ({ sock, from, msg }) => {
    const buffer = await getQuotedImageBuffer(msg, from);
    if (!buffer) { await sock.sendMessage(from, { text: '• Réponds à une image avec *.sticker* pour la convertir.' }); return; }
    try {
      const sharpBuffer = await local.sticker(buffer);
      await sock.sendMessage(from, { sticker: sharpBuffer });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};
