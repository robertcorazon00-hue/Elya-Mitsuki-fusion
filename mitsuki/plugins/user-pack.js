// plugins/user-pack.js — Commandes UTILISATEUR dont la logique existait déjà
// dans commands/user.js, mais sans plugin pour les exposer.
import * as user from '../commands/user.js';
import { getQuotedParticipant } from '../pluginHelpers.js';

function resolveTargetOrSender(msg, sender) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  return mentioned || getQuotedParticipant(msg) || sender;
}

function setPref(command) {
  return {
    command,
    category: 'UTILISATEUR',
    description: 'Enregistre un réglage personnel : .{cmd} <clé> <valeur>',
    handler: async ({ sock, from, sender, args }) => {
      const [key, ...rest] = args;
      if (!key || !rest.length) { await sock.sendMessage(from, { text: `• Utilise : .${command} <clé> <valeur>` }); return; }
      await sock.sendMessage(from, { text: user.setPreference(sender, key, rest.join(' ')) });
    },
  };
}
const save = setPref('save');
const set = setPref('set');

const active = {
  command: 'active',
  category: 'UTILISATEUR',
  description: 'Te marque comme actif',
  handler: async ({ sock, from, sender }) => {
    await sock.sendMessage(from, { text: user.markActive(sender) });
  },
};

const profile = {
  command: 'profile',
  category: 'UTILISATEUR',
  description: "Affiche le profil d'un contact (réponds à son message, sinon le tien)",
  handler: async ({ sock, from, sender, msg }) => {
    const target = resolveTargetOrSender(msg, sender);
    const card = await user.profile(sock, target);
    await sock.sendMessage(from, { text: card, mentions: [target] });
  },
};

const block = {
  command: 'block',
  category: 'UTILISATEUR',
  description: 'Bloque un contact (réponds à son message)',
  handler: async ({ sock, from, msg }) => {
    const target = getQuotedParticipant(msg);
    if (!target) { await sock.sendMessage(from, { text: '• Réponds au message du contact à bloquer.' }); return; }
    try {
      await user.applyBlock(sock, target);
      await sock.sendMessage(from, { text: user.block(target), mentions: [target] });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};

const unblock = {
  command: 'unblock',
  category: 'UTILISATEUR',
  description: 'Débloque un contact (réponds à son message)',
  handler: async ({ sock, from, msg }) => {
    const target = getQuotedParticipant(msg);
    if (!target) { await sock.sendMessage(from, { text: '• Réponds au message du contact à débloquer.' }); return; }
    try {
      await user.applyUnblock(sock, target);
      await sock.sendMessage(from, { text: user.unblock(target), mentions: [target] });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};

const jidCmd = {
  command: 'jid',
  category: 'UTILISATEUR',
  description: 'Donne le JID du chat actuel (ou du contact cité)',
  handler: async ({ sock, from, msg }) => {
    const target = getQuotedParticipant(msg) || from;
    await sock.sendMessage(from, { text: user.jid(target) });
  },
};

function ppCommand(command) {
  return {
    command,
    category: 'UTILISATEUR',
    description: "Récupère la photo de profil d'un contact (réponds à son message)",
    handler: async ({ sock, from, sender, msg }) => {
      const target = resolveTargetOrSender(msg, sender);
      const url = await user.getProfilePicture(sock, target);
      if (!url) { await sock.sendMessage(from, { text: '• Impossible de récupérer cette photo de profil.' }); return; }
      await sock.sendMessage(from, { image: { url } });
    },
  };
}
const fullpp = ppCommand('fullpp');
const getdp = ppCommand('getdp');

const leave = {
  command: 'leave',
  category: 'UTILISATEUR',
  description: 'Le bot quitte le groupe actuel',
  groupOnly: true,
  ownerOnly: true,
  handler: async ({ sock, from }) => {
    await sock.sendMessage(from, { text: '👋 Je quitte ce groupe.' });
    await user.leave(sock, from);
  },
};

const join = {
  command: 'join',
  category: 'UTILISATEUR',
  description: "Rejoint un groupe via un lien d'invitation",
  ownerOnly: true,
  handler: async ({ sock, from, argText }) => {
    if (!argText) { await sock.sendMessage(from, { text: "• Utilise : .join <lien d'invitation>" }); return; }
    try {
      await user.join(sock, argText);
      await sock.sendMessage(from, { text: '✅ Groupe rejoint.' });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};

export default [save, set, active, profile, block, unblock, jidCmd, fullpp, getdp, leave, join];
