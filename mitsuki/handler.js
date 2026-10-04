// handler.js — Boucle d'écoute des messages + protections de groupe (antilink, antispam...)
// pour Mitsuki Kiryu-MD. Toute la logique des commandes vit maintenant dans /plugins
// (voir pluginLoader.js) ; ce fichier ne garde que .menu (spécial) et le fallback.
// Utilisé à la fois par index.js (bot solo) et sessionManager.js (multi-sessions du site de pairing)
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { PREFIX, CHANNEL_URL } from './config.js';
import { buildMenu, findCommand } from './menu.js';
import { findElyaCommand } from '../elya-menu-data.js';
import { PENDING_COMMANDS, pendingReply } from './commands/pending.js';
import * as storage from './storage.js';
import * as settings from './commands/settings.js';
import * as mangaGame from './commands/manga-game.js';
import * as statusCmd from './commands/status.js';
import * as autoreply from './commands/autoreply.js';
import * as pluginLoader from './pluginLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Suivi antispam en mémoire : "<groupJid>-<senderJid>" -> [timestamps]
const spamTracker = new Map();
const SPAM_WINDOW_MS = 10_000;
const SPAM_MAX_MESSAGES = 5;

function attachHandlers(sock) {
  // • ── Footer "Voir la chaîne" ──────────────────────────────────────────
  // On patche sock.sendMessage UNE SEULE FOIS ici. Comme handler.js, group.js,
  // owner.js, status.js et media.js reçoivent tous ce même objet `sock` et
  // appellent sock.sendMessage(...), ce patch s'applique automatiquement à
  // TOUTES les réponses (menu compris) sans avoir à modifier chaque commande.
  const originalSendMessage = sock.sendMessage.bind(sock);
  const channelLine = `📢 Voir la chaîne : ${CHANNEL_URL}`;
  // ⚠️ Fusion avec Elya : sock est partagé entre les deux bots (même connexion WhatsApp).
  // On ne doit ajouter ce footer QUE sur les cartes stylées de Mitsuki (texte commençant
  // par "> "), jamais sur les réponses conversationnelles d'Elya qui passent par le même
  // sock.sendMessage — sinon le lien de chaîne polluerait aussi les réponses d'Elya.
  const appendChannelLine = (str) => {
    if (typeof str !== 'string' || !str || str.includes(CHANNEL_URL)) return str;
    const isQuoted = str.startsWith('> ');
    if (!isQuoted) return str;
    return `${str}\n\n> ${channelLine}`;
  };
  sock.sendMessage = (jid, content, options) => {
    if (content && typeof content === 'object') {
      if (typeof content.text === 'string') {
        content = { ...content, text: appendChannelLine(content.text) };
      } else if (typeof content.caption === 'string') {
        content = { ...content, caption: appendChannelLine(content.caption) };
      }
    }
    return originalSendMessage(jid, content, options);
  };

  // ── Antiedit : détecte les messages modifiés (événement séparé de messages.upsert) ──
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      const jid = update.key?.remoteJid;
      if (!jid || !jid.endsWith('@g.us')) continue;

      const groupSettings = storage.getGroupSettings(jid);
      if (!groupSettings.antiedit) continue;

      // Un message édité arrive comme un protocolMessage de type EDIT
      const editedMessage = update.update?.message?.protocolMessage?.editedMessage;
      if (editedMessage) {
        const sender = update.key.participant || jid;
        await sock.sendMessage(jid, {
          text: `• @${sender.split('@')[0]} a modifié un message.`,
          mentions: [sender],
        });
      }
    }
  });

  // ── Anticall : rejette automatiquement les appels entrants si activé ──
  sock.ev.on('call', async (calls) => {
    const settings = storage.getBotSettings();
    if (!settings.anticall) return;
    for (const call of calls) {
      if (call.status === 'offer') {
        try { await sock.rejectCall(call.id, call.from); } catch (_) {}
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    // Statuts WhatsApp (autoreadstatus / autolikestatus / autoreplystatus)
    if (msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe) {
      await statusCmd.handleIncomingStatus(sock, msg);
      return;
    }

    // Autotyping / autorecording : simule une présence avant de traiter le message
    if (!msg.key.fromMe) {
      const botSettings = storage.getBotSettings();
      if (botSettings.autotyping) {
        sock.sendPresenceUpdate('composing', msg.key.remoteJid).catch(() => {});
      } else if (botSettings.autorecording) {
        sock.sendPresenceUpdate('recording', msg.key.remoteJid).catch(() => {});
      }
    }

    // Auto-reply (DM ou mention en groupe) — ne bloque pas le traitement des commandes plus bas
    const autoReplyResult = autoreply.check(msg, sock.user?.id);
    if (autoReplyResult) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: autoReplyResult.message,
        mentions: autoReplyResult.mentions,
      });
    }

    // NOTE : on ne fait PAS "return" sur fromMe ici — c'est un bot self-hosted,
    // donc le propriétaire tape ses commandes depuis son propre compte (fromMe=true).
    // isOwner sert à protéger les commandes sensibles (ban, broadcast, mode...).
    const isOwner = msg.key.fromMe;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';

    // ── Antilink : s'applique à TOUS les messages d'un groupe, pas juste aux commandes ──
    const isGroup = from.endsWith('@g.us');
    if (isGroup) {
      const groupSettings = storage.getGroupSettings(from);
      if (groupSettings.antilink && settings.containsLink(text)) {
        const sender = msg.key.participant || from;
        await sock.sendMessage(from, { delete: msg.key });
        await sock.sendMessage(from, {
          text: `• Lien supprimé — @${sender.split('@')[0]}, les liens ne sont pas autorisés ici.`,
          mentions: [sender],
        });
        return;
      }

      // ── Antihidetag : détecte les mentions invisibles (3 warns = kick) ──
      if (groupSettings.antihidetag && !msg.key.fromMe) {
        const hiddenTagResult = settings.detectHiddenTag(msg);
        if (hiddenTagResult.detected) {
          const sender = msg.key.participant || from;
          await sock.sendMessage(from, { delete: msg.key });

          const warnCount = storage.addWarn(from, sender, 'hidden-tag');
          if (warnCount >= 3) {
            storage.resetWarns(from, sender);
            try {
              await sock.groupParticipantsUpdate(from, [sender], 'remove');
            } catch (_) {}
            await sock.sendMessage(from, {
              text: `• @${sender.split('@')[0]} exclu — 3 avertissements pour hidden tag.`,
              mentions: [sender],
            });
          } else {
            await sock.sendMessage(from, {
              text: `• @${sender.split('@')[0]} ⚠️ Hidden tag détecté (${hiddenTagResult.hiddenCount} mention(s) cachée(s)). Avertissement ${warnCount}/3.`,
              mentions: [sender],
            });
          }
          return;
        }
      }

      const sender = msg.key.participant || from;

      // ── Antispam : trop de messages en peu de temps ──
      if (groupSettings.antispam && !msg.key.fromMe) {
        const key = `${from}-${sender}`;
        const now = Date.now();
        const timestamps = (spamTracker.get(key) || []).filter((t) => now - t < SPAM_WINDOW_MS);
        timestamps.push(now);
        spamTracker.set(key, timestamps);

        if (timestamps.length > SPAM_MAX_MESSAGES) {
          spamTracker.set(key, []); // reset pour ne pas re-déclencher à chaque message
          await sock.sendMessage(from, { delete: msg.key });
          const warnCount = storage.addWarn(from, sender, 'spam');
          if (warnCount >= 3) {
            storage.resetWarns(from, sender);
            try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (_) {}
            await sock.sendMessage(from, { text: `• @${sender.split('@')[0]} exclu — spam répété.`, mentions: [sender] });
          } else {
            await sock.sendMessage(from, {
              text: `• @${sender.split('@')[0]} ⚠️ Trop de messages trop vite (spam). Avertissement ${warnCount}/3.`,
              mentions: [sender],
            });
          }
          return;
        }
      }

      // ── Antibot : messages massivement transférés (typique des bots) ──
      if (groupSettings.antibot && !msg.key.fromMe) {
        const forwardingScore = msg.message?.extendedTextMessage?.contextInfo?.forwardingScore || 0;
        if (forwardingScore >= 5) {
          await sock.sendMessage(from, { delete: msg.key });
          await sock.sendMessage(from, {
            text: `• Message supprimé — comportement de bot détecté (transfert massif) de @${sender.split('@')[0]}.`,
            mentions: [sender],
          });
          return;
        }
      }

      // ── Autoread : marque les messages du groupe comme lus automatiquement ──
      if (groupSettings.autoread && !msg.key.fromMe) {
        try { await sock.readMessages([msg.key]); } catch (_) {}
      }

      // ── Autoreact : réagit automatiquement à chaque message du groupe ──
      if (groupSettings.autoreact && !msg.key.fromMe) {
        try { await sock.sendMessage(from, { react: { text: '🤍', key: msg.key } }); } catch (_) {}
      }

      // ── Autosave : sauvegarde automatiquement les médias du groupe en DM ──
      if (groupSettings.autosave && !msg.key.fromMe) {
        const mediaType = msg.message.imageMessage
          ? 'image'
          : msg.message.videoMessage
          ? 'video'
          : msg.message.audioMessage
          ? 'audio'
          : msg.message.stickerMessage
          ? 'sticker'
          : null;
        if (mediaType) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            await sock.sendMessage(sock.user.id, { [mediaType]: buffer });
          } catch (_) {}
        }
      }
    }

    // ─── Jeu manga : intercepte les réponses pendant une partie en cours,
    // même sans préfixe (une réponse n'a pas besoin de commencer par ".") ───
    if (isGroup) {
      const partieEnCours = mangaGame.getPartie(from);
      if (partieEnCours && partieEnCours.phase === 'jeu' && !text.startsWith(PREFIX)) {
        const senderJid = msg.key.participant || from;
        const numero = senderJid.split('@')[0];
        const geree = await mangaGame.verifierReponse(sock, partieEnCours, senderJid, numero, text);
        if (geree) return;
      }
    }

    if (!text.startsWith(PREFIX)) return;

    // Un utilisateur banni ne peut plus utiliser le bot
    const sender = msg.key.participant || from;
    if (storage.isBanned(sender)) return;

    const [rawCmd, ...args] = text.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = rawCmd.toLowerCase();
    const argText = args.join(' ');
    if (cmd === 'menu' || cmd === 'help' || findCommand(cmd)) {
      storage.trackCommand(cmd);
    }

    try {
      // ── Système de plugins (migration progressive) ──────────────────
      // Si une commande a été portée dans /plugins, elle est traitée ici et le
      // switch/case ci-dessous n'est jamais atteint pour elle. Sinon dispatch()
      // renvoie false et on continue normalement vers l'ancien switch/case.
      const handledByPlugin = await pluginLoader.dispatch(cmd, {
        sock, msg, from, sender, isGroup, isOwner, cmd, args, argText, storage,
      });
      if (handledByPlugin) return;

      switch (cmd) {
        case 'menu':
          await sock.sendMessage(from, {
            image: { url: path.join(__dirname, 'assets', 'menu.jpg') },
            caption: buildMenu(msg.pushName),
          });
          break;

        default: {
          const crossElya = findElyaCommand(cmd);
          if (crossElya) {
            await sock.sendMessage(from, {
              text: `💡 *${cmd}* est une commande d'Elya AI, pas de Mitsuki MD.\nEssaie plutôt : *!${cmd}*`
            });
          } else if (PENDING_COMMANDS.includes(cmd)) {
            await sock.sendMessage(from, { text: pendingReply(cmd) });
          }
          // Sinon commande inconnue -> on ignore silencieusement
          break;
        }
      }
    } catch (err) {
      console.error(`Erreur sur la commande .${cmd}:`, err);
      await sock.sendMessage(from, {
        text: `• Une erreur est survenue avec *.${cmd}*. Réessaie plus tard.`,
      });
    }
  });
}

export { attachHandlers };
