import { voixGlobalStore, saveData } from '../store.js';
import { PREFIX } from '../config.js';

// !voixtous on|off — tapée en DM par le créateur : bascule Elya en mode "note vocale"
// pour TOUT LE MONDE, dans TOUS les chats (DM + groupes), pas juste le chat courant.
// Différent de !voixauto (qui n'active la voix que pour le chat où elle est tapée).
export default {
  command: 'voixtous',
  aliases: ['voixall', 'vocaltous'],
  category: 'GENERAL',
  description: 'Active/désactive les réponses en note vocale pour tout le monde, partout',
  ownerOnly: true,
  dmOnly: true,
  handler: async ({ sock, chatId, args }) => {
    const sub = args[1]?.toLowerCase();
    if (sub === 'on') {
      voixGlobalStore.enabled = true;
      await saveData('voixGlobal', voixGlobalStore);
      await sock.sendMessage(chatId, {
        text: `🎙️ Mode vocal *global* activé.\nJe répondrai désormais en note vocale à tout le monde, dans tous les chats (les commandes restent en texte).`,
      });
    } else if (sub === 'off') {
      voixGlobalStore.enabled = false;
      await saveData('voixGlobal', voixGlobalStore);
      await sock.sendMessage(chatId, { text: `🔕 Mode vocal *global* désactivé, retour au texte pour tout le monde.` });
    } else {
      const on = !!voixGlobalStore.enabled;
      await sock.sendMessage(chatId, {
        text: `🎙️ Mode vocal global : ${on ? '✅ Activé' : '🔕 Désactivé'}\n\nUtilise : ${PREFIX}voixtous on | off`,
      });
    }
  },
};
