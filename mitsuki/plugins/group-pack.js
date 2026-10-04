// plugins/group-pack.js — Commandes GROUPE dont la logique existait déjà
// dans commands/group.js, mais sans plugin pour les exposer.
import * as group from '../commands/group.js';
import { requireGroupAdmin, getQuotedParticipant, getQuotedImageBuffer } from '../pluginHelpers.js';

function resolveTarget(msg) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  return mentioned || getQuotedParticipant(msg);
}

// ── Actions avec une cible (mention ou message cité) ──
function targetAction(command, description, fn, successText) {
  return {
    command,
    category: 'GROUPE',
    description,
    groupOnly: true,
    handler: async (ctx) => {
      const { sock, from, msg } = ctx;
      if (!(await requireGroupAdmin(ctx))) return;
      const target = resolveTarget(msg);
      if (!target) {
        await sock.sendMessage(from, { text: `• Mentionne ou réponds à la personne visée avec .${command}` });
        return;
      }
      try {
        await fn(sock, from, target);
        await sock.sendMessage(from, { text: successText(target), mentions: [target] });
      } catch (err) {
        await sock.sendMessage(from, { text: `• ${group.friendlyGroupError(err)}` });
      }
    },
  };
}
const kick = targetAction('kick', 'Expulse un membre (mentionne-le ou réponds à son message)', group.kick, (t) => `✅ @${t.split('@')[0]} expulsé.`);
const promote = targetAction('promote', 'Promeut un membre admin', group.promote, (t) => `✅ @${t.split('@')[0]} est maintenant admin.`);
const demote = targetAction('demote', "Retire les droits admin d'un membre", group.demote, (t) => `✅ @${t.split('@')[0]} n'est plus admin.`);

// ── Actions simples sur le groupe (pas de cible) ──
function simpleAction(command, description, fn, successText) {
  return {
    command,
    category: 'GROUPE',
    description,
    groupOnly: true,
    handler: async (ctx) => {
      const { sock, from } = ctx;
      if (!(await requireGroupAdmin(ctx))) return;
      try {
        await fn(sock, from);
        await sock.sendMessage(from, { text: successText });
      } catch (err) {
        await sock.sendMessage(from, { text: `• ${group.friendlyGroupError(err)}` });
      }
    },
  };
}
const mute = simpleAction('mute', 'Seuls les admins peuvent écrire', group.mute, '🔇 Groupe passé en mode admins uniquement.');
const unmute = simpleAction('unmute', 'Tout le monde peut écrire', group.unmute, '🔊 Tout le monde peut écrire à nouveau.');
const lock = simpleAction('lock', "Seuls les admins peuvent modifier les infos du groupe", group.lock, '🔒 Infos du groupe verrouillées.');
const unlock = simpleAction('unlock', 'Tout le monde peut modifier les infos du groupe', group.unlock, '🔓 Infos du groupe déverrouillées.');

// ── Demandes d'adhésion en attente ──
function requestsAction(command, description, fn, label) {
  return {
    command,
    category: 'GROUPE',
    description,
    groupOnly: true,
    handler: async (ctx) => {
      const { sock, from } = ctx;
      if (!(await requireGroupAdmin(ctx))) return;
      try {
        const n = await fn(sock, from);
        await sock.sendMessage(from, { text: `✅ ${n} demande(s) ${label}.` });
      } catch (err) {
        await sock.sendMessage(from, { text: `• ${group.friendlyGroupError(err)}` });
      }
    },
  };
}
const acceptall = requestsAction('acceptall', "Accepte toutes les demandes d'adhésion en attente", group.acceptAll, 'acceptée(s)');
const rejectall = requestsAction('rejectall', "Refuse toutes les demandes d'adhésion en attente", group.rejectAll, 'refusée(s)');

const add = {
  command: 'add',
  category: 'GROUPE',
  description: "Ajoute un membre au groupe (numéro avec indicatif, sans +)",
  groupOnly: true,
  handler: async (ctx) => {
    const { sock, from, argText } = ctx;
    if (!(await requireGroupAdmin(ctx))) return;
    const digits = (argText || '').replace(/\D/g, '');
    if (!digits) { await sock.sendMessage(from, { text: '• Utilise : .add <numéro avec indicatif, sans +>' }); return; }
    try {
      await group.add(sock, from, `${digits}@s.whatsapp.net`);
      await sock.sendMessage(from, { text: `✅ Invitation envoyée à +${digits}.` });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${group.friendlyGroupError(err)}` });
    }
  },
};

const clean = {
  command: 'clean',
  category: 'GROUPE',
  description: "Retire les membres dont le compte WhatsApp n'existe plus",
  groupOnly: true,
  handler: async (ctx) => {
    const { sock, from } = ctx;
    if (!(await requireGroupAdmin(ctx))) return;
    try {
      const n = await group.clean(sock, from);
      await sock.sendMessage(from, { text: `✅ ${n} compte(s) inexistant(s) retiré(s).` });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${group.friendlyGroupError(err)}` });
    }
  },
};

