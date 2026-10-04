import path from 'path';
import { fileURLToPath } from 'url';
import { PREFIX } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets', 'branding');

export default {
  command: 'apropos',
  category: 'GENERAL',
  description: 'Présente le bot (Elya + Mitsuki)',
  handler: async ({ sock, chatId }) => {
    await sock.sendMessage(chatId, {
      image: { url: path.join(ASSETS_DIR, 'elya-prime-avatar.png') },
      caption:
        `🎀✨ *Elya Prime* ✨🎀\n\n` +
        `Ce bot regroupe deux univers de commandes qui partagent le même numéro WhatsApp :\n\n` +
        `💙 *Elya AI* (préfixe !) — IA conversationnelle, mémoire, modération, dashboard web\n` +
        `🌸 *Mitsuki MD* (préfixe .) — téléchargements, outils, commandes de groupe\n\n` +
        `Tape ${PREFIX}menu pour explorer Elya AI, ou .menu pour Mitsuki MD.`
    });
    await sock.sendMessage(chatId, {
      image: { url: path.join(ASSETS_DIR, 'elya-ai-avatar.png') },
      caption: `💙 *Elya AI* — l'univers conversationnel de ce bot 💖`
    });
  },
};
