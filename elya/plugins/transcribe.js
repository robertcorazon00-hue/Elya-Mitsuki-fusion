import { setTranscribe } from '../runtime.js';
import { isTranscribeEnabled } from '../store.js';
import { PREFIX } from '../config.js';

export default {
  command: 'transcribe',
  category: 'GENERAL',
  description: 'Active/désactive la transcription automatique des messages vocaux',
  handler: async ({ sock, chatId, isGroup, args }) => {
    if (!isGroup) {
      await sock.sendMessage(chatId, { text: `💛 Cette commande fonctionne uniquement dans les groupes.` });
      return;
    }
    const sub = args[1]?.toLowerCase();
    if (sub === 'on') {
      await setTranscribe(chatId, true);
      await sock.sendMessage(chatId, { text: `🎙️ Transcription vocale *activée*.\nJe transcrirai automatiquement les messages vocaux.` });
    } else if (sub === 'off') {
      await setTranscribe(chatId, false);
      await sock.sendMessage(chatId, { text: `🔕 Transcription vocale *désactivée*.` });
    } else {
      const on = isTranscribeEnabled(chatId);
      await sock.sendMessage(chatId, {
        text: `🎙️ Transcription vocale : ${on ? '✅ Activée' : '🔕 Désactivée'}\n\nUtilise : ${PREFIX}transcribe on | off`
      });
    }
  },
};
