import { translationStore, antideleteStore, introStore, milestonesStore, voixAutoStore, saveData } from '../store.js';
import { MILESTONES } from '../helpers.js';
import { PREFIX } from '../config.js';

const traduction = {
  command: 'traduction',
  category: 'GENERAL',
  description: 'Active/désactive la traduction automatique FR ↔ EN',
  handler: async ({ sock, chatId, args }) => {
    const sub = args[1]?.toLowerCase();
    if (sub === 'on') {
      if (!translationStore[chatId]) translationStore[chatId] = {};
      translationStore[chatId].enabled = true;
      await saveData('translation', translationStore);
      await sock.sendMessage(chatId, { text: `🌐 Traduction automatique *activée*.\nJe traduirai chaque message (FR ↔ EN) automatiquement.` });
    } else if (sub === 'off') {
      if (!translationStore[chatId]) translationStore[chatId] = {};
      translationStore[chatId].enabled = false;
      await saveData('translation', translationStore);
      await sock.sendMessage(chatId, { text: `🔕 Traduction automatique *désactivée*.` });
    } else {
      const on = !!(translationStore[chatId] && translationStore[chatId].enabled);
      await sock.sendMessage(chatId, { text: `🌐 Traduction automatique : ${on ? '✅ Activée' : '🔕 Désactivée'}\n\nUtilise : ${PREFIX}traduction on | off` });
    }
  },
};

const antidelete = {
  command: 'antidelete',
  category: 'GENERAL',
  description: 'Republie les messages supprimés dans ce chat',
  handler: async ({ sock, chatId, args }) => {
    const sub = args[1]?.toLowerCase();
    if (sub === 'on') {
      if (!antideleteStore[chatId]) antideleteStore[chatId] = {};
      antideleteStore[chatId].enabled = true;
      await saveData('antidelete', antideleteStore);
      await sock.sendMessage(chatId, { text: `🛡️ Anti-suppression *activé*.\nSi un message est supprimé ici, je le republierai.` });
    } else if (sub === 'off') {
      if (!antideleteStore[chatId]) antideleteStore[chatId] = {};
      antideleteStore[chatId].enabled = false;
      await saveData('antidelete', antideleteStore);
      await sock.sendMessage(chatId, { text: `🔕 Anti-suppression *désactivé*.` });
    } else {
      const on = !!(antideleteStore[chatId] && antideleteStore[chatId].enabled);
      await sock.sendMessage(chatId, { text: `🛡️ Anti-suppression : ${on ? '✅ Activé' : '🔕 Désactivé'}\n\nUtilise : ${PREFIX}antidelete on | off` });
    }
  },
};

const presentation = {
  command: 'presentation',
  aliases: ['présentation'],
  category: 'GENERAL',
  description: 'Demande aux nouveaux membres du groupe de se présenter',
  groupOnly: true,
  handler: async ({ sock, chatId, args }) => {
    const sub = args[1]?.toLowerCase();
    if (sub === 'on') {
      if (!introStore[chatId]) introStore[chatId] = { pending: [] };
      introStore[chatId].enabled = true;
      await saveData('intro', introStore);
      await sock.sendMessage(chatId, { text: `👋 Présentation obligatoire *activée*.\nJe demanderai aux nouveaux membres de se présenter.` });
    } else if (sub === 'off') {
      if (!introStore[chatId]) introStore[chatId] = { pending: [] };
      introStore[chatId].enabled = false;
      await saveData('intro', introStore);
      await sock.sendMessage(chatId, { text: `🔕 Présentation obligatoire *désactivée*.` });
    } else {
      const on = !!(introStore[chatId] && introStore[chatId].enabled);
      await sock.sendMessage(chatId, { text: `👋 Présentation obligatoire : ${on ? '✅ Activée' : '🔕 Désactivée'}\n\nUtilise : ${PREFIX}presentation on | off` });
    }
  },
};

const milestones = {
  command: 'milestones',
  aliases: ['paliers'],
  category: 'GENERAL',
  description: 'Félicite automatiquement les membres actifs par paliers de messages',
  groupOnly: true,
  handler: async ({ sock, chatId, args }) => {
    const sub = args[1]?.toLowerCase();
    if (sub === 'on') {
      if (!milestonesStore[chatId]) milestonesStore[chatId] = {};
      milestonesStore[chatId].enabled = true;
      await saveData('milestonesConfig', milestonesStore);
      await sock.sendMessage(chatId, { text: `🎉 Félicitations automatiques *activées* (paliers : ${MILESTONES.join(', ')} messages).` });
    } else if (sub === 'off') {
      if (!milestonesStore[chatId]) milestonesStore[chatId] = {};
      milestonesStore[chatId].enabled = false;
      await saveData('milestonesConfig', milestonesStore);
      await sock.sendMessage(chatId, { text: `🔕 Félicitations automatiques *désactivées*.` });
    } else {
      const on = !!(milestonesStore[chatId] && milestonesStore[chatId].enabled);
      await sock.sendMessage(chatId, { text: `🎉 Félicitations automatiques : ${on ? '✅ Activées' : '🔕 Désactivées'}\n\nUtilise : ${PREFIX}milestones on | off` });
    }
  },
};

const voixauto = {
  command: 'voixauto',
  category: 'GENERAL',
  description: 'Réponses de conversation en note vocale au lieu du texte, dans ce chat',
  handler: async ({ sock, chatId, args }) => {
    const sub = args[1]?.toLowerCase();
    if (sub === 'on') {
      if (!voixAutoStore[chatId]) voixAutoStore[chatId] = {};
      voixAutoStore[chatId].enabled = true;
      await saveData('voixAuto', voixAutoStore);
      await sock.sendMessage(chatId, { text: `🎙️ Réponses vocales *activées* pour ce chat.\nJe répondrai en note vocale à la conversation (les commandes restent en texte).` });
    } else if (sub === 'off') {
      if (!voixAutoStore[chatId]) voixAutoStore[chatId] = {};
      voixAutoStore[chatId].enabled = false;
      await saveData('voixAuto', voixAutoStore);
      await sock.sendMessage(chatId, { text: `🔕 Réponses vocales *désactivées* pour ce chat, retour au texte.` });
    } else {
      const on = !!(voixAutoStore[chatId] && voixAutoStore[chatId].enabled);
      await sock.sendMessage(chatId, { text: `🎙️ Réponses vocales : ${on ? '✅ Activées' : '🔕 Désactivées'}\n\nUtilise : ${PREFIX}voixauto on | off` });
    }
  },
};

export default [traduction, antidelete, presentation, milestones, voixauto];
