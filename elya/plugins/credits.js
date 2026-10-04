import { aiUsageStore } from '../store.js';

export default {
  command: 'credits',
  aliases: ['usage'],
  category: 'GENERAL',
  description: 'Affiche le nombre d\'appels par fournisseur IA',
  handler: async ({ sock, chatId }) => {
    const entries = Object.entries(aiUsageStore).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, n]) => sum + n, 0);
    const lines = entries.length > 0
      ? entries.map(([p, n]) => `• ${p} : ${n} appel(s)`).join('\n')
      : '(aucun appel enregistré pour l\'instant)';
    await sock.sendMessage(chatId, {
      text: `📊 *Utilisation des fournisseurs IA* (${total} appels au total)\n\n${lines}\n\n` +
        `_⚠️ Ceci compte les appels, pas le solde réel en $ — AgentRouter et HCNSEC n'exposent pas d'API de solde. Vérifie le solde exact sur leurs dashboards web._`
    });
  },
};
