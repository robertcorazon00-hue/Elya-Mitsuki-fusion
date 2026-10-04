import { historyStore } from '../store.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// !broadcast <message> — réservé au créateur : envoie le message à tous les
// chats qu'Elya connaît déjà (tous les chatId présents dans l'historique de
// conversation, DM + groupes confondus). Petite pause entre chaque envoi
// pour rester raisonnable vis-à-vis de WhatsApp (pas d'envoi en rafale).
export default {
  command: 'broadcast',
  category: 'GENERAL',
  description: 'Envoie un message à tous les chats connus (réservé au créateur)',
  ownerOnly: true,
  handler: async ({ sock, chatId, text, cmd }) => {
    const message = text.slice(cmd.length + 1).trim(); // enlève "!broadcast" du texte brut
    if (!message) {
      await sock.sendMessage(chatId, { text: `Utilise : !broadcast <message à envoyer à tout le monde>` });
      return;
    }

    const targets = Object.keys(historyStore).filter((id) => id !== chatId);
    if (targets.length === 0) {
      await sock.sendMessage(chatId, { text: `Je ne connais encore aucun autre chat à qui envoyer ça.` });
      return;
    }

    await sock.sendMessage(chatId, { text: `📣 Envoi à ${targets.length} chat(s) en cours...` });

    let sent = 0;
    let failed = 0;
    for (const targetId of targets) {
      try {
        await sock.sendMessage(targetId, { text: `📣 *Annonce*\n\n${message}` });
        sent++;
      } catch (e) {
        failed++;
      }
      await sleep(400 + Math.floor(Math.random() * 400)); // pause 400-800ms entre chaque envoi
    }

    await sock.sendMessage(chatId, { text: `✅ Diffusion terminée : ${sent} envoyé(s)${failed ? `, ${failed} échec(s)` : ''}.` });
  },
};
