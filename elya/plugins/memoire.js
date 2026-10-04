import { memoryStore } from '../store.js';
import { memText, relativeDate } from '../helpers.js';

const memoire = {
  command: 'memoire',
  category: 'GENERAL',
  description: 'Affiche ce dont Elya se souvient de la conversation (owner: !memoire <numéro> pour consulter un autre chat)',
  handler: async ({ sock, chatId, args, isOwner }) => {
    let targetId = chatId;
    let label = '';
    if (isOwner && args[1]) {
      const digits = args[1].replace(/\D/g, '');
      if (digits) {
        targetId = `${digits}@s.whatsapp.net`;
        label = ` pour ${args[1]}`;
      }
    }
    const mem = memoryStore[targetId] || [];
    const txt = mem.length > 0
      ? `🧠 *Ce que je me souviens${label} :*\n\n${mem.map((m, i) => {
          const t = memText(m);
          const d = typeof m === 'string' ? '' : relativeDate(m.date);
          return `${i + 1}. ${t}${d ? ` _(${d})_` : ''}`;
        }).join('\n')}`
      : `🧠 Je ne me souviens encore de rien${label}. Ça viendra au fil de nos échanges 💛`;
    await sock.sendMessage(chatId, { text: txt });
  },
};

const gouts = {
  command: 'gouts',
  aliases: ['goûts'],
  category: 'GENERAL',
  description: 'Affiche ce qu\'Elya a retenu des goûts de la personne',
  handler: async ({ sock, chatId }) => {
    const mem = memoryStore[chatId] || [];
    const keywords = ['aime', 'adore', 'déteste', 'deteste', 'préfère', 'prefere', 'favori', 'passion', 'kiffe', 'raffole'];
    const tastes = mem.filter(m => {
      const t = memText(m).toLowerCase();
      return keywords.some(k => t.includes(k));
    });
    const txt = tastes.length > 0
      ? `✨ *Ce que j'ai appris de tes goûts :*\n\n${tastes.map((m, i) => `${i + 1}. ${memText(m)}`).join('\n')}\n\nPlus on discute, plus j'apprends à te connaître 💛`
      : `✨ Je ne connais pas encore tes goûts, raconte-moi ce que tu aimes ! 🌙`;
    await sock.sendMessage(chatId, { text: txt });
  },
};

export default [memoire, gouts];
