import {
  linkDetectionStore, linkTargetStore, channelWatchStore, linksStore, saveData,
} from '../store.js';
import { PREFIX } from '../config.js';

const setlinkgroup = {
  command: 'setlinkgroup',
  category: 'GENERAL',
  description: 'Définit ce groupe comme cible des liens détectés',
  handler: async ({ sock, chatId, isGroup }) => {
    if (!isGroup) {
      await sock.sendMessage(chatId, { text: `💛 Utilise cette commande directement dans le groupe que tu veux définir comme cible.` });
      return;
    }
    linkTargetStore.targetChatId = chatId;
    await saveData('linkTarget', linkTargetStore);
    await sock.sendMessage(chatId, {
      text: `🎯 Ce groupe est maintenant la cible des liens détectés (rappel : la détection doit être activée séparément dans chaque groupe source avec ${PREFIX}liensdetect on).`,
    });
  },
};

const liensdetect = {
  command: 'liensdetect',
  aliases: ['detectionliens', 'linkdetect'],
  category: 'GENERAL',
  description: 'Active/désactive la détection de liens dans ce groupe, ou suit une chaîne externe',
  handler: async ({ sock, chatId, args, isGroup }) => {
    if (!isGroup) {
      await sock.sendMessage(chatId, { text: `💛 Cette commande fonctionne uniquement dans les groupes.` });
      return;
    }
    const sub = args[1]?.toLowerCase();
    const channelLinkArg = args[2];

    if (sub === 'on' && channelLinkArg && /whatsapp\.com\/channel\//i.test(channelLinkArg)) {
      const inviteCode = channelLinkArg.split('/channel/')[1]?.split(/[/?]/)[0];
      if (!inviteCode) {
        await sock.sendMessage(chatId, { text: `💛 Lien de chaîne invalide.` });
        return;
      }
      try {
        const metadata = await sock.newsletterMetadata('invite', inviteCode);
        if (!metadata || !metadata.id) {
          await sock.sendMessage(chatId, { text: `💛 Impossible de trouver cette chaîne, vérifie le lien.` });
          return;
        }
        await sock.newsletterFollow(metadata.id);
        await sock.subscribeNewsletterUpdates(metadata.id);
        channelWatchStore[metadata.id] = {
          targetChatId: chatId,
          channelName: metadata.name || 'Chaîne',
          inviteLink: channelLinkArg,
        };
        await saveData('channelWatch', channelWatchStore);
        await sock.sendMessage(chatId, {
          text: `📢 Je suis maintenant abonnée à la chaîne *"${metadata.name || '?'}"* !\n\nTous les liens qu'elle postera seront relayés ici automatiquement. 💛`,
        });
      } catch (e) {
        console.error('Erreur suivi chaîne:', e.message);
        await sock.sendMessage(chatId, { text: `💛 Petit souci pour suivre cette chaîne, réessaie. (${e.message.slice(0, 100)})` });
      }
      return;
    }

    if (sub === 'on') {
      linkDetectionStore[chatId] = { enabled: true };
      await saveData('linkDetection', linkDetectionStore);
      await sock.sendMessage(chatId, {
        text: `🔗 Détection de liens *activée* dans ce groupe.\n\n_Astuce : ${PREFIX}liensdetect on <lien_de_chaîne> pour suivre une chaîne WhatsApp externe et relayer ses liens ici._`,
      });
    } else if (sub === 'off') {
      linkDetectionStore[chatId] = { enabled: false };
      await saveData('linkDetection', linkDetectionStore);
      await sock.sendMessage(chatId, { text: `🔕 Détection de liens *désactivée* dans ce groupe.` });
    } else {
      const on = !!(linkDetectionStore[chatId] && linkDetectionStore[chatId].enabled);
      const watchedHere = Object.values(channelWatchStore).filter((w) => w.targetChatId === chatId);
      const watchedText = watchedHere.length > 0
        ? `\n\nChaînes suivies vers ce groupe :\n${watchedHere.map((w) => `📢 ${w.channelName}`).join('\n')}`
        : '';
      await sock.sendMessage(chatId, {
        text: `🔗 Détection de liens : ${on ? '✅ Activée' : '🔕 Désactivée'}\n\nUtilise : ${PREFIX}liensdetect on | off\nOu : ${PREFIX}liensdetect on <lien_de_chaîne>${watchedText}`,
      });
    }
  },
};

