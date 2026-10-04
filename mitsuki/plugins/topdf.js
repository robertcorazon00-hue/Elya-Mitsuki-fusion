import * as local from '../commands/local.js';
import { getQuotedImageBuffer } from '../pluginHelpers.js';
export default {
  command: 'topdf',
  category: 'INFO',
  description: 'Convertit une image citée en PDF',
  handler: async ({ sock, from, msg }) => {
    const buffer = await getQuotedImageBuffer(msg, from);
    if (!buffer) { await sock.sendMessage(from, { text: '• Envoie ou cite une image avec .topdf' }); return; }
    try {
      const pdfBuffer = await local.topdf(buffer);
      await sock.sendMessage(from, { document: pdfBuffer, mimetype: 'application/pdf', fileName: 'image.pdf' });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};
