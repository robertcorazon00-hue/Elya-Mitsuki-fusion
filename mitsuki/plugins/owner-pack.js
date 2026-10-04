import * as owner from '../commands/owner.js';
import * as user from '../commands/user.js';
import { getQuotedImageBuffer } from '../pluginHelpers.js';

const unban = {
  command: 'unban',
  category: 'OWNER',
  description: 'Débannit un utilisateur (réponds à son message)',
  ownerOnly: true,
  handler: async ({ sock, from, msg }) => {
    const target = msg.message.extendedTextMessage?.contextInfo?.participant;
    if (!target) { await sock.sendMessage(from, { text: '• Réponds au message de la personne à débannir.' }); return; }
    await sock.sendMessage(from, { text: owner.unban(target) });
  },
};

const setname = {
  command: 'setname',
  category: 'OWNER',
  description: 'Change le nom affiché du bot',
  ownerOnly: true,
  handler: async ({ sock, from, argText }) => {
    if (!argText) { await sock.sendMessage(from, { text: '• Utilise : .setname <nouveau nom>' }); return; }
    await sock.sendMessage(from, { text: owner.setName(argText) });
  },
};

const mode = {
  command: 'mode',
  category: 'OWNER',
  description: 'Change le mode du bot (public/private)',
  ownerOnly: true,
  handler: async ({ sock, from, argText }) => {
    if (!argText) { await sock.sendMessage(from, { text: '• Utilise : .mode public|private' }); return; }
    await sock.sendMessage(from, { text: owner.setMode(argText) });
  },
};

const createchannel = {
  command: 'createchannel',
  category: 'OWNER',
  description: 'Crée un Canal WhatsApp (nom | description)',
  ownerOnly: true,
  handler: async ({ sock, from, argText }) => {
    const [name, description] = (argText || '').split('|').map((s) => s?.trim());
    if (!name) { await sock.sendMessage(from, { text: '• Utilise : .createchannel <nom> | <description>' }); return; }
    try {
      await sock.sendMessage(from, { text: await owner.createChannel(sock, name, description) });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};

const post = {
  command: 'post',
  category: 'OWNER',
  description: 'Publie un message dans le Canal WhatsApp lié',
  ownerOnly: true,
  handler: async ({ sock, from, argText }) => {
    if (!argText) { await sock.sendMessage(from, { text: '• Utilise : .post <message>' }); return; }
    try {
      await sock.sendMessage(from, { text: await owner.postChannel(sock, argText) });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};

const setpp = {
  command: 'setpp',
  category: 'OWNER',
  description: 'Change la photo de profil du bot (cite une image)',
  ownerOnly: true,
  handler: async ({ sock, from, msg }) => {
    const buffer = await getQuotedImageBuffer(msg, from);
    if (!buffer) { await sock.sendMessage(from, { text: '• Cite une image avec .setpp' }); return; }
    try {
      await user.setpp(sock, buffer);
      await sock.sendMessage(from, { text: '✅ Photo de profil mise à jour.' });
    } catch (err) {
      await sock.sendMessage(from, { text: `• ${err.message}` });
    }
  },
};

export default [unban, setname, mode, createchannel, post, setpp];
