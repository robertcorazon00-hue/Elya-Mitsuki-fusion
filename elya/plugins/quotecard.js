import axios from 'axios';
import { PREFIX } from '../config.js';

// Extrait le texte d'un message cité, quel que soit son type (texte simple,
// texte étendu, légende d'image/vidéo).
function extractQuotedText(messageContent) {
  if (!messageContent) return '';
  return messageContent.conversation
    || messageContent.extendedTextMessage?.text
    || messageContent.imageMessage?.caption
    || messageContent.videoMessage?.caption
    || '';
}

const DEFAULT_AVATAR = 'https://i.imgur.com/0uE2HZo.png';

export default {
  command: 'quotecard',
  aliases: ['carteciter', 'quotely'],
  category: 'GENERAL',
  description: 'Transforme un message (en réponse à celui-ci) en jolie carte de citation façon Telegram',
  handler: async ({ sock, chatId, msg }) => {
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMessage = quotedInfo?.quotedMessage;
    if (!quotedMessage) {
      await sock.sendMessage(chatId, { text: `🖼️ Réponds à un message (texte) avec ${PREFIX}quotecard pour en faire une carte de citation.` });
      return;
    }
    const text = extractQuotedText(quotedMessage);
    if (!text) {
      await sock.sendMessage(chatId, { text: `🖼️ Ce message n'a pas de texte à mettre en citation.` });
      return;
    }

    const participant = quotedInfo.participant || chatId;
    const name = participant.split('@')[0];
    let avatarUrl = DEFAULT_AVATAR;
    try {
      avatarUrl = await sock.profilePictureUrl(participant, 'image');
    } catch (_) {
      // Photo de profil privée ou absente -> on garde l'avatar par défaut.
    }

    try {
      const { data } = await axios.post(
        'https://bot.lyo.su/quote/generate',
        {
          type: 'quote',
          format: 'png',
          backgroundColor: '#1b1b1b',
          width: 512,
          height: 768,
          scale: 2,
          messages: [{
            entities: [],
            avatar: true,
            from: { id: 1, name, photo: { url: avatarUrl } },
            text,
            replyMessage: {},
          }],
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
      );
      const buffer = Buffer.from(data.result.image, 'base64');
      await sock.sendMessage(chatId, { image: buffer, caption: `🖼️ Citation de @${name}`, mentions: [participant] });
    } catch (e) {
      console.error('Erreur quotecard:', e.message);
      await sock.sendMessage(chatId, { text: `🖼️ Petit souci pour générer la carte, réessaie dans un instant.` });
    }
  },
};
