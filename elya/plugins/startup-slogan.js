import { model } from '../ai.js';
import { PREFIX } from '../config.js';

const startup = {
  command: 'startup',
  category: 'GENERAL',
  description: 'Génère des noms de startup pour un thème donné',
  handler: async ({ sock, chatId, args }) => {
    const keywords = args.slice(1).join(' ');
    if (!keywords) {
      await sock.sendMessage(chatId, { text: `🚀 Utilise : ${PREFIX}startup <mots-clés> (ex: ${PREFIX}startup cuisine et intelligence artificielle)` });
      return;
    }
    try {
      const prompt = `Génère 5 noms de startup créatifs et courts (max 2 mots chacun) en lien avec : "${keywords}". Réponds uniquement sous forme de liste numérotée, sans explication.`;
      const result = await model.generateContent(prompt);
      const names = (await result.response).text().trim();
      await sock.sendMessage(chatId, { text: `🚀 *Idées de noms de startup :*\n\n${names}` });
    } catch (e) {
      await sock.sendMessage(chatId, { text: `💛 Petit souci, réessaie plus tard.` });
    }
  },
};

const slogan = {
  command: 'slogan',
  category: 'GENERAL',
  description: 'Génère des slogans publicitaires pour un sujet donné',
  handler: async ({ sock, chatId, args }) => {
    const sujet = args.slice(1).join(' ');
    if (!sujet) {
      await sock.sendMessage(chatId, { text: `📢 Utilise : ${PREFIX}slogan <sujet> (ex: ${PREFIX}slogan mon salon de coiffure)` });
      return;
    }
    try {
      const prompt = `Génère 3 slogans publicitaires courts, percutants et originaux en français pour : "${sujet}". Réponds uniquement sous forme de liste numérotée.`;
      const result = await model.generateContent(prompt);
      const slogans = (await result.response).text().trim();
      await sock.sendMessage(chatId, { text: `📢 *Idées de slogans :*\n\n${slogans}` });
    } catch (e) {
      await sock.sendMessage(chatId, { text: `💛 Petit souci, réessaie plus tard.` });
    }
  },
};

export default [startup, slogan];
