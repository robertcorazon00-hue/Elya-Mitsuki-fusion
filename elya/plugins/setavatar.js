import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { PREFIX } from '../config.js';

export default {
  command: 'setavatar',
  aliases: ['photodeprofil'],
  category: 'GENERAL',
  description: 'Change la photo de profil du bot',
  handler: async ({ sock, chatId, msg }) => {
    const quotedInfo = msg.message.extendedTextMessage?.contextInfo;
    const directImage = msg.message.imageMessage;
    if (!directImage && (!quotedInfo || !quotedInfo.quotedMessage?.imageMessage)) {
      await sock.sendMessage(chatId, { text: `📸 Envoie une image avec ${PREFIX}setavatar en légende, ou réponds à une image avec ${PREFIX}setavatar, pour changer ma photo de profil.` });
      return;
    }
    try {
      await sock.sendMessage(chatId, { text: `📸 Mise à jour de ma photo de profil...` });
      let buffer;
      if (directImage) {
        buffer = await downloadMediaMessage(msg, 'buffer', {});
      } else {
        const fakeMsg = {
          key: { remoteJid: chatId, id: quotedInfo.stanzaId, participant: quotedInfo.participant },
          message: quotedInfo.quotedMessage,
        };
        buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
      }
      await sock.updateProfilePicture(sock.user.id, buffer);
      await sock.sendMessage(chatId, { text: `📸 Photo de profil mise à jour ! 💛` });
    } catch (e) {
      console.error('Erreur setavatar:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci pour changer la photo, réessaie.` });
    }
  },
};
