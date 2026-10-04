// elya/plugins/recap.js — !recap [nombre] : résume les derniers messages
// d'un groupe (ce que tu as raté), à partir du cache recentMsgCache
// (elya/store.js — en mémoire, pas persisté entre redémarrages).
import { recentMsgCache } from '../store.js';
import { askUtility } from '../providers.js';

const DEFAULT_N = 40;
const MAX_N = 150;

export default {
  command: 'recap',
  category: 'SOCIAL & GROUPE',
  description: "Résume les derniers messages du groupe",
  groupOnly: true,
  handler: async ({ sock, chatId, args }) => {
    const chatMap = recentMsgCache.get(chatId);
    if (!chatMap || chatMap.size === 0) {
      await sock.sendMessage(chatId, {
        text: `💛 Rien à résumer pour l'instant — je n'ai pas encore vu assez de messages dans ce groupe.`,
      });
      return;
    }

    let n = parseInt(args[1], 10);
    if (!n || n < 1) n = DEFAULT_N;
    if (n > MAX_N) n = MAX_N;

    const entries = Array.from(chatMap.values()).slice(-n);
    const transcript = entries.map((e) => `${e.senderName}: ${e.text}`).join('\n');

    await sock.sendPresenceUpdate('composing', chatId).catch(() => {});

    const prompt =
      `Voici les ${entries.length} derniers messages d'un groupe WhatsApp. ` +
      `Fais un résumé court et clair (5 à 8 lignes maximum) des sujets abordés, ` +
      `des décisions prises et de ce qui mérite l'attention. Réponds en français, ` +
      `sans reformuler message par message, juste les points importants.\n\n${transcript}`;

    const summary = await askUtility(prompt);

    if (!summary) {
      await sock.sendMessage(chatId, {
        text: `💛 Je n'ai pas réussi à générer le résumé là, réessaie dans un instant.`,
      });
      return;
    }

    await sock.sendMessage(chatId, {
      text: `📋 *Récap des ${entries.length} derniers messages :*\n\n${summary}`,
    });
  },
};
