// plugins/auto-pack.js — Comme security-pack.js : autoreact/autoread/autosave
// (par groupe) et anticall/autorecording/autotyping (globaux au bot) sont déjà
// actifs dans handler.js, il ne manquait que la commande de bascule.
import * as settings from '../commands/settings.js';
import * as autoreply from '../commands/autoreply.js';
import { getBotSettings, setBotSetting } from '../storage.js';
import { buildCard } from '../card.js';
import { requireGroupAdmin } from '../pluginHelpers.js';

function groupToggle(key, description) {
  return {
    command: key,
    category: 'AUTO',
    description,
    groupOnly: true,
    handler: async (ctx) => {
      const { sock, from, args } = ctx;
      if (args[0] && !(await requireGroupAdmin(ctx))) return;
      await sock.sendMessage(from, { text: settings.toggle(from, key, args[0]) });
    },
  };
}
const autoreact = groupToggle('autoreact', 'Réagit automatiquement à chaque message du groupe');
const autoread = groupToggle('autoread', 'Marque automatiquement les messages du groupe comme lus');
const autosave = groupToggle('autosave', 'Sauvegarde automatiquement les médias du groupe en DM');

const autoreplyCmd = {
  command: 'autoreply',
  category: 'AUTO',
  description: 'Active/désactive la réponse automatique aux messages',
  ownerOnly: true,
  handler: async ({ sock, from, args }) => {
    await sock.sendMessage(from, { text: autoreply.toggle(args[0]) });
  },
};

function botToggle(key, description) {
  return {
    command: key,
    category: 'AUTO',
    description,
    ownerOnly: true,
    handler: async ({ sock, from, args }) => {
      if (!args[0]) {
        const s = getBotSettings();
        await sock.sendMessage(from, { text: buildCard(key, [['Statut', s[key] ? 'Active' : 'Desactive']]) });
        return;
      }
      const value = args[0].toLowerCase() === 'on';
      setBotSetting(key, value);
      await sock.sendMessage(from, { text: buildCard(key, [['Statut', value ? 'Active ✅' : 'Desactive ❌']]) });
    },
  };
}
const anticall = botToggle('anticall', 'Rejette automatiquement les appels entrants');
const autorecording = botToggle('autorecording', 'Simule "en train d\'enregistrer" en répondant');
const autotyping = botToggle('autotyping', 'Simule "en train d\'écrire" en répondant');

export default [autoreact, autoread, autosave, autoreplyCmd, anticall, autorecording, autotyping];
