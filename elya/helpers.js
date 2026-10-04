// elya/helpers.js — Utilitaires purs d'Elya AI (aucune dépendance à io/sock/BDD),
// extraits de server.js pour être réutilisables depuis les plugins.
import { saveData, userCountsStore } from './store.js';

// ─── Personnalités (commande .personnalite) ───
export const PERSONALITIES = {
  prof: "Pour cette conversation, tu adoptes un ton de professeur pédagogue : claire, patiente, tu expliques étape par étape avec des exemples concrets.",
  psy: "Pour cette conversation, tu adoptes un ton de psychologue bienveillant(e) : à l'écoute, empathique, tu poses des questions douces et valides les émotions sans jamais juger.",
  dev: "Pour cette conversation, tu adoptes un ton de développeuse senior : directe, technique, concise, tu vas droit au but avec du code et des exemples pratiques.",
  drole: "Pour cette conversation, tu adoptes un ton léger et plein d'humour : jeux de mots, private jokes, tu essaies de faire sourire à chaque réponse.",
  mamie: "Pour cette conversation, tu adoptes le ton chaleureux d'une grand-mère pleine de sagesse et de tendresse : conseils de vie donnés avec douceur, expressions un peu vieillottes et attendrissantes, toujours rassurante.",
  normal: "Pour cette conversation, tu parles comme une jeune femme normale, bien éduquée et naturelle — pas comme une IA qui teste des fonctionnalités ou multiplie les emojis. Tu es posée, polie, tu vouvoies au début si la personne te vouvoie, et tu salues naturellement en utilisant son prénom quand tu le connais (ex: \"Salut [prénom], comment allez-vous ?\"). Tes réponses sont sobres, courtes, avec un ton chaleureux mais discret, comme une vraie conversation entre deux personnes polies qui se découvrent.",
  // Texte générique (affiché dans le menu .personnalite) — la version réellement
  // utilisée est construite dans providers.js/getSystemPrompt, différente selon
  // que c'est Robert (le owner) ou quelqu'un d'autre qui écrit, voir COPINE_OWNER
  // et COPINE_OTHERS là-bas.
  copine: "Pour cette conversation, tu joues avec Robert un petit jeu de rôle de couple — affectueux et léger, jamais explicite. Avec les autres personnes du chat, tu restes toi-même."
};

// ─── Date relative pour les souvenirs ("hier", "il y a 3 jours"...) ───
export function relativeDate(ts) {
  if (!ts) return '';
  const diffDays = Math.floor((Date.now() - ts) / 86400000);
  if (diffDays <= 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} semaine(s)`;
  return `il y a ${Math.floor(diffDays / 30)} mois`;
}
export function memText(m) {
  return typeof m === 'string' ? m : m.text;
}

// ─── Mini-jeux ───
export function playPFC(choice) {
  const options = ['pierre', 'feuille', 'ciseaux'];
  const bot = options[Math.floor(Math.random() * 3)];
  let result;
  if (choice === bot) result = 'égalité';
  else if (
    (choice === 'pierre' && bot === 'ciseaux') ||
    (choice === 'feuille' && bot === 'pierre') ||
    (choice === 'ciseaux' && bot === 'feuille')
  ) result = 'gagné';
  else result = 'perdu';
  return { bot, result };
}

export function computeMatch(a, b) {
  const str = [a, b].sort().join('-');
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash % 101;
}

export const GENTLE_INSULTS = [
  "espèce de croissant mal cuit 🥐",
  "espèce de chausson aux pommes ambulant 🍎",
  "gros nuage de barbe à papa 🍭",
  "espèce de chaussette dépareillée 🧦",
  "espèce de wifi qui rame le dimanche 📶",
  "espèce de yaourt périmé de la veille 🥣",
  "espèce de télécommande sans piles 📺",
  "gros cornichon attendrissant 🥒",
  "espèce de parapluie qui se retourne au vent ☔",
  "espèce de chargeur qui ne rentre jamais du premier coup 🔌"
];

export const FALLBACK_JOKES = [
  "Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ? Parce que sinon ils tombent dans le bateau ! 😄",
  "Qu'est-ce qu'un crocodile qui surveille la Bourse ? Un Crocodealer 🐊",
  "Pourquoi les développeurs confondent Halloween et Noël ? Parce que OCT 31 == DEC 25 💻"
];

// ─── Suivi des paliers de messages (félicitations auto) ───
export const MILESTONES = [50, 100, 500, 1000, 5000, 10000];
export async function trackUserMilestone(chatId, sender, senderName) {
  if (!userCountsStore[chatId]) userCountsStore[chatId] = {};
  if (!userCountsStore[chatId][sender]) userCountsStore[chatId][sender] = { count: 0, name: senderName, congratulated: [] };
  const u = userCountsStore[chatId][sender];
  u.count++;
  u.name = senderName;
  let hit = null;
  for (const m of MILESTONES) {
    if (u.count >= m && !u.congratulated.includes(m)) {
      u.congratulated.push(m);
      hit = m;
      break;
    }
  }
  await saveData('userCounts', userCountsStore);
  return hit;
}

// ─── Niveaux / titres selon l'activité ───
export const LEVELS = [
  { min: 0, title: 'Nouveau·elle 🌱' },
  { min: 50, title: 'Débutant·e 🌿' },
  { min: 100, title: 'Actif·ve 🔥' },
  { min: 500, title: 'Pilier du groupe 💪' },
  { min: 1000, title: 'Vétéran·e 🏆' },
  { min: 5000, title: 'Légende du groupe 👑' },
  { min: 10000, title: 'Mythique ✨' }
];
export function getLevelTitle(count) {
  let title = LEVELS[0].title;
  for (const l of LEVELS) {
    if (count >= l.min) title = l.title;
  }
  return title;
}
