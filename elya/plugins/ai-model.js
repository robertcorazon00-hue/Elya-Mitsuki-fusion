import { aiModelStore, saveData } from '../store.js';
import { PREFIX, AI_MODELS } from '../config.js';

export default {
  command: 'ia',
  aliases: ['modele', 'modèle'],
  category: 'GENERAL',
  description: 'Choisit le modèle IA utilisé dans cette conversation',
  handler: async ({ sock, chatId, args }) => {
    let sub = args[1]?.toLowerCase();
    if (sub === 'hf') sub = 'huggingface';
    if (!sub) {
      const current = aiModelStore[chatId] || 'gemini';
      await sock.sendMessage(chatId, {
        text: `🤖 *Modèle IA actuel :* ${current}\n\n` +
          `Modèles disponibles :\n${AI_MODELS.map((m) => `• ${PREFIX}ia ${m}`).join('\n')}\n\n` +
          `_"huggingface" (ou "hf") choisit automatiquement entre chat/code/secours selon ta demande._\n` +
          `_"auto" = Gemini avec repli automatique en cascade sur les autres si le quota est épuisé (comportement par défaut)._`,
      });
    } else if (AI_MODELS.includes(sub)) {
      aiModelStore[chatId] = sub;
      await saveData('aiModel', aiModelStore);
      await sock.sendMessage(chatId, { text: `🤖 Modèle IA changé pour *${sub}* !` });
    } else {
      await sock.sendMessage(chatId, { text: `💛 Modèle inconnu. Choix possibles : ${AI_MODELS.join(', ')}` });
    }
  },
};
