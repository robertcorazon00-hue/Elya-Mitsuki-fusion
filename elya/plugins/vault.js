import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { vaultStore, VAULT_DIR, saveData } from '../store.js';
import { PREFIX } from '../config.js';

// ─── Normalisation : insensible à la casse et aux accents ("vidéo" = "video") ───
function normalize(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
}

// Alias de type -> clé interne canonique
const TYPE_ALIASES = {
  link: 'link', lien: 'link',
  video: 'video',
  document: 'document', doc: 'document',
  image: 'image', photo: 'image',
  audio: 'audio', son: 'audio', vocal: 'audio',
  contact: 'contact',
  numero: 'numero', number: 'numero', tel: 'numero', telephone: 'numero',
  note: 'note',
  message: 'message', msg: 'message',
};

const FILE_TYPES = ['video', 'document', 'image', 'audio']; // acceptent un vrai fichier en plus d'un lien
const VALID_TYPES = ['link', 'video', 'document', 'image', 'audio', 'contact', 'numero', 'note', 'message'];

const TYPE_LABELS = {
  link: 'lien', video: 'vidéo', document: 'document', image: 'image',
  audio: 'audio', contact: 'contact', numero: 'numéro', note: 'note', message: 'message',
};

function resolveType(raw) {
  return TYPE_ALIASES[normalize(raw)] || null;
}

function exampleFor(type) {
  const ex = {
    link: `${PREFIX}add link 1 https://exemple.com`,
    video: `${PREFIX}add video 1 https://... (ou envoie/réponds à une vidéo)`,
    document: `${PREFIX}add document 2 https://... (ou envoie/réponds à un document)`,
    image: `${PREFIX}add image 1 (envoie l'image ou réponds à une image)`,
    audio: `${PREFIX}add audio 1 (envoie l'audio ou réponds à un audio)`,
    contact: `${PREFIX}add contact Marie +22890000000`,
    numero: `${PREFIX}add numero Kofi +22890000000`,
    note: `${PREFIX}add note 1 Acheter du riz`,
    message: `${PREFIX}add message Un texte assez long,\nsur plusieurs lignes. (nom)`,
  };
  return ex[type] || `${PREFIX}add link 1 https://exemple.com`;
}

// ─── Accès au coffre ───
function getEntry(type, name) {
  return vaultStore[type]?.[normalize(name)] || null;
}

async function setEntry(type, name, entry) {
  if (!vaultStore[type]) vaultStore[type] = {};
  vaultStore[type][normalize(name)] = { ...entry, originalName: name, addedAt: Date.now() };
  await saveData('vault', vaultStore);
}

async function deleteEntry(type, name) {
  if (!vaultStore[type]) return false;
  const key = normalize(name);
  if (!vaultStore[type][key]) return false;
  const entry = vaultStore[type][key];
  if (entry.filePath && fs.existsSync(entry.filePath)) {
    try { fs.unlinkSync(entry.filePath); } catch (e) {}
  }
  delete vaultStore[type][key];
  await saveData('vault', vaultStore);
  return true;
}

// ─── Téléchargement d'un fichier média (envoyé directement ou cité en réponse) ───
const MESSAGE_KEY_BY_TYPE = {
  image: 'imageMessage', video: 'videoMessage', audio: 'audioMessage', document: 'documentMessage',
};
const DEFAULT_MIME_BY_TYPE = {
  image: 'image/jpeg', video: 'video/mp4', audio: 'audio/mp4', document: 'application/octet-stream',
};

