// pluginHelpers.js — Petits utilitaires partagés entre les fichiers de plugins/
import * as group from './commands/group.js';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

// Vérifie que l'expéditeur est admin du groupe (ou owner du bot). Envoie le message
// de refus lui-même si ce n'est pas le cas. Renvoie true/false pour laisser le plugin
// décider s'il continue.
async function requireGroupAdmin({ sock, from, sender, isOwner }) {
  const isAdmin = isOwner || (await group.isSenderAdmin(sock, from, sender));
  if (!isAdmin) {
    await sock.sendMessage(from, { text: '• Réservé aux administrateurs du groupe.' });
    return false;
  }
  return true;
}

// Récupère le JID de la personne mentionnée/citée dans le message (pattern répété
// dans kick/promote/demote/block/profile/etc.)
function getQuotedParticipant(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.participant || null;
}

// Récupère le buffer d'une image citée en réponse (pattern répété dans sticker/blur/gpp/setpp/topdf)
async function getQuotedImageBuffer(msg, from) {
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  if (contextInfo?.quotedMessage?.imageMessage) {
    return downloadMediaMessage(
      { key: { remoteJid: from, id: contextInfo.stanzaId, participant: contextInfo.participant }, message: contextInfo.quotedMessage },
      'buffer',
      {}
    );
  }
  if (msg.message?.imageMessage) {
    return downloadMediaMessage(msg, 'buffer', {});
  }
  return null;
}

export { requireGroupAdmin, getQuotedParticipant, getQuotedImageBuffer };
