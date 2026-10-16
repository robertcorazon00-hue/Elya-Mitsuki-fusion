import { historyStore, contactsStore } from '../store.js';

// !poststatut <texte> — réservé au créateur : poste un statut WhatsApp
// (texte) visible par tes vrais contacts du téléphone (synchronisés par
// WhatsApp à la connexion dans contactsStore). Si la synchro n'a pas encore
// eu lieu (juste après un repairing, par exemple), on retombe sur les gens
// qui ont déjà écrit au bot. WhatsApp/Baileys exige une liste explicite de
// destinataires (statusJidList) pour un statut, contrairement à un message
// classique.
export default {
  command: 'poststatut',
  aliases: ['poststatus'],
  category: 'GENERAL',
  description: 'Poste un statut WhatsApp texte (réservé au créateur)',
  ownerOnly: true,
  handler: async ({ sock, chatId, text, cmd }) => {
    const message = text.slice(cmd.length + 1).trim();
    if (!message) {
      await sock.sendMessage(chatId, { text: `Utilise : !poststatut <texte du statut>` });
      return;
    }

    let statusJidList = Object.keys(contactsStore);
    let source = 'tes contacts synchronisés';
    if (statusJidList.length === 0) {
      statusJidList = Object.keys(historyStore).filter((id) => id.endsWith('@s.whatsapp.net'));
      source = 'les gens qui t\'ont déjà écrit (contacts pas encore synchronisés)';
    }
    if (statusJidList.length === 0) {
      await sock.sendMessage(chatId, { text: `Je ne connais encore aucun contact à qui montrer ce statut.` });
      return;
    }

    try {
      await sock.sendMessage('status@broadcast', { text: message }, { statusJidList });
      await sock.sendMessage(chatId, { text: `✅ Statut posté, visible par ${statusJidList.length} contact(s) (${source}).` });
    } catch (e) {
      console.error('Erreur poststatut:', e.message);
      await sock.sendMessage(chatId, { text: `⚠️ Je n'ai pas réussi à poster le statut : ${e.message}` });
    }
  },
};
