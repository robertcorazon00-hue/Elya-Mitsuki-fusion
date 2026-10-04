import { BOT_NAME } from '../config.js';

const ping = {
  command: 'ping',
  category: 'GENERAL',
  description: 'Vérifie que le bot répond et affiche la latence',
  handler: async ({ sock, from, msg }) => {
    const ts = Number(msg.messageTimestamp) * 1000;
    const delay = Date.now() - ts;
    await sock.sendMessage(from, { text: `🏓 Pong ! ${delay}ms` });
  },
};

const apropos = {
  command: 'apropos',
  category: 'GENERAL',
  description: 'Informations sur le bot',
  handler: async ({ sock, from }) => {
    await sock.sendMessage(from, {
      text: `> *${BOT_NAME}*\n> Fusion Elya AI + Mitsuki Kiryu-MD\n> Node.js + Baileys`,
    });
  },
};

export default [ping, apropos];
