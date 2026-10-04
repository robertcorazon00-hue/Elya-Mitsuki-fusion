// commands/manga-game.js — Jeu "devine le personnage manga/anime"
//
// Ce fichier n'existait dans AUCUN des deux projets récupérés : seules des traces
// (icônes dans menu.js, interception dans handler.js, commandes .animestart/.mjoin/
// .go/.classement/.animestop) montraient qu'il devait exister. Implémentation
// complète construite ici à partir de ces indices — logique nouvelle, à tester.
import { buildCard } from '../card.js';

// groupJid -> { phase: 'attente'|'jeu', groupJid, players: Map(jid -> {numero, nom, score}),
//               questionIndex, askedIndexes: [], round, maxRounds }
const parties = new Map();
const MAX_ROUNDS = 5;

const QUESTIONS = [
  { indice: "Ninja de Konoha, il rêve de devenir Hokage et porte un renard démoniaque en lui.", reponses: ['naruto'] },
  { indice: "Pirate au chapeau de paille qui peut s'étirer comme du caoutchouc.", reponses: ['luffy', 'monkey d luffy'] },
  { indice: "Chasseur de titans qui a juré de tous les exterminer après la mort de sa mère.", reponses: ['eren', 'eren jaeger', 'eren yeager'] },
  { indice: "Alchimiste blond qui cherche la pierre philosophale avec son frère en armure.", reponses: ['edward elric', 'edward', 'elric'] },
  { indice: "Étudiant qui trouve un cahier capable de tuer quiconque dont le nom y est écrit.", reponses: ['light', 'light yagami', 'kira'] },
  { indice: "Garçon au sabre qui veut devenir le meilleur épéiste du monde et se perd tout le temps.", reponses: ['zorro', 'roronoa zoro', 'zoro'] },
  { indice: "Saiyan au grand cœur qui défend la Terre en devenant Super Saiyan.", reponses: ['goku', 'son goku'] },
  { indice: "Démon-tueur qui protège sa sœur transformée en démon.", reponses: ['tanjiro', 'tanjiro kamado'] },
  { indice: "Jeune sorcier qui avale le doigt d'une malédiction pour sauver ses amis.", reponses: ['yuji', 'yuji itadori'] },
  { indice: "Détective au grand chapeau, transformé en enfant par un poison mystérieux.", reponses: ['conan', 'edogawa conan'] },
];

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function pickQuestionIndex(exclude) {
  const available = QUESTIONS.map((_, i) => i).filter((i) => !exclude.includes(i));
  const pool = available.length ? available : QUESTIONS.map((_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}

function classementText(partie) {
  const sorted = [...partie.players.values()].sort((a, b) => b.score - a.score);
  if (!sorted.length) return buildCard('🏆 Classement', [['Statut', 'Aucun score pour le moment.']]);
  const rows = sorted.map((p, i) => [`${i + 1}. ${p.nom}`, `${p.score} pt(s)`]);
  return buildCard('🏆 Classement', rows);
}

async function askQuestion(sock, partie) {
  const idx = pickQuestionIndex(partie.askedIndexes);
  partie.askedIndexes.push(idx);
  partie.questionIndex = idx;
  partie.round += 1;
  const question = QUESTIONS[idx];
  await sock.sendMessage(partie.groupJid, {
    text: buildCard(`🎲 Manche ${partie.round}/${partie.maxRounds}`, [
      ['Indice', question.indice],
      ['Réponse', 'Tape juste le nom, sans commande.'],
    ]),
  }).catch(() => {});
}

async function endGame(sock, partie) {
  await sock.sendMessage(partie.groupJid, { text: classementText(partie) }).catch(() => {});
  parties.delete(partie.groupJid);
}

// Utilisé par handler.js pour savoir si une partie est en cours dans ce chat.
export function getPartie(groupJid) {
  return parties.get(groupJid) || null;
}

// .animestart — ouvre un lobby
export function animestart(groupJid) {
  if (parties.has(groupJid)) {
    return buildCard('🎮 Jeu Manga', [['Statut', 'Une partie existe déjà dans ce groupe (voir .classement ou .animestop).']]);
  }
  parties.set(groupJid, {
    phase: 'attente',
    groupJid,
    players: new Map(),
    questionIndex: null,
    askedIndexes: [],
    round: 0,
    maxRounds: MAX_ROUNDS,
  });
  return buildCard('🎮 Jeu Manga', [
    ['Statut', 'Lobby ouvert !'],
    ['Rejoindre', 'Tape .mjoin'],
    ['Lancer', 'Tape .go quand tout le monde est prêt'],
  ]);
}

// .mjoin — rejoint le lobby
export function mjoin(groupJid, senderJid, senderName) {
  const partie = parties.get(groupJid);
  if (!partie || partie.phase !== 'attente') {
    return buildCard('🙋 Jeu Manga', [['Statut', "Aucun lobby ouvert — tape .animestart d'abord."]]);
  }
  if (partie.players.has(senderJid)) {
    return buildCard('🙋 Jeu Manga', [['Statut', 'Tu es déjà inscrit(e) !']]);
  }
  partie.players.set(senderJid, { numero: senderJid.split('@')[0], nom: senderName || senderJid.split('@')[0], score: 0 });
  return buildCard('🙋 Jeu Manga', [['Statut', 'Inscription confirmée !'], ['Joueurs', String(partie.players.size)]]);
}

// .go — démarre la partie et pose la première question
export async function go(sock, groupJid) {
  const partie = parties.get(groupJid);
  if (!partie) {
    await sock.sendMessage(groupJid, { text: buildCard('🎲 Jeu Manga', [['Statut', "Aucun lobby ouvert — tape .animestart d'abord."]]) });
    return;
  }
  if (partie.players.size === 0) {
    await sock.sendMessage(groupJid, { text: buildCard('🎲 Jeu Manga', [['Statut', "Personne n'a rejoint — tape .mjoin pour participer."]]) });
    return;
  }
  partie.phase = 'jeu';
  await askQuestion(sock, partie);
}

// .classement — score actuel
export function classement(groupJid) {
  const partie = parties.get(groupJid);
  if (!partie) return buildCard('🏆 Classement', [['Statut', 'Aucune partie en cours.']]);
  return classementText(partie);
}

// .animestop — arrête la partie en cours
export function animestop(groupJid) {
  if (!parties.has(groupJid)) return buildCard('⏹️ Jeu Manga', [['Statut', 'Aucune partie en cours.']]);
  parties.delete(groupJid);
  return buildCard('⏹️ Jeu Manga', [['Statut', 'Partie arrêtée.']]);
}

// Intercepté par handler.js sur chaque message de groupe pendant la phase 'jeu' (sans
// préfixe). Renvoie true si le message a été traité comme une tentative de réponse.
export async function verifierReponse(sock, partie, senderJid, numero, text) {
  if (!partie || partie.phase !== 'jeu' || partie.questionIndex === null) return false;

  const guess = normalize(text);
  if (!guess) return false;

  const question = QUESTIONS[partie.questionIndex];
  const correct = question.reponses.some((r) => normalize(r) === guess);
  if (!correct) return false;

  if (!partie.players.has(senderJid)) {
    partie.players.set(senderJid, { numero, nom: numero, score: 0 });
  }
  const player = partie.players.get(senderJid);
  player.score += 1;

  await sock.sendMessage(partie.groupJid, {
    text: buildCard('✅ Bonne réponse !', [
      ['Personnage', question.reponses[0]],
      ['Gagnant(e)', `@${numero}`],
      ['Score', String(player.score)],
    ]),
    mentions: [senderJid],
  }).catch(() => {});

  if (partie.round >= partie.maxRounds) {
    await endGame(sock, partie);
  } else {
    setTimeout(() => {
      if (parties.get(partie.groupJid) === partie) askQuestion(sock, partie);
    }, 3000);
  }
  return true;
}
