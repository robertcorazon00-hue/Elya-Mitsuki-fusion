// card.js — Construit les cartes de résultat dans le style validé
import { bold, boldCmd } from './menu.js';
import { OWNER, BOT_NAME } from './config.js';
// Carte avec titre + champs clé/valeur, chacun dans son propre encadré
function buildCard(title, fields) {
  const lines = [];
  lines.push('╭─────────────┄');
  lines.push(`│ ${bold(title.toUpperCase())}`);
  lines.push('╰─────────────┄');
  lines.push('');

  for (const [label, value] of fields) {
    lines.push(`│ ${bold(label)} : ${value}`);
  }

  lines.push('');
  lines.push(`${bold(BOT_NAME.toUpperCase())} · ${boldCmd(`by ${OWNER}`)}`);

  return lines.map((l) => `> ${l}`).join('\n');
}

// Carte simple pour les réponses IA (juste un bloc de texte)
function buildAiCard(title, answer) {
  const lines = [];
  lines.push('╭─────────────┄');
  lines.push(`│ ${bold(title.toUpperCase())}`);
  lines.push('╰─────────────┄');
  lines.push('');
  lines.push(answer);
  lines.push('');
  lines.push(`${bold(BOT_NAME.toUpperCase())} · ${boldCmd(`by ${OWNER}`)}`);

  return lines.map((l) => `> ${l}`).join('\n');
}

// Liste des membres taggés, chacun dans son propre cadre (pour .tagall)
function buildTagAllCard(mentions, message) {
  const lines = [];
  lines.push('╭─────────────┄');
  lines.push(`│ ${bold('TAG ALL MEMBERS')}`);
  lines.push('╰─────────────┄');
  if (message) {
    lines.push(message);
  }
  lines.push('');
  for (const jid of mentions) {
    lines.push(`│ · @${jid.split('@')[0]}`);
  }
  lines.push('');
  lines.push(`${bold('Total')} : ${mentions.length} membres`);

  return lines.map((l) => `> ${l}`).join('\n');
}

// .gs — statut de groupe, template dédié (pas de cadre en boîte, séparateurs en pointillés)
function buildGroupStatusCard(message) {
  const lines = [];
  lines.push(`${boldCmd('Groupe statut')}`);
  lines.push('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');
  lines.push(`${boldCmd(message)}`);
  lines.push('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');
  lines.push(`${boldCmd('By ')}${bold('MITSUKI MD')}`);

  return lines.join('\n');
}

export { buildCard, buildAiCard, buildTagAllCard, buildGroupStatusCard };
