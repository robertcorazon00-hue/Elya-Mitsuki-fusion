// plugins/security-pack.js — Les comportements (suppression de liens, antispam,
// antibot, antiedit, antihidetag) sont déjà actifs dans handler.js et lisent
// storage.getGroupSettings(from) ; il ne manquait que la commande pour les
// basculer on/off. commands/settings.js fait déjà tout le travail (toggle()).
import * as settings from '../commands/settings.js';
import { getWarns, resetWarns } from '../storage.js';
import { buildCard } from '../card.js';
import { requireGroupAdmin, getQuotedParticipant } from '../pluginHelpers.js';

function toggleCmd(key, description) {
  return {
    command: key,
    category: 'SECURITE',
    description,
    groupOnly: true,
    handler: async (ctx) => {
      const { sock, from, args } = ctx;
      if (args[0] && !(await requireGroupAdmin(ctx))) return;
      await sock.sendMessage(from, { text: settings.toggle(from, key, args[0]) });
    },
  };
}

const antilink = toggleCmd('antilink', 'Supprime les messages contenant un lien');
const antispam = toggleCmd('antispam', 'Sanctionne les envois de messages trop rapprochés');
const antibot = toggleCmd('antibot', 'Supprime les messages massivement transférés');
const antiedit = toggleCmd('antiedit', 'Signale les messages modifiés');
const antihidetag = toggleCmd('antihidetag', 'Détecte les mentions cachées (hidden tag)');
// ⚠️ La bascule fonctionne (réglage stocké), mais aucune détection de suppression
// de message n'est câblée dans handler.js pour l'instant — cette commande ne
// déclenche donc rien de visible tant que cette partie n'est pas ajoutée.
const antidelete = toggleCmd('antidelete', 'Signale les messages supprimés (bascule prête, détection pas encore câblée)');

const warns = {
  command: 'warns',
  category: 'SECURITE',
  description: "Affiche le nombre d'avertissements d'un membre (réponds à son message)",
  groupOnly: true,
  handler: async ({ sock, from, msg }) => {
    const target = getQuotedParticipant(msg);
    if (!target) { await sock.sendMessage(from, { text: '• Réponds au message du membre concerné.' }); return; }
    const n = getWarns(from, target);
    await sock.sendMessage(from, {
      text: buildCard('Avertissements', [[`@${target.split('@')[0]}`, `${n}/3`]]),
      mentions: [target],
    });
  },
};

const unwarn = {
  command: 'unwarn',
  category: 'SECURITE',
  description: "Réinitialise les avertissements d'un membre (réponds à son message)",
  groupOnly: true,
  handler: async (ctx) => {
    const { sock, from, msg } = ctx;
    if (!(await requireGroupAdmin(ctx))) return;
    const target = getQuotedParticipant(msg);
    if (!target) { await sock.sendMessage(from, { text: '• Réponds au message du membre concerné.' }); return; }
    resetWarns(from, target);
    await sock.sendMessage(from, { text: `✅ Avertissements réinitialisés pour @${target.split('@')[0]}.`, mentions: [target] });
  },
};

export default [antilink, antispam, antibot, antiedit, antihidetag, antidelete, warns, unwarn];
