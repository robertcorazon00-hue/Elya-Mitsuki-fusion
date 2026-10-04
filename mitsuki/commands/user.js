// commands/user.js
import { setUserSetting, getUserSettings } from '../storage.js';
import { buildCard } from '../card.js';

// .set <cle> <valeur> — stocke un réglage personnalisé pour l'utilisateur
export function setPreference(senderJid, key, value) {
  setUserSetting(senderJid, key, value);
  return buildCard('Reglage enregistre', [[key, value]]);
}

// .setting — affiche les réglages personnalisés de l'utilisateur
export function showSettings(senderJid) {
  const settings = getUserSettings(senderJid);
  const entries = Object.entries(settings).filter(([k]) => !['blocked', 'banned'].includes(k));
  if (!entries.length) return buildCard('Reglages', [['Statut', 'Aucun reglage personnalise pour le moment.']]);
  return buildCard('Reglages', entries);
}

// .active — marque l'utilisateur comme "actif" (utile pour des stats/rappels)
export function markActive(senderJid) {
  setUserSetting(senderJid, 'active', true);
  return buildCard('Active', [['Statut', 'Marque comme actif ✅']]);
}

// .apply — confirme/rappelle les réglages actuellement enregistrés
export function applySettings(senderJid) {
  return showSettings(senderJid);
}

// .profile — affiche les infos de base d'un contact (le répondu, ou l'expéditeur sinon)
export async function profile(sock, targetJid) {
  let status = 'Non disponible';
  try {
    const res = await sock.fetchStatus(targetJid);
    status = res?.status || status;
  } catch (_) {}

  return buildCard('Profil', [
    ['Contact', `@${targetJid.split('@')[0]}`],
    ['Statut', status],
  ]);
}

export function block(targetJid) {
  setUserSetting(targetJid, 'blocked', true);
  return buildCard('Block', [['Contact', `@${targetJid.split('@')[0]}`], ['Statut', 'Bloque 🚫']]);
}

export function unblock(targetJid) {
  setUserSetting(targetJid, 'blocked', false);
  return buildCard('Unblock', [['Contact', `@${targetJid.split('@')[0]}`], ['Statut', 'Debloque ✅']]);
}

// Applique réellement le blocage WhatsApp (en plus du flag stocké)
export async function applyBlock(sock, targetJid) {
  await sock.updateBlockStatus(targetJid, 'block');
}
export async function applyUnblock(sock, targetJid) {
  await sock.updateBlockStatus(targetJid, 'unblock');
}

// .jid — renvoie le JID du chat actuel ou d'un contact cité
export function jid(currentJid) {
  return buildCard('JID', [['Identifiant', currentJid]]);
}

// .setpp — change la photo de profil du bot lui-même
export async function setpp(sock, imageBuffer) {
  await sock.updateProfilePicture(sock.user.id, imageBuffer);
}

// .fullpp / .getdp — récupère la photo de profil d'un contact en taille réelle
export async function getProfilePicture(sock, targetJid) {
  try {
    return await sock.profilePictureUrl(targetJid, 'image');
  } catch (_) {
    return null;
  }
}

// .leave — le bot quitte le groupe actuel
export async function leave(sock, groupJid) {
  await sock.groupLeave(groupJid);
}

// .join <lien> — le bot rejoint un groupe via un lien d'invitation
export async function join(sock, inviteLink) {
  const code = inviteLink.split('/').pop();
  await sock.groupAcceptInvite(code);
}