async function getMediaFromMsg(msg, type) {
  const key = MESSAGE_KEY_BY_TYPE[type];
  if (!key) return null;

  let mediaMsg = msg.message?.[key];
  let fakeMsg = msg;

  if (!mediaMsg) {
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
    if (quotedInfo?.quotedMessage?.[key]) {
      mediaMsg = quotedInfo.quotedMessage[key];
      fakeMsg = {
        key: { remoteJid: msg.key.remoteJid, id: quotedInfo.stanzaId, participant: quotedInfo.participant },
        message: quotedInfo.quotedMessage,
      };
    }
  }
  if (!mediaMsg) return null;

  const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
  const mimetype = mediaMsg.mimetype || DEFAULT_MIME_BY_TYPE[type];
  const ext = (mediaMsg.fileName && path.extname(mediaMsg.fileName)) || '.' + (mimetype.split('/')[1] || 'bin').split(';')[0];
  return { buffer, mimetype, fileName: mediaMsg.fileName || null, ext };
}

// ─── !add ────────────────────────────────────────────────────────────────
const add = {
  command: 'add',
  category: 'GENERAL',
  description: 'Enregistre un élément (lien, vidéo, document, image, audio, contact, numéro, note, message) sous un nom',
  handler: async ({ sock, chatId, msg, text, cmd }) => {
    const rest = text.slice(PREFIX.length + cmd.length).replace(/^\s+/, '');
    const typeMatch = rest.match(/^(\S+)\s*([\s\S]*)$/);
    if (!typeMatch) {
      await sock.sendMessage(chatId, { text: `💛 Utilise : ${PREFIX}add <type> <nom> <contenu>\nEx: ${exampleFor('link')}\n\nTypes possibles : ${VALID_TYPES.map((t) => TYPE_LABELS[t]).join(', ')}` });
      return;
    }
    const type = resolveType(typeMatch[1]);
    const afterType = typeMatch[2] || '';

    if (!type) {
      await sock.sendMessage(chatId, { text: `💛 Type inconnu : "${typeMatch[1]}".\nTypes possibles : ${VALID_TYPES.map((t) => TYPE_LABELS[t]).join(', ')}` });
      return;
    }

    // ── Cas spécial "message" : !add message <texte...> (nom) ──
    if (type === 'message') {
      const parenMatch = afterType.match(/^([\s\S]*)\(([^()]+)\)\s*$/);
      if (!parenMatch || !parenMatch[1].trim()) {
        await sock.sendMessage(chatId, { text: `💛 Utilise : ${exampleFor('message')}\n\n(le nom doit être entre parenthèses, à la toute fin)` });
        return;
      }
      const content = parenMatch[1].trim();
      const nom = parenMatch[2].trim();
      const existing = getEntry('message', nom);
      if (existing) {
        await sock.sendMessage(chatId, { text: `⚠️ Un message existe déjà sous le nom *${nom}*.\nTape à nouveau la même commande pour le remplacer, ou choisis un autre nom.` });
        // On remplace quand même si la commande est retapée à l'identique (2ᵉ passage = confirmation implicite)
        if (existing.content === content) return;
      }
      await setEntry('message', nom, { content });
      await sock.sendMessage(chatId, { text: `✅ Message enregistré sous *${nom}*.\n\nPour le renvoyer : ${PREFIX}give message ${nom}` });
      return;
    }

    // ── Cas général : !add <type> <nom> [contenu] ──
    const nameMatch = afterType.match(/^(\S+)\s*([\s\S]*)$/);
    if (!nameMatch) {
      await sock.sendMessage(chatId, { text: `💛 Utilise : ${exampleFor(type)}` });
      return;
    }
    const nom = nameMatch[1];
    const content = (nameMatch[2] || '').trim();

    const existing = getEntry(type, nom);
    const isConfirmingOverwrite = existing && (
      (content && existing.content === content) // même lien/texte retapé
    );

    let entry;
    if (FILE_TYPES.includes(type)) {
      const media = await getMediaFromMsg(msg, type);
      if (media) {
        if (existing && !isConfirmingOverwrite) {
          await sock.sendMessage(chatId, { text: `⚠️ Un(e) ${TYPE_LABELS[type]} existe déjà sous le nom *${nom}*.\nRetape la commande pour confirmer le remplacement, ou choisis un autre nom.` });
          return;
        }
        const senderDir = VAULT_DIR;
        const fileName = `${type}_${normalize(nom)}_${Date.now()}${media.ext}`;
        const filePath = path.join(senderDir, fileName);
        fs.writeFileSync(filePath, media.buffer);
        // Supprime l'ancien fichier si on remplace
        if (existing?.filePath && fs.existsSync(existing.filePath)) {
          try { fs.unlinkSync(existing.filePath); } catch (e) {}
        }
        entry = { filePath, mimetype: media.mimetype, fileName: media.fileName };
      } else if (content) {
        if (existing && !isConfirmingOverwrite) {
          await sock.sendMessage(chatId, { text: `⚠️ Un(e) ${TYPE_LABELS[type]} existe déjà sous le nom *${nom}*.\nRetape la commande pour confirmer le remplacement, ou choisis un autre nom.` });
          return;
        }
        entry = { content };
      } else {
        await sock.sendMessage(chatId, { text: `💛 Utilise : ${exampleFor(type)}` });
        return;
      }
    } else {
      // link, contact, numero, note : texte obligatoire
      if (!content) {
        await sock.sendMessage(chatId, { text: `💛 Utilise : ${exampleFor(type)}` });
        return;
      }
      if (existing && !isConfirmingOverwrite) {
        await sock.sendMessage(chatId, { text: `⚠️ Un(e) ${TYPE_LABELS[type]} existe déjà sous le nom *${nom}*.\nRetape la commande pour confirmer le remplacement, ou choisis un autre nom.` });
        return;
      }
      entry = { content };
    }

    await setEntry(type, nom, entry);
    await sock.sendMessage(chatId, { text: `✅ ${TYPE_LABELS[type]} enregistré(e) sous *${nom}*.\n\nPour le/la renvoyer : ${PREFIX}give ${typeMatch[1]} ${nom}` });
  },
};

