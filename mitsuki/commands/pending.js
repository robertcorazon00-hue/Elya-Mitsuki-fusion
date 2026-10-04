// commands/pending.js — Commandes du menu sans implémentation pour l'instant
import { buildCard } from '../card.js';

// Liste des commandes qui existent dans le menu mais ne sont pas encore faisables
export const PENDING_COMMANDS = ['pair'];

// Raison affichée pour chaque commande en attente (défaut : API non configurée)
const REASONS = {
  pair: 'Demande un mode multi-session (non pris en charge)',
};

export function pendingReply(cmd) {
  return buildCard('Bientot disponible', [
    ['Commande', `.${cmd}`],
    ['Statut', REASONS[cmd] || 'API pas encore configuree'],
  ]);
}
