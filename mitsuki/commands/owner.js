// commands/owner.js
import { setUserSetting, getUserSettings, setBotSetting, getBotSettings } from '../storage.js';
import { buildCard } from '../card.js';

export function ban(targetJid) {
  setUserSetting(targetJid, 'banned', true);
  return buildCard('Ban', [['Utilisateur', `@${targetJid.split('@')[0]}`], ['Statut', 'Banni 🚫']]);
}

export function unban(targetJid) {
  setUserSetting(targetJid, 'banned', false);
  return buildCard('Unban', [['Utilisateur', `@${targetJid.split('@')[0]}`], ['Statut', 'Debanni ✅']]);
}

export function setName(newName) {
  setBotSetting('name', newName);
  return buildCard('Nom du bot', [['Nouveau nom', newName]]);
}

export function setMode(mode) {
  const value = mode.toLowerCase() === 'private' || mode.toLowerCase() === 'prive' ? 'private' : 'public';
  setBotSetting('mode', value);
  return buildCard('Mode', [['Nouveau mode', value === 'private' ? 'Prive 🔒' : 'Public 🌐']]);
}

// .broadcast <message> — envoie un message à tous les groupes du bot
export async function broadcast(sock, message) {
  const groups = await sock.groupFetchAllParticipating();
  const jids = Object.keys(groups);

  for (const jid of jids) {
    await sock.sendMessage(jid, { text: buildCard('Annonce', [['Message', message]]) });
  }

  return jids.length;
}

// .createchannel <nom> | <description> — crée un vrai Canal WhatsApp officiel (une seule fois,
// le JID est sauvegardé pour que .post l'utilise automatiquement ensuite)
export async function createChannel(sock, name, description) {
  const result = await sock.newsletterCreate(name, description || '');
  const jid = result.id;
  setBotSetting('channelJid', jid);
  const inviteCode = result.invite || result.inviteCode || jid.split('@')[0];

  return buildCard('Canal cree', [
    ['Nom', name],
    ['Lien', `https://whatsapp.com/channel/${inviteCode}`],
    ['Astuce', 'Utilise .post <message> pour publier dedans'],
  ]);
}

// .post <message> — publie dans le Canal WhatsApp déjà créé (voir .createchannel)
export async function postChannel(sock, message) {
  const jid = getBotSettings().channelJid;
  if (!jid) throw new Error('Aucun canal cree — utilise .createchannel <nom> dabord.');
  await sock.sendMessage(jid, { text: message });
  return buildCard('Publie dans le canal', [['Message', message]]);
}

// .setchannel <lien> — lie un Canal WhatsApp déjà existant (au lieu d'en créer un nouveau)
export async function setChannel(sock, link) {
  const code = link.trim().split('/').pop();
  if (!code) throw new Error('Lien de canal invalide.');

  const metadata = await sock.newsletterMetadata('invite', code);
  if (!metadata?.id) throw new Error('Canal introuvable — verifie le lien.');

  setBotSetting('channelJid', metadata.id);

  return buildCard('Canal lie', [
    ['Nom', metadata.name || 'Inconnu'],
    ['Abonnes', metadata.subscriberCount ?? '?'],
    ['Astuce', 'Utilise .post <message> pour publier dedans'],
  ]);
}
