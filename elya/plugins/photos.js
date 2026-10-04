import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { photosStore, PHOTOS_DIR, saveData } from '../store.js';
import { PREFIX } from '../config.js';

// Récupère le buffer d'une image (envoyée directement en légende, ou citée en réponse)
async function getImageBuffer(msg) {
  const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
  if (msg.message?.imageMessage) {
    return downloadMediaMessage(msg, 'buffer', {});
  }
  if (quotedInfo?.quotedMessage?.imageMessage) {
    const fakeMsg = {
      key: { remoteJid: msg.key.remoteJid, id: quotedInfo.stanzaId, participant: quotedInfo.participant },
      message: quotedInfo.quotedMessage,
    };
    return downloadMediaMessage(fakeMsg, 'buffer', {});
  }
  return null;
}

// Un nom de fichier sûr, dérivé du numéro de l'expéditeur (évite tout souci de caractères spéciaux)
function safeSenderFolder(sender) {
  return sender.replace(/[^a-zA-Z0-9]/g, '_');
}

const addp = {
  command: 'addp',
  aliases: ['addphoto', 'addpicture'],
  category: 'GENERAL',
  description: 'Enregistre une photo sous un nom, pour la renvoyer plus tard avec !givp',
  handler: async ({ sock, chatId, sender, msg, args }) => {
    const nom = args.slice(1).join(' ').trim().toLowerCase();
    if (!nom) {
      await sock.sendMessage(chatId, { text: `📸 Utilise : ${PREFIX}addp <nom>\nEnvoie l'image avec cette légende, ou réponds à une image avec cette commande.\nEx: ${PREFIX}addp photo1` });
      return;
    }

    const buffer = await getImageBuffer(msg);
    if (!buffer) {
      await sock.sendMessage(chatId, { text: `📸 Envoie l'image avec ${PREFIX}addp ${nom} en légende, ou réponds à une image avec ${PREFIX}addp ${nom}.` });
      return;
    }

    const senderDir = path.join(PHOTOS_DIR, safeSenderFolder(sender));
    if (!fs.existsSync(senderDir)) fs.mkdirSync(senderDir, { recursive: true });
    const filePath = path.join(senderDir, `${nom}.jpg`);
    fs.writeFileSync(filePath, buffer);

    if (!photosStore[sender]) photosStore[sender] = {};
    const isOverwrite = !!photosStore[sender][nom];
    photosStore[sender][nom] = filePath;
    await saveData('photos', photosStore);

    await sock.sendMessage(chatId, {
      text: `✅ Photo enregistrée sous *${nom}*${isOverwrite ? ' (remplace l\'ancienne)' : ''}.\n\nPour la renvoyer : ${PREFIX}givp ${nom}`,
    });
  },
};

const givp = {
  command: 'givp',
  aliases: ['givphoto', 'givepicture'],
  category: 'GENERAL',
  description: 'Renvoie une photo enregistrée avec !addp',
  handler: async ({ sock, chatId, sender, args }) => {
    const nom = args.slice(1).join(' ').trim().toLowerCase();
    if (!nom) {
      await sock.sendMessage(chatId, { text: `📸 Utilise : ${PREFIX}givp <nom>\nEx: ${PREFIX}givp photo1\n\nTape ${PREFIX}listp pour voir tes photos enregistrées.` });
      return;
    }

    const filePath = photosStore[sender]?.[nom];
    if (!filePath || !fs.existsSync(filePath)) {
      await sock.sendMessage(chatId, { text: `📸 Aucune photo trouvée sous le nom *${nom}*. Tape ${PREFIX}listp pour voir tes photos enregistrées.` });
      return;
    }

    await sock.sendMessage(chatId, { image: fs.readFileSync(filePath), caption: `📸 ${nom}` });
  },
};

const listp = {
  command: 'listp',
  aliases: ['listphotos'],
  category: 'GENERAL',
  description: 'Liste tes photos enregistrées',
  handler: async ({ sock, chatId, sender }) => {
    const noms = Object.keys(photosStore[sender] || {});
    if (noms.length === 0) {
      await sock.sendMessage(chatId, { text: `📸 Aucune photo enregistrée pour l'instant. Utilise ${PREFIX}addp <nom> pour en ajouter une.` });
      return;
    }
    await sock.sendMessage(chatId, {
      text: `📸 *Tes photos enregistrées (${noms.length}) :*\n\n${noms.map((n) => `• ${n}`).join('\n')}\n\n_Renvoie-en une avec ${PREFIX}givp <nom>_`,
    });
  },
};

export default [addp, givp, listp];
