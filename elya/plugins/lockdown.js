import { lockdownStore, saveData } from '../store.js';
import { PREFIX } from '../config.js';

export default {
  command: 'lockdown',
  category: 'GENERAL',
  description: 'Active/désactive le verrouillage global (commandes réservées aux owners)',
  ownerOnly: true,
  handler: async ({ sock, chatId, args }) => {
    const sub = args[1]?.toLowerCase();
    if (sub === 'on') {
      lockdownStore.enabled = true;
      await saveData('lockdown', lockdownStore);
      await sock.sendMessage(chatId, { text: `🔒 *Mode lockdown activé.*\n\nSeuls les numéros owner peuvent utiliser mes commandes jusqu'à nouvel ordre (${PREFIX}lockdown off pour lever ça).` });
    } else if (sub === 'off') {
      lockdownStore.enabled = false;
      await saveData('lockdown', lockdownStore);
      await sock.sendMessage(chatId, { text: `🔓 Mode lockdown désactivé — tout le monde peut de nouveau utiliser mes commandes.` });
    } else {
      await sock.sendMessage(chatId, { text: `🔒 Lockdown : ${lockdownStore.enabled ? '✅ Activé' : '🔕 Désactivé'}\n\nUtilise : ${PREFIX}lockdown on | off` });
    }
  },
};
