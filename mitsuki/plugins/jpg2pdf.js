// .jpg2pdf — identique à .topdf (conversion locale via pdf-lib, fiable et
// déjà testée) plutôt que l'endpoint externe /pdf/jpg-to-pdf du pack
// davidcyriltech, dont le schéma n'est pas confirmé : pour cette conversion,
// la version locale existante était de toute façon la meilleure option.
import * as local from '../commands/local.js';
import { getQuotedImageBuffer } from '../pluginHelpers.js';

export default {
  command: 'jpg2pdf',
  category: 'INFO',
  description: 'Convertit une image citée en PDF',
  handler: async ({ sock, from, msg }) => {
    const buffer = await getQuotedImageBuffer(msg, from);
    if (!buffer) { await sock.sendMessage(from, { text: '• Envoie ou cite une image avec .jpg2pdf' }); return; }
    try {
      const pdfBuffer = await local.topdf(buffer);
      await sock.sendMessage(from, { document: pdfBuffer, mimetype: 'application/pdf', fileName: 'image.pdf' });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};
