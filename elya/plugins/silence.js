import { silenceStore, saveData } from '../store.js';
import { PREFIX } from '../config.js';

// !silence [durée] — coupe la conversation libre d'Elya dans CE chat pendant la
// durée donnée (par défaut 30 min), sans désactiver le bot : les commandes "!"
// continuent de fonctionner normalement pendant le silence.
// Durée acceptée : nombre seul = minutes (ex: "20"), ou avec unité "10m" / "2h".
// !silence off (ou sans argument alors qu'un silence est actif) annule le silence en cours.
function parseDuration(input) {
  if (!input) return null;
  const match = input.trim().match(/^(\d+)\s*(m|min|h|heure|heures)?$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();
  const minutes = unit.startsWith('h') ? value * 60 : value;
  return minutes * 60 * 1000;
}

export default {
  command: 'silence',
  category: 'GENERAL',
  description: 'Coupe la conversation libre d\'Elya dans ce chat pour une durée donnée (les commandes restent actives)',
  handler: async ({ sock, chatId, args }) => {
    const arg = args[1]?.toLowerCase();

    if (arg === 'off' || arg === 'stop' || arg === 'annuler') {
      delete silenceStore[chatId];
      await saveData('silence', silenceStore);
      await sock.sendMessage(chatId, { text: `🔊 Silence levé, je réponds à nouveau normalement ici.` });
      return;
    }

    const active = silenceStore[chatId]?.until && silenceStore[chatId].until > Date.now();
    if (!arg && active) {
      const remainingMin = Math.ceil((silenceStore[chatId].until - Date.now()) / 60000);
      await sock.sendMessage(chatId, {
        text: `🔕 Déjà en silence ici, encore ~${remainingMin} min.\nUtilise : ${PREFIX}silence off pour lever tout de suite, ou ${PREFIX}silence <durée> pour ajuster.`,
      });
      return;
    }

    const durationMs = parseDuration(arg) ?? 30 * 60 * 1000; // 30 min par défaut
    silenceStore[chatId] = { until: Date.now() + durationMs };
    await saveData('silence', silenceStore);
    const minutes = Math.round(durationMs / 60000);
    await sock.sendMessage(chatId, {
      text: `🔕 Silence activé ici pour ${minutes} min. Je ne répondrai plus à la conversation, mais les commandes "!..." fonctionnent toujours.\nUtilise ${PREFIX}silence off pour lever avant la fin.`,
    });
  },
};
