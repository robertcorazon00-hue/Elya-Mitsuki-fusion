// commands/status.js
import { getBotSettings, setBotSetting } from '../storage.js';
import { buildCard } from '../card.js';

export const STATUS_TOGGLE_KEYS = ['autoreplystatus', 'autolikestatus', 'autoreadstatus'];

// .setautoreplystatus on/off — répond automatiquement aux statuts vus
export function toggleStatusSetting(key, arg) {
  const settings = getBotSettings();
  if (!arg) {
    return buildCard(key, [['Statut', settings[key] ? 'Active' : 'Desactive']]);
  }
  const value = arg.toLowerCase() === 'on';
  setBotSetting(key, value);
  return buildCard(key, [['Statut', value ? 'Active ✅' : 'Desactive ❌']]);
}

// .statusemojis <emojis> — définit les emojis utilisés pour l'auto-like des statuts
export function setStatusEmojis(emojiList) {
  setBotSetting('statusEmojis', emojiList);
  return buildCard('Status Emojis', [['Emojis', emojiList.join(' ')]]);
}

// Gestionnaire à appeler sur chaque statut reçu (status@broadcast)
export async function handleIncomingStatus(sock, statusMsg) {
  const settings = getBotSettings();
  const statusJid = statusMsg.key.remoteJid;
  const participant = statusMsg.key.participant;

  if (settings.autoreadstatus) {
    await sock.readMessages([statusMsg.key]);
  }

  if (settings.autolikestatus) {
    const emojis = settings.statusEmojis?.length ? settings.statusEmojis : ['🌸'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    await sock.sendMessage(statusJid, { react: { text: emoji, key: statusMsg.key } }, { statusJidList: [participant] });
  }

  if (settings.autoreplystatus) {
    await sock.sendMessage(participant, { text: '🌸 Vu ton statut !' });
  }
}
