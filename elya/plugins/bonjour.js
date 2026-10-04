// elya/plugins/bonjour.js — !bonjour on|off|heure HH:MM : configure le
// message du matin automatique (voir elya-morning-scheduler.js). Réservé au
// créateur car ce message ne cible que lui (OWNER_NUMBERS[0]).
import { morningStore, saveData } from '../store.js';
import { PREFIX } from '../config.js';

function pad2(n) {
  return String(n).padStart(2, '0');
}

const USAGE =
  `💛 Utilise :\n` +
  `${PREFIX}bonjour on — active le message du matin\n` +
  `${PREFIX}bonjour off — le désactive\n` +
  `${PREFIX}bonjour heure 8h00 — change l'heure d'envoi (fuseau Africa/Lome)`;

export default {
  command: 'bonjour',
  category: 'CONVERSATION',
  description: "Active/configure le message du matin automatique (réservé au créateur)",
  ownerOnly: true,
  handler: async ({ sock, chatId, args }) => {
    const sub = (args[1] || '').toLowerCase();

    if (sub === 'on') {
      morningStore.enabled = true;
      await saveData('morning', morningStore);
      await sock.sendMessage(chatId, {
        text: `☀️ Message du matin activé, prévu vers ${pad2(morningStore.hour)}h${pad2(morningStore.minute)}.`,
      });
      return;
    }
    if (sub === 'off') {
      morningStore.enabled = false;
      await saveData('morning', morningStore);
      await sock.sendMessage(chatId, { text: `🌙 Message du matin désactivé.` });
      return;
    }
    if (sub === 'heure') {
      const m = (args[2] || '').match(/^(\d{1,2})[:h](\d{1,2})$/i);
      if (!m) {
        await sock.sendMessage(chatId, { text: USAGE });
        return;
      }
      const hour = parseInt(m[1], 10);
      const minute = parseInt(m[2], 10);
      if (hour > 23 || minute > 59) {
        await sock.sendMessage(chatId, { text: USAGE });
        return;
      }
      morningStore.hour = hour;
      morningStore.minute = minute;
      await saveData('morning', morningStore);
      await sock.sendMessage(chatId, { text: `☀️ Heure mise à jour : ${pad2(hour)}h${pad2(minute)}.` });
      return;
    }

    await sock.sendMessage(chatId, { text: USAGE });
  },
};
