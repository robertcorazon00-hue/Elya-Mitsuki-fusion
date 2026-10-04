// commands/group.js
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { buildTagAllCard, buildCard, buildGroupStatusCard } from '../card.js';

// .tagall [message] — mentionne tous les membres du groupe
export async function tagAll(sock, msg, customMessage) {
  const groupJid = msg.key.remoteJid;
  const metadata = await sock.groupMetadata(groupJid);
  const mentions = metadata.participants.map((p) => p.id);

  const text = buildTagAllCard(mentions, customMessage);

  await sock.sendMessage(groupJid, {
    text,
    mentions,
  });
}

// .htag [message] — "hidden tag" : notifie tout le groupe sans afficher les @,
// via mentionedJid (le texte reste propre mais tout le monde reçoit la notification)
export async function hiddenTagAll(sock, msg, customMessage) {
  const groupJid = msg.key.remoteJid;
  const metadata = await sock.groupMetadata(groupJid);
  const participants = metadata.participants.map((p) => p.id);
  const text = customMessage || '📢 Annonce pour tout le monde';

  await sock.relayMessage(
    groupJid,
    {
      extendedTextMessage: {
        text,
        contextInfo: { mentionedJid: participants },
      },
    },
    {}
  );
}

// .gs [texte] — publie du texte, ou répond à une image/vidéo/audio pour la republier en STATUT,
// visible uniquement par les membres du groupe où la commande est utilisée
export async function groupStatus(sock, msg, customText) {
  const groupJid = msg.key.remoteJid;
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = contextInfo?.quotedMessage;

  const metadata = await sock.groupMetadata(groupJid);
  const participants = metadata.participants.map((p) => p.id);

  // Pas de média cité -> statut texte simple (si un texte a été fourni)
  if (!quoted) {
    if (!customText) {
      await sock.sendMessage(groupJid, {
        text:
          '🌸 Utilise *.gs <texte>* pour un statut texte, ou réponds à une image/vidéo/audio avec *.gs* pour le publier en statut du groupe.',
      });
      return;
    }

    // Bug corrigé : ceci était envoyé à groupJid (donc publié dans le groupe
    // au lieu du statut) — seules les branches image/vidéo/audio ci-dessous
    // ciblaient déjà correctement 'status@broadcast'.
    await sock.sendMessage(
      'status@broadcast',
      {
        text: buildGroupStatusCard(customText),
        contextInfo: { mentionedJid: participants, isGroupStatus: true },
      },
      { backgroundColor: '#000000', statusJidList: participants }
    );
    await sock.sendMessage(groupJid, { text: '🌸 Statut texte publié avec succès.' });
    return;
  }

  const mediaType = quoted.imageMessage
    ? 'image'
    : quoted.videoMessage
    ? 'video'
    : quoted.audioMessage
    ? 'audio'
    : null;

  if (!mediaType) {
    await sock.sendMessage(groupJid, {
      text: '🌸 Ce message ne contient pas de média publiable en statut (image/vidéo/audio).',
    });
    return;
  }

  // Reconstruit un message complet (clé + contenu) pour pouvoir télécharger le média cité.
  // L'URL brute dans imageMessage/videoMessage est chiffrée et inutilisable directement.
  const quotedFullMsg = {
    key: {
      remoteJid: groupJid,
      id: contextInfo.stanzaId,
      participant: contextInfo.participant,
    },
    message: quoted,
  };

  const buffer = await downloadMediaMessage(quotedFullMsg, 'buffer', {});
  const contextInfoOut = { mentionedJid: participants, isGroupStatus: true };
  const sendOpts = { statusJidList: participants };

  if (mediaType === 'image') {
    await sock.sendMessage(
      'status@broadcast',
      { image: buffer, caption: customText || quoted.imageMessage.caption || '', contextInfo: contextInfoOut },
      sendOpts
    );
  } else if (mediaType === 'video') {
    await sock.sendMessage(
      'status@broadcast',
      { video: buffer, caption: customText || quoted.videoMessage.caption || '', contextInfo: contextInfoOut },
      sendOpts
    );
  } else {
    await sock.sendMessage(
      'status@broadcast',
      { audio: buffer, mimetype: 'audio/mp4', ptt: false, contextInfo: contextInfoOut },
      sendOpts
    );
  }

  await sock.sendMessage(groupJid, {
    text: `🌸 Statut (${mediaType}) publié — visible par les ${participants.length} membres du groupe.`,
  });
}

// Squelettes pour les autres commandes groupe (natif Baileys)
export async function kick(sock, groupJid, targetJid) {
  await sock.groupParticipantsUpdate(groupJid, [targetJid], 'remove');
}

// .add <numero> — ajoute un membre au groupe
export async function add(sock, groupJid, targetJid) {
  await sock.groupParticipantsUpdate(groupJid, [targetJid], 'add');
}

// .clean — retire les membres dont le numéro n'existe plus sur WhatsApp (comptes supprimés)
export async function clean(sock, groupJid) {
  const metadata = await sock.groupMetadata(groupJid);
  const toRemove = [];
  for (const p of metadata.participants) {
    try {
      const [result] = await sock.onWhatsApp(p.id.split('@')[0]);
      if (!result?.exists) toRemove.push(p.id);
    } catch (_) {}
  }
  if (toRemove.length) await sock.groupParticipantsUpdate(groupJid, toRemove, 'remove');
  return toRemove.length;
}
export async function promote(sock, groupJid, targetJid) {
  await sock.groupParticipantsUpdate(groupJid, [targetJid], 'promote');
}
export async function demote(sock, groupJid, targetJid) {
  await sock.groupParticipantsUpdate(groupJid, [targetJid], 'demote');
}

