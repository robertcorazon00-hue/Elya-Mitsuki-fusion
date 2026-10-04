// elya/plugins/humeur.js — !humeur [texte] : note son humeur du jour, ou
// sans argument consulte l'historique. Alimenté aussi en silence par le
// message du matin (voir elya-morning-scheduler.js + server.js).
import { moodStore, saveData } from '../store.js';
import { PREFIX } from '../config.js';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default {
  command: 'humeur',
  category: 'CONVERSATION',
  description: "Note ou consulte ton humeur du jour",
  handler: async ({ sock, chatId, text, cmd }) => {
    const rest = text.slice(PREFIX.length + cmd.length).trim();

    if (!rest) {
      const history = (moodStore[chatId] || []).slice(-7);
      if (history.length === 0) {
        await sock.sendMessage(chatId, {
          text: `💛 Aucune humeur enregistrée pour l'instant.\nUtilise ${PREFIX}humeur <ce que tu ressens> pour en ajouter une.`,
        });
        return;
      }
      const lines = history.map((h) => `${h.date} — ${h.text}`);
      await sock.sendMessage(chatId, { text: `🌙 *Tes dernières humeurs :*\n\n${lines.join('\n')}` });
      return;
    }

    if (!moodStore[chatId]) moodStore[chatId] = [];
    moodStore[chatId].push({ date: todayStr(), text: rest, timestamp: Date.now() });
    if (moodStore[chatId].length > 100) moodStore[chatId] = moodStore[chatId].slice(-100);
    await saveData('mood', moodStore);

    await sock.sendMessage(chatId, { text: `💛 C'est noté. Merci de me le dire 🫶` });
  },
};
