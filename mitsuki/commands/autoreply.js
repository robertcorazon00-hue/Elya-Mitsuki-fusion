// commands/autoreply.js
import { getBotSettings, setBotSetting } from '../storage.js';
import { buildCard } from '../card.js';

export const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes par contact/conversation

// Vérifie si on doit auto-répondre à ce message, applique le cooldown si oui.
// Retourne { message, mentions } si il faut répondre, sinon null.
export function check(msg, botJid) {
  const settings = getBotSettings();
  if (!settings.autoreply?.enabled) return null;
  if (msg.key.fromMe) return null;

  const jid = msg.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');
  const sender = msg.key.participant || jid;

  const text =
    msg.message.conversation || msg.message.extendedTextMessage?.text || '';
  const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const isMentioned = isGroup && botJid && mentionedJid.includes(botJid);

  const triggerDM = !isGroup && settings.autoreply.dm;
  const triggerGroup = isGroup && settings.autoreply.groupMention && isMentioned;
  if (!triggerDM && !triggerGroup) return null;

  const cooldownKey = `${sender}-${jid}`;
  const last = settings.autoreply.cooldowns[cooldownKey] || 0;
  if (Date.now() - last < COOLDOWN_MS) return null;

  settings.autoreply.cooldowns[cooldownKey] = Date.now();
  setBotSetting('autoreply', settings.autoreply);

  return {
    message: settings.autoreply.message,
    mentions: isGroup ? [sender] : [],
  };
}

// .autoreply on / off
export function toggle(arg) {
  const settings = getBotSettings();
  if (!arg) {
    return buildCard('Auto-reply', [['Statut', settings.autoreply.enabled ? 'Active' : 'Desactive']]);
  }
  settings.autoreply.enabled = arg.toLowerCase() === 'on';
  setBotSetting('autoreply', settings.autoreply);
  return buildCard('Auto-reply', [['Statut', settings.autoreply.enabled ? 'Active ✅' : 'Desactive ❌']]);
}

// .autoreply msg <texte>
export function setMessage(text) {
  const settings = getBotSettings();
  settings.autoreply.message = text;
  setBotSetting('autoreply', settings.autoreply);
  return buildCard('Auto-reply — Message', [['Nouveau message', text]]);
}

// .autoreply status
export function status() {
  const settings = getBotSettings();
  return buildCard('Auto-reply — Statut', [
    ['Active', settings.autoreply.enabled ? 'Oui' : 'Non'],
    ['DM', settings.autoreply.dm ? 'Oui' : 'Non'],
    ['Mention groupe', settings.autoreply.groupMention ? 'Oui' : 'Non'],
    ['Message', settings.autoreply.message],
  ]);
}