const invite = {
  command: 'invite',
  category: 'GROUPE',
  description: "Donne le lien d'invitation du groupe",
  groupOnly: true,
  handler: async (ctx) => {
    const { sock, from } = ctx;
    if (!(await requireGroupAdmin(ctx))) return;
    try {
      const link = await group.invite(sock, from);
      await sock.sendMessage(from, { text: `🔗 ${link}` });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${group.friendlyGroupError(err)}` });
    }
  },
};

// ── Fonctions qui envoient déjà elles-mêmes leur message ──
const tagall = {
  command: 'tagall',
  category: 'GROUPE',
  description: 'Mentionne tous les membres du groupe',
  groupOnly: true,
  handler: async ({ sock, msg, argText }) => {
    try { await group.tagAll(sock, msg, argText); }
    catch (err) { await sock.sendMessage(msg.key.remoteJid, { text: `• ${group.friendlyGroupError(err)}` }); }
  },
};
const htag = {
  command: 'htag',
  category: 'GROUPE',
  description: 'Notifie tout le groupe sans afficher les mentions',
  groupOnly: true,
  handler: async ({ sock, msg, argText }) => {
    try { await group.hiddenTagAll(sock, msg, argText); }
    catch (err) { await sock.sendMessage(msg.key.remoteJid, { text: `• ${group.friendlyGroupError(err)}` }); }
  },
};
const gs = {
  command: 'gs',
  category: 'GROUPE',
  description: 'Publie un statut de groupe (texte, ou média cité)',
  groupOnly: true,
  handler: async ({ sock, msg, argText }) => {
    try { await group.groupStatus(sock, msg, argText); }
    catch (err) { await sock.sendMessage(msg.key.remoteJid, { text: `• ${group.friendlyGroupError(err)}` }); }
  },
};

// ── Nom, description, photo et lien du groupe ──
const desc = {
  command: 'desc',
  category: 'GROUPE',
  description: 'Change la description du groupe',
  groupOnly: true,
  handler: async (ctx) => {
    const { sock, from, argText } = ctx;
    if (!(await requireGroupAdmin(ctx))) return;
    if (!argText) { await sock.sendMessage(from, { text: '• Utilise : .desc <nouvelle description>' }); return; }
    if (argText.length > 2048) { await sock.sendMessage(from, { text: '• Description trop longue (2048 caractères maximum).' }); return; }
    try {
      await group.setDescription(sock, from, argText);
      await sock.sendMessage(from, { text: '✅ Description mise à jour.' });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${group.friendlyGroupError(err)}` });
    }
  },
};

const gname = {
  command: 'gname',
  category: 'GROUPE',
  description: 'Change le nom du groupe',
  groupOnly: true,
  handler: async (ctx) => {
    const { sock, from, argText } = ctx;
    if (!(await requireGroupAdmin(ctx))) return;
    if (!argText) { await sock.sendMessage(from, { text: '• Utilise : .gname <nouveau nom>' }); return; }
    if (argText.length > 100) { await sock.sendMessage(from, { text: '• Nom trop long (100 caractères maximum).' }); return; }
    try {
      await group.setSubject(sock, from, argText);
      await sock.sendMessage(from, { text: '✅ Nom du groupe mis à jour.' });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${group.friendlyGroupError(err)}` });
    }
  },
};

const gpp = {
  command: 'gpp',
  category: 'GROUPE',
  description: 'Change la photo du groupe (cite ou envoie une image)',
  groupOnly: true,
  handler: async (ctx) => {
    const { sock, from, msg } = ctx;
    if (!(await requireGroupAdmin(ctx))) return;
    const buffer = await getQuotedImageBuffer(msg, from);
    if (!buffer) { await sock.sendMessage(from, { text: '• Envoie ou cite une image avec .gpp' }); return; }
    try {
      await group.setGroupPicture(sock, from, buffer);
      await sock.sendMessage(from, { text: '✅ Photo du groupe mise à jour.' });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${group.friendlyGroupError(err)}` });
    }
  },
};

const revoke = {
  command: 'revoke',
  category: 'GROUPE',
  description: "Réinitialise le lien d'invitation (l'ancien ne marche plus)",
  groupOnly: true,
  handler: async (ctx) => {
    const { sock, from } = ctx;
    if (!(await requireGroupAdmin(ctx))) return;
    try {
      const link = await group.revokeInvite(sock, from);
      await sock.sendMessage(from, { text: `🔁 Nouveau lien :\n${link}` });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${group.friendlyGroupError(err)}` });
    }
  },
};

export default [kick, promote, demote, mute, unmute, lock, unlock, acceptall, rejectall, add, clean, invite, tagall, htag, gs, desc, gname, gpp, revoke];
