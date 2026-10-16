// elya/plugins/csc.js — !csc : change le statut/description d'une chaîne
// WhatsApp (le "à propos" affiché sur sa page), équivalent de .gs pour un
// groupe mais pour une chaîne. Réservé au créateur.
//
//   !csc <JID_chaîne> <texte>
//
// Le JID de la chaîne s'obtient avec !newsletter (à taper dans la chaîne elle-même).
import { PREFIX } from '../config.js';

export default {
  command: 'csc',
  category: 'GENERAL',
  description: "Change le statut/description d'une chaîne WhatsApp (réservé au créateur)",
  ownerOnly: true,
  handler: async ({ sock, chatId, cmd, text }) => {
    const rest = text.slice(PREFIX.length + cmd.length).trim();
    const match = rest.match(/^(\S+@newsletter)\s+([\s\S]+)$/);
    if (!match) {
      await sock.sendMessage(chatId, {
        text: `💛 Utilise : ${PREFIX}csc <JID_chaîne> <texte>\n\nLe JID s'obtient avec ${PREFIX}newsletter, à taper directement dans la chaîne.`,
      });
      return;
    }
    const [, newsletterJid, newDescription] = match;
    try {
      await sock.newsletterUpdateDescription(newsletterJid, newDescription);
      await sock.sendMessage(chatId, { text: `✅ Statut de la chaîne mis à jour.` });
    } catch (e) {
      console.error('Erreur csc:', e.message);
      await sock.sendMessage(chatId, { text: `⚠️ Je n'ai pas réussi à changer le statut de la chaîne : ${e.message}` });
    }
  },
};
