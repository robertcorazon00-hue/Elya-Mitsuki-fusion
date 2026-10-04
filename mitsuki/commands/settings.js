// commands/settings.js — Toggles .antilink on/off, .autoreact on/off, etc.
import { getGroupSettings, setGroupSetting } from '../storage.js';
import { buildCard } from '../card.js';

export const TOGGLE_KEYS = [
  'antilink', 'antispam', 'antibot', 'antiedit', 'antidelete', 'antihidetag',
  'autoreact', 'autoread', 'autosave',
];

// .antilink on / .antilink off / .antilink (affiche l'état actuel)
export function toggle(groupJid, key, arg) {
  const settings = getGroupSettings(groupJid);

  if (!arg) {
    return buildCard(key, [['Statut', settings[key] ? 'Active' : 'Desactive']]);
  }

  const value = arg.toLowerCase() === 'on';
  setGroupSetting(groupJid, key, value);
  return buildCard(key, [['Statut', value ? 'Active ✅' : 'Desactive ❌']]);
}

// Vérifie si un message contient un lien (pour antilink)
export function containsLink(text) {
  return /(https?:\/\/|www\.|chat\.whatsapp\.com)/i.test(text || '');
}

// Détecte un "hidden tag" : mentions présentes dans contextInfo mais pas visibles
// dans le texte affiché (mentionedJid/nonJidMentions > nombre de "@123..." écrits)
export function detectHiddenTag(msg) {
  const extended = msg.message?.extendedTextMessage;
  if (!extended) return { detected: false };

  const { text, contextInfo } = extended;
  const mentioned = contextInfo?.mentionedJid || [];
  const nonJidCount = contextInfo?.nonJidMentions || 0;
  const totalMentions = mentioned.length + nonJidCount;

  const visibleMentions = (text?.match(/@\d+/g) || []).length;

  if (totalMentions > visibleMentions) {
    return { detected: true, hiddenCount: totalMentions - visibleMentions };
  }
  return { detected: false };
}
