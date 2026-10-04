import { model } from '../ai.js';
import { askViaProvider } from '../providers.js';
import { AI_MODELS } from '../config.js';

export default {
  command: 'iastatus',
  category: 'GENERAL',
  description: 'Teste tous les fournisseurs IA',
  handler: async ({ sock, chatId }) => {
    await sock.sendMessage(chatId, { text: `🔎 Test des ${AI_MODELS.length} fournisseurs IA en cours, ça peut prendre une minute...` });
    const results = [];
    for (const provider of AI_MODELS) {
      const start = Date.now();
      try {
        if (provider === 'gemini') {
          const r = await model.generateContent('Réponds juste "ok"');
          (await r.response).text();
        } else {
          const reply = await askViaProvider(provider, chatId, 'Test', 'Réponds juste "ok"');
          if (!reply) throw new Error('réponse vide');
        }
        results.push(`✅ ${provider} — ${Date.now() - start}ms`);
      } catch (e) {
        results.push(`❌ ${provider} — ${e.message.slice(0, 60)}`);
      }
    }
    await sock.sendMessage(chatId, { text: `🔎 *Statut des fournisseurs IA :*\n\n${results.join('\n')}` });
  },
};
