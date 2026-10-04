// plugins/vv.js — .vv : téléchargement d'un média "vue unique" (view once).
// Réponds à un message vue unique avec .vv : le média est récupéré et renvoyé
// en média normal. Réservé au propriétaire du bot, et renvoyé dans son chat
// privé (comme autosave) plutôt que dans le groupe, pour ne pas republier par
// accident un média que son expéditeur croyait éphémère.
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const MEDIA_TYPES = ['imageMessage', 'videoMessage', 'audioMessage'];

// Le message cité peut être enveloppé (viewOnceMessage / V2 / V2Extension) ou déjà
// "déballé" avec viewOnce: true selon la version de WhatsApp/Baileys.
function unwrapViewOnce(quoted) {
  if (!quoted) return null;
  const inner =
    quoted.viewOnceMessageV2?.message ||
    quoted.viewOnceMessageV2Extension?.message ||
    quoted.viewOnceMessage?.message ||
    quoted;
  const type = MEDIA_TYPES.find((t) => inner[t]);
  if (!type) return null;
  const isViewOnce = inner !== quoted || inner[type].viewOnce === true;
  return isViewOnce ? { inner, type } : null;
}

export default {
  command: 'vv',
  category: 'TELECHARGEMENT',
  description: 'Récupère un média "vue unique" (réponds au message)',
  ownerOnly: true,
  handler: async ({ sock, from, msg }) => {
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const found = unwrapViewOnce(contextInfo?.quotedMessage);
    if (!found) {
      await sock.sendMessage(from, { text: '• Réponds à un message "vue unique" (photo, vidéo ou vocal) avec .vv' });
      return;
    }

    try {
      const buffer = await downloadMediaMessage(
        {
          key: { remoteJid: from, id: contextInfo.stanzaId, participant: contextInfo.participant },
          message: found.inner,
        },
        'buffer',
        {}
      );
      const media = found.inner[found.type];
      const me = `${sock.user.id.split(':')[0].split('@')[0]}@s.whatsapp.net`;

      if (found.type === 'imageMessage') {
        await sock.sendMessage(me, { image: buffer, caption: media.caption || '' });
      } else if (found.type === 'videoMessage') {
        await sock.sendMessage(me, { video: buffer, caption: media.caption || '' });
      } else {
        await sock.sendMessage(me, { audio: buffer, mimetype: media.mimetype || 'audio/mp4', ptt: !!media.ptt });
      }
      if (from !== me) await sock.sendMessage(from, { text: '✅ Média envoyé dans ton chat privé.' });
    } catch (err) {
      await sock.sendMessage(from, {
        text: '• Impossible de récupérer ce média (déjà expiré ou non téléchargeable côté WhatsApp).',
      });
    }
  },
};
