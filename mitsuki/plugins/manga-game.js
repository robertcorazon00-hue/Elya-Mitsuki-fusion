import * as mangaGame from '../commands/manga-game.js';

const animestart = {
  command: 'animestart',
  category: 'JEU MANGA',
  description: 'Ouvre un lobby pour le jeu "devine le personnage manga/anime"',
  groupOnly: true,
  handler: async ({ sock, from }) => {
    await sock.sendMessage(from, { text: mangaGame.animestart(from) });
  },
};

const mjoin = {
  command: 'mjoin',
  category: 'JEU MANGA',
  description: 'Rejoint le lobby du jeu manga en attente',
  groupOnly: true,
  handler: async ({ sock, from, sender, msg }) => {
    const senderName = msg.pushName || sender.split('@')[0];
    await sock.sendMessage(from, { text: mangaGame.mjoin(from, sender, senderName) });
  },
};

const go = {
  command: 'go',
  category: 'JEU MANGA',
  description: 'Démarre la partie de jeu manga et pose la première question',
  groupOnly: true,
  handler: async ({ sock, from }) => {
    await mangaGame.go(sock, from);
  },
};

const classement = {
  command: 'classement',
  category: 'JEU MANGA',
  description: 'Affiche le classement de la partie en cours',
  groupOnly: true,
  handler: async ({ sock, from }) => {
    await sock.sendMessage(from, { text: mangaGame.classement(from) });
  },
};

const animestop = {
  command: 'animestop',
  category: 'JEU MANGA',
  description: 'Arrête la partie de jeu manga en cours',
  groupOnly: true,
  handler: async ({ sock, from }) => {
    await sock.sendMessage(from, { text: mangaGame.animestop(from) });
  },
};

export default [animestart, mjoin, go, classement, animestop];
