// elya/plugins/rappels.js — !rappels / !rappels cancel <numéro> : gère les
// rappels créés en langage naturel ("rappelle-moi..."), voir
// elya/reminderParser.js + elya-reminders-scheduler.js.
import { listPendingReminders, cancelReminder } from '../../elya-reminders-scheduler.js';
import { TIMEZONE } from '../../elya-send-scheduler.js';
import { PREFIX } from '../config.js';

function formatWhen(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    timeZone: TIMEZONE, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default {
  command: 'rappels',
  category: 'CONVERSATION',
  description: "Liste ou annule tes rappels en attente",
  handler: async ({ sock, chatId, args }) => {
    const sub = (args[1] || '').toLowerCase();

    if (sub === 'cancel') {
      const id = parseInt(args[2], 10);
      if (!id) {
        await sock.sendMessage(chatId, { text: `💛 Utilise : ${PREFIX}rappels cancel <numéro>` });
        return;
      }
      const cancelled = await cancelReminder(id, chatId);
      if (!cancelled) {
        await sock.sendMessage(chatId, { text: `💛 Aucun rappel en attente avec le numéro #${id} dans ce chat.` });
        return;
      }
      await sock.sendMessage(chatId, { text: `🗑️ Rappel #${id} annulé.` });
      return;
    }

    const pending = listPendingReminders(chatId);
    if (pending.length === 0) {
      await sock.sendMessage(chatId, {
        text: `📅 Aucun rappel en attente dans ce chat.\n\n_Tu peux aussi juste me dire "rappelle-moi de ... dans ..." directement._`,
      });
      return;
    }
    const lines = pending.map((it) => `#${it.id} — ${formatWhen(it.scheduledAt)} : ${it.message}`);
    await sock.sendMessage(chatId, {
      text: `📅 *Tes rappels (${pending.length}) :*\n\n${lines.join('\n')}\n\n_Annuler : ${PREFIX}rappels cancel <numéro>_`,
    });
  },
};