const chaines = {
  command: 'chaines',
  aliases: ['channels'],
  category: 'GENERAL',
  description: 'Liste les chaînes WhatsApp suivies',
  handler: async ({ sock, chatId }) => {
    const entries = Object.entries(channelWatchStore);
    if (entries.length === 0) {
      await sock.sendMessage(chatId, {
        text: `📢 Aucune chaîne suivie pour l'instant.\n\nUtilise ${PREFIX}liensdetect on <lien_de_chaîne> dans le groupe cible pour en suivre une.`,
      });
      return;
    }
    const lines = entries.map(([jid, w], i) =>
      `${i + 1}. 📢 *${w.channelName || '?'}*\n   ➤ Relayée vers : ${w.targetChatId === chatId ? 'ce groupe' : w.targetChatId}\n   ➤ jid : ${jid}`
    ).join('\n\n');
    await sock.sendMessage(chatId, {
      text: `📢 *${entries.length} chaîne(s) suivie(s) :*\n\n${lines}\n\n_Pour se désabonner : ${PREFIX}unfollow <numéro ou nom>_`,
    });
  },
};

const unfollow = {
  command: 'unfollow',
  category: 'GENERAL',
  description: 'Se désabonner d\'une chaîne suivie',
  handler: async ({ sock, chatId, args }) => {
    const query = args.slice(1).join(' ').trim();
    if (!query) {
      await sock.sendMessage(chatId, { text: `💛 Utilise : ${PREFIX}unfollow <numéro de la liste ${PREFIX}chaines, ou nom de la chaîne>` });
      return;
    }
    const entries = Object.entries(channelWatchStore);
    let targetJid = null;
    const asIndex = parseInt(query, 10);
    if (!isNaN(asIndex) && entries[asIndex - 1]) {
      targetJid = entries[asIndex - 1][0];
    } else {
      const match = entries.find(([, w]) => (w.channelName || '').toLowerCase().includes(query.toLowerCase()));
      if (match) targetJid = match[0];
    }
    if (!targetJid) {
      await sock.sendMessage(chatId, { text: `💛 Chaîne introuvable. Utilise ${PREFIX}chaines pour voir la liste.` });
      return;
    }
    const channelName = channelWatchStore[targetJid]?.channelName || '?';
    try {
      await sock.newsletterUnfollow(targetJid);
    } catch (e) {
      console.error('Erreur désabonnement chaîne:', e.message);
    }
    delete channelWatchStore[targetJid];
    await saveData('channelWatch', channelWatchStore);
    await sock.sendMessage(chatId, { text: `👋 Désabonnée de la chaîne *"${channelName}"*.` });
  },
};

const liens = {
  command: 'liens',
  category: 'GENERAL',
  description: 'Affiche les derniers liens détectés',
  handler: async ({ sock, chatId, args }) => {
    const filterChannel = args[1]?.toLowerCase() === 'chaines' || args[1]?.toLowerCase() === 'channels';
    const n = parseInt(filterChannel ? args[2] : args[1], 10) || 10;
    let pool = linksStore.links || [];
    if (filterChannel) pool = pool.filter((l) => l.isChannel);
    const recent = pool.slice(-n).reverse();
    if (recent.length === 0) {
      await sock.sendMessage(chatId, { text: `🔗 Aucun lien${filterChannel ? ' de chaîne' : ''} capturé pour l'instant.` });
      return;
    }
    const lines = recent.map((l) => {
      const typeEmoji = l.isChannel ? '📢' : (l.trust === 'trusted' ? '✅' : l.trust === 'suspicious' ? '⚠️' : '🔗');
      const contextLine = l.context ? `\n   💬 "${l.context.slice(0, 100)}${l.context.length > 100 ? '...' : ''}"` : '';
      return `${typeEmoji} ${l.url}${contextLine}\n   👤 ${l.senderName} — ${new Date(l.timestamp).toLocaleString('fr-FR')}`;
    }).join('\n\n');
    await sock.sendMessage(chatId, {
      text: `🔗 *${recent.length} dernier(s) lien(s)${filterChannel ? ' de chaîne' : ''} capturé(s) :*\n\n${lines}\n\n_Astuce : ${PREFIX}liens chaines [nombre] pour ne voir que les liens de chaînes._`,
    });
  },
};

export default [setlinkgroup, liensdetect, chaines, unfollow, liens];
