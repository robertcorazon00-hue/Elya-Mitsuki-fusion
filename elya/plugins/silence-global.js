import { silenceStore, saveData } from '../store.js';
import { PREFIX } from '../config.js';

// !silencetout [durée] — comme !silence, mais coupe la conversation libre
// d'Elya PARTOUT (tous les groupes et DM, y compris ceux qu'elle ne connaît
// pas encore), pas juste dans le chat courant. Réservé aux owners : si
// n'importe qui pouvait l'utiliser depuis un groupe, ça couperait Elya pour
// tout le monde ailleurs aussi.
// Durée : nombre = minutes, "10m"/"2h", ou "illimite"/"permanent"/"toujours"/
// "infini" pour une coupure sans limite de temps.
// !silencetout off pour lever.
const PERMANENT_KEYWORDS = ['illimite', 'illimité', 'permanent', 'toujours', 'infini'];
const GLOBAL_KEY = '__global__';

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
  command: 'silencetout',
  category: 'GENERAL',
  description: "Coupe la conversation libre d'Elya PARTOUT (tous les chats) — réservé aux owners",
  ownerOnly: true,
  handler: async ({ sock, chatId, args }) => {
    const arg = args[1]?.toLowerCase();

    if (arg === 'off' || arg === 'stop' || arg === 'annuler') {
      delete silenceStore[GLOBAL_KEY];
      await saveData('silence', silenceStore);
      await sock.sendMessage(chatId, { text: `🔊 Silence global levé, je réponds à nouveau partout.` });
      return;
    }

    const active = silenceStore[GLOBAL_KEY]?.until && silenceStore[GLOBAL_KEY].until > Date.now();
    if (!arg && active) {
      const until = silenceStore[GLOBAL_KEY].until;
      const statusText = until === Infinity
        ? 'Déjà en silence global permanent.'
        : `Déjà en silence global, encore ~${Math.ceil((until - Date.now()) / 60000)} min.`;
      await sock.sendMessage(chatId, {
        text: `🔕 ${statusText}\nUtilise : ${PREFIX}silencetout off pour lever tout de suite, ou ${PREFIX}silencetout <durée> pour ajuster.`,
      });
      return;
    }

    const durationMs = parseDuration(arg) ?? 30 * 60 * 1000; // 30 min par défaut
    silenceStore[GLOBAL_KEY] = { until: durationMs === Infinity ? Infinity : Date.now() + durationMs };
    await saveData('silence', silenceStore);
    const confirmText = durationMs === Infinity
      ? `🔕 Silence global activé en permanence. Je ne répondrai plus en conversation libre nulle part, mais les commandes "!..." restent actives.\nUtilise ${PREFIX}silencetout off pour réactiver.`
      : `🔕 Silence global activé pour ${Math.round(durationMs / 60000)} min, partout. Les commandes "!..." restent actives.\nUtilise ${PREFIX}silencetout off pour lever avant la fin.`;
    await sock.sendMessage(chatId, { text: confirmText });
  },
};