// .mute — seuls les admins peuvent écrire
export async function mute(sock, groupJid) {
  await sock.groupSettingUpdate(groupJid, 'announcement');
}
// .unmute — tout le monde peut écrire
export async function unmute(sock, groupJid) {
  await sock.groupSettingUpdate(groupJid, 'not_announcement');
}

// .lock — seuls les admins peuvent changer les infos du groupe
export async function lock(sock, groupJid) {
  await sock.groupSettingUpdate(groupJid, 'locked');
}
export async function unlock(sock, groupJid) {
  await sock.groupSettingUpdate(groupJid, 'unlocked');
}

// .invite — renvoie le lien d'invitation du groupe
export async function invite(sock, groupJid) {
  const code = await sock.groupInviteCode(groupJid);
  return `https://chat.whatsapp.com/${code}`;
}

// .groupinfo — infos générales du groupe
export async function groupInfo(sock, groupJid) {
  const metadata = await sock.groupMetadata(groupJid);
  return {
    subject: metadata.subject,
    participants: metadata.participants.length,
    owner: metadata.owner,
    description: metadata.desc || 'Aucune description',
  };
}

// .acceptall / .rejectall — gère les demandes d'adhésion en attente
export async function acceptAll(sock, groupJid) {
  const requests = await sock.groupRequestParticipantsList(groupJid);
  const jids = requests.map((r) => r.jid);
  if (jids.length) await sock.groupRequestParticipantsUpdate(groupJid, jids, 'approve');
  return jids.length;
}
export async function rejectAll(sock, groupJid) {
  const requests = await sock.groupRequestParticipantsList(groupJid);
  const jids = requests.map((r) => r.jid);
  if (jids.length) await sock.groupRequestParticipantsUpdate(groupJid, jids, 'reject');
  return jids.length;
}

// ── Ajoutés pour la fusion (absents de la version d'origine récupérée) ──
// Requis par pluginHelpers.js (requireGroupAdmin) et plugins/kickall.js — reconstruits
// par déduction de leur usage, pas retrouvés dans le zip d'origine.

// Vrai si `senderJid` est admin/superadmin du groupe `groupJid`.
export async function isSenderAdmin(sock, groupJid, senderJid) {
  try {
    const metadata = await sock.groupMetadata(groupJid);
    const participant = metadata.participants.find((p) => p.id === senderJid);
    return !!participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
  } catch (_) {
    return false;
  }
}

// Vrai si le bot lui-même est admin/superadmin du groupe (nécessaire pour kick/promote/etc.)
export async function isBotAdmin(sock, groupJid) {
  try {
    const metadata = await sock.groupMetadata(groupJid);
    const botNumber = sock.user?.id?.split(':')[0];
    const me = metadata.participants.find((p) => p.id.split('@')[0] === botNumber);
    return !!me && (me.admin === 'admin' || me.admin === 'superadmin');
  } catch (_) {
    return false;
  }
}

// Expulse tous les membres non-admins du groupe (le bot doit être admin). Renvoie le nombre expulsé.
export async function kickAll(sock, groupJid) {
  const metadata = await sock.groupMetadata(groupJid);
  const botNumber = sock.user?.id?.split(':')[0];
  const toKick = metadata.participants
    .filter((p) => !p.admin && p.id.split('@')[0] !== botNumber)
    .map((p) => p.id);
  if (toKick.length) await sock.groupParticipantsUpdate(groupJid, toKick, 'remove');
  return toKick.length;
}

// Traduit une erreur Baileys/WhatsApp technique en message compréhensible côté groupe.
export function friendlyGroupError(err) {
  const msg = err?.message || String(err || '');
  if (/rate-overlimit|rate.?limit/i.test(msg)) return 'Trop de demandes en peu de temps, réessaie dans quelques minutes.';
  if (/forbidden|not-authorized|401|403/i.test(msg)) return "Je n'ai pas la permission de faire ça dans ce groupe.";
  if (/not-acceptable|404/i.test(msg)) return 'Action impossible — vérifie que le groupe existe toujours.';
  return msg || 'Une erreur est survenue.';
}

// ── .desc / .gname / .gpp / .revoke — ajoutés (le menu les listait sans logique derrière) ──

// .desc <texte> — change la description du groupe
export async function setDescription(sock, groupJid, text) {
  await sock.groupUpdateDescription(groupJid, text);
}

// .gname <nom> — change le nom du groupe
export async function setSubject(sock, groupJid, text) {
  await sock.groupUpdateSubject(groupJid, text);
}

// .gpp — change la photo du groupe (image citée ou envoyée avec la commande)
export async function setGroupPicture(sock, groupJid, imageBuffer) {
  await sock.updateProfilePicture(groupJid, imageBuffer);
}

// .revoke — réinitialise le lien d'invitation et renvoie le nouveau
export async function revokeInvite(sock, groupJid) {
  const code = await sock.groupRevokeInvite(groupJid);
  return `https://chat.whatsapp.com/${code}`;
}
