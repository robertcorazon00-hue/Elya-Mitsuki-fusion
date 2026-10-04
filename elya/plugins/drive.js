import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { uploadToDrive, isDriveConfigured } from '../drive.js';
import { PREFIX } from '../config.js';

export default {
  command: 'drive',
  category: 'GENERAL',
  description: 'Envoie un média cité vers Google Drive',
  handler: async ({ sock, chatId, msg }) => {
    const quotedInfo = msg.message.extendedTextMessage?.contextInfo;
    if (!quotedInfo || !quotedInfo.quotedMessage) {
      await sock.sendMessage(chatId, { text: `☁️ Réponds à un fichier/image/vidéo avec ${PREFIX}drive pour l'envoyer sur Google Drive.` });
      return;
    }
    if (!isDriveConfigured()) {
      await sock.sendMessage(chatId, { text: `☁️ L'envoi vers Google Drive n'est pas configuré (variable GOOGLE_SERVICE_ACCOUNT_BASE64 manquante dans .env).` });
      return;
    }
    try {
      await sock.sendMessage(chatId, { text: `☁️ Envoi vers Google Drive en cours...` });
      const fakeMsg = {
        key: { remoteJid: chatId, id: quotedInfo.stanzaId, participant: quotedInfo.participant },
        message: quotedInfo.quotedMessage,
      };
      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
      const qm = quotedInfo.quotedMessage;
      const mediaType = qm.imageMessage ? 'image' : qm.videoMessage ? 'video' : qm.documentMessage ? 'document' : qm.audioMessage ? 'audio' : 'fichier';
      const mimeType = (qm.imageMessage || qm.videoMessage || qm.documentMessage || qm.audioMessage)?.mimetype || 'application/octet-stream';
      const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin';
      const filename = (qm.documentMessage?.fileName) || `${mediaType}-${Date.now()}.${ext}`;
      const link = await uploadToDrive(buffer, filename, mimeType);
      await sock.sendMessage(chatId, { text: `☁️ Fichier envoyé sur Google Drive !\n\n🔗 ${link}` });
    } catch (e) {
      console.error('Erreur Drive:', e.message);
      if (e.code === 'not_configured') {
        await sock.sendMessage(chatId, { text: `☁️ L'envoi vers Google Drive n'est pas configuré.` });
      } else {
        await sock.sendMessage(chatId, { text: `💛 Petit souci pour envoyer le fichier, réessaie.` });
      }
    }
  },
};
