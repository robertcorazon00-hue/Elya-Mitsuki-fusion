import { model } from '../ai.js';
import { trueFalseState } from '../store.js';
import { PREFIX } from '../config.js';

export default {
  command: 'vraifaux',
  category: 'GENERAL',
  description: 'Génère une question "Vrai ou Faux" via l\'IA',
  handler: async ({ sock, chatId }) => {
    try {
      const prompt = `Génère une affirmation "Vrai ou Faux" amusante et surprenante de culture générale, en français, courte (max 20 mots). Réponds STRICTEMENT sous ce format, rien d'autre :\nAFFIRMATION: <texte>\nREPONSE: VRAI ou FAUX`;
      const result = await model.generateContent(prompt);
      const raw = (await result.response).text();
      const affMatch = raw.match(/AFFIRMATION:\s*(.+)/i);
      const repMatch = raw.match(/REPONSE:\s*(VRAI|FAUX)/i);
      if (affMatch && repMatch) {
        trueFalseState[chatId] = { statement: affMatch[1].trim(), answer: repMatch[1].toUpperCase() };
        await sock.sendMessage(chatId, {
          text: `❓ *Vrai ou Faux ?*\n\n${affMatch[1].trim()}\n\nRéponds avec ${PREFIX}vrai ou ${PREFIX}faux`,
        });
      } else {
        await sock.sendMessage(chatId, { text: `💛 Petit souci pour générer la question, réessaie.` });
      }
    } catch (e) {
      await sock.sendMessage(chatId, { text: `💛 Petit souci pour générer la question, réessaie.` });
    }
  },
};