// ─── !give ───────────────────────────────────────────────────────────────
const give = {
  command: 'give',
  category: 'GENERAL',
  description: 'Renvoie un élément enregistré avec !add',
  handler: async ({ sock, chatId, args }) => {
    const rawType = args[1];
    const nom = args[2];
    const type = rawType && resolveType(rawType);

    if (!rawType || !nom) {
      await sock.sendMessage(chatId, { text: `💛 Utilise : ${PREFIX}give <type> <nom>\nEx: ${PREFIX}give link 1` });
      return;
    }
    if (!type) {
      await sock.sendMessage(chatId, { text: `💛 Type inconnu : "${rawType}".\nTypes possibles : ${VALID_TYPES.map((t) => TYPE_LABELS[t]).join(', ')}` });
      return;
    }

    const entry = getEntry(type, nom);
    if (!entry) {
      await sock.sendMessage(chatId, { text: `💛 Aucun(e) ${TYPE_LABELS[type]} trouvé(e) sous le nom *${nom}*.\nTape ${PREFIX}list ${rawType} pour voir ce qui est enregistré.` });
      return;
    }

    if (type === 'message') {
      await sock.sendMessage(chatId, { text: entry.content });
      return;
    }
    if (type === 'link') {
      await sock.sendMessage(chatId, { text: entry.content });
      return;
    }
    if (type === 'contact' || type === 'numero') {
      await sock.sendMessage(chatId, { text: `${TYPE_LABELS[type] === 'contact' ? '👤' : '📞'} *${entry.originalName}* : ${entry.content}` });
      return;
    }
    if (type === 'note') {
      await sock.sendMessage(chatId, { text: `📝 *${entry.originalName}*\n\n${entry.content}` });
      return;
    }

    // Types fichier : soit un lien stocké, soit un vrai fichier sur disque
    if (entry.filePath) {
      if (!fs.existsSync(entry.filePath)) {
        await sock.sendMessage(chatId, { text: `💛 Ce fichier a disparu du disque, désolée. Réenregistre-le avec ${PREFIX}add ${rawType} ${nom}` });
        return;
      }
      const buffer = fs.readFileSync(entry.filePath);
      if (type === 'image') await sock.sendMessage(chatId, { image: buffer, caption: entry.originalName });
      else if (type === 'video') await sock.sendMessage(chatId, { video: buffer, caption: entry.originalName });
      else if (type === 'audio') await sock.sendMessage(chatId, { audio: buffer, mimetype: entry.mimetype || 'audio/mp4' });
      else await sock.sendMessage(chatId, { document: buffer, mimetype: entry.mimetype || 'application/octet-stream', fileName: entry.fileName || entry.originalName });
    } else if (entry.content) {
      if (type === 'image') await sock.sendMessage(chatId, { image: { url: entry.content }, caption: entry.originalName });
      else if (type === 'video') await sock.sendMessage(chatId, { video: { url: entry.content }, caption: entry.originalName });
      else if (type === 'audio') await sock.sendMessage(chatId, { audio: { url: entry.content } });
      else await sock.sendMessage(chatId, { document: { url: entry.content }, fileName: entry.originalName });
    }
  },
};

