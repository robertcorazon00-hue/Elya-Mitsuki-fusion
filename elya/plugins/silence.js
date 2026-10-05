import { silenceStore, saveData } from '../store.js';
import { PREFIX } from '../config.js';

// !silence [durée] — coupe la conversation libre d'Elya dans CE chat pendant la
// durée donnée (par défaut 30 min), sans désactiver le bot : les commandes "!"
// continuent de fonctionner normalement pendant le silence.
// Durée acceptée : nombre seul = minutes (ex: "20"), avec unité "10m" / "2h",
// ou un mot-clé pour une désactivation PERMANENTE ("illimite", "illimité",
// "permanent", "toujours", "infini") — reste coupé jusqu'à !silence off.
// !silence off (ou sans argument alors qu'un silence est actif) annule le silence en cours.
const PERMANENT_KEYWORDS = ['illimite', 'illimité', 'permanent', 'toujours', 'infini'];
function parseDuration(input) {
  if (!input) return null;
  if (PERMANENT_KEYWORDS.includes(input.trim().toLowerCase())) return Infinity;
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
  description: 'Coupe la conversation libre d\'Elya dans ce chat (temporairement ou en permanence) — les commandes restent actives',
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
      const until = silenceStore[chatId].until;
      const statusText = until === Infinity
        ? 'Déjà désactivée ici en permanence.'
        : `Déjà en silence ici, encore ~${Math.ceil((until - Date.now()) / 60000)} min.`;
      await sock.sendMessage(chatId, {
        text: `🔕 ${statusText}\nUtilise : ${PREFIX}silence off pour lever tout de suite, ou ${PREFIX}silence <durée> pour ajuster.`,
      });
      return;
    }

    const durationMs = parseDuration(arg) ?? 30 * 60 * 1000; // 30 min par défaut
    silenceStore[chatId] = { until: durationMs === Infinity ? Infinity : Date.now() + durationMs };
    await saveData('silence', silenceStore);
    const confirmText = durationMs === Infinity
      ? `🔕 Désactivée ici en permanence. Je ne répondrai plus à la conversation libre, mais les commandes "!..." fonctionnent toujours.\nUtilise ${PREFIX}silence off pour réactiver.`
      : `🔕 Silence activé ici pour ${Math.round(durationMs / 60000)} min. Je ne répondrai plus à la conversation, mais les commandes "!..." fonctionnent toujours.\nUtilise ${PREFIX}silence off pour lever avant la fin.`;
    await sock.sendMessage(chatId, { text: confirmText });
  },
};