// ─── !delete ─────────────────────────────────────────────────────────────
const del = {
  command: 'delete',
  category: 'GENERAL',
  description: 'Supprime un élément enregistré',
  handler: async ({ sock, chatId, args }) => {
    const rawType = args[1];
    const nom = args[2];
    const type = rawType && resolveType(rawType);

    if (!rawType || !nom) {
      await sock.sendMessage(chatId, { text: `💛 Utilise : ${PREFIX}delete <type> <nom>\nEx: ${PREFIX}delete video A` });
      return;
    }
    if (!type) {
      await sock.sendMessage(chatId, { text: `💛 Type inconnu : "${rawType}".\nTypes possibles : ${VALID_TYPES.map((t) => TYPE_LABELS[t]).join(', ')}` });
      return;
    }

    const ok = await deleteEntry(type, nom);
    if (ok) {
      await sock.sendMessage(chatId, { text: `🗑️ ${TYPE_LABELS[type]} *${nom}* supprimé(e).` });
    } else {
      await sock.sendMessage(chatId, { text: `💛 Aucun(e) ${TYPE_LABELS[type]} trouvé(e) sous le nom *${nom}*.` });
    }
  },
};

// ─── !list ───────────────────────────────────────────────────────────────
const list = {
  command: 'list',
  category: 'GENERAL',
  description: 'Liste les noms enregistrés pour un type',
  handler: async ({ sock, chatId, args }) => {
    const rawType = args[1];
    const type = rawType && resolveType(rawType);

    if (!rawType) {
      await sock.sendMessage(chatId, { text: `💛 Utilise : ${PREFIX}list <type>\nEx: ${PREFIX}list link\n\nTypes possibles : ${VALID_TYPES.map((t) => TYPE_LABELS[t]).join(', ')}` });
      return;
    }
    if (!type) {
      await sock.sendMessage(chatId, { text: `💛 Type inconnu : "${rawType}".\nTypes possibles : ${VALID_TYPES.map((t) => TYPE_LABELS[t]).join(', ')}` });
      return;
    }

    const entries = Object.values(vaultStore[type] || {});
    if (entries.length === 0) {
      await sock.sendMessage(chatId, { text: `💛 Aucun(e) ${TYPE_LABELS[type]} enregistré(e) pour l'instant.` });
      return;
    }
    const noms = entries.map((e) => e.originalName).sort((a, b) => a.localeCompare(b));
    await sock.sendMessage(chatId, {
      text: `📦 *${TYPE_LABELS[type]} enregistré(e)s (${noms.length}) :*\n\n${noms.map((n) => `• ${n}`).join('\n')}\n\n_Renvoyer : ${PREFIX}give ${rawType} <nom>_`,
    });
  },
};

export default [add, give, del, list];
