import { generateTTS, generatePDF } from '../media.js';
import { PREFIX, BOT_NAME } from '../config.js';

const tts = {
  command: 'tts',
  aliases: ['voix'],
  category: 'GENERAL',
  description: 'Convertit un texte en message vocal',
  handler: async ({ sock, chatId, args }) => {
    let lang = 'fr';
    let textArgs = args.slice(1);
    if (textArgs[0] === 'fr' || textArgs[0] === 'en') {
      lang = textArgs[0];
      textArgs = textArgs.slice(1);
    }
    const ttsText = textArgs.join(' ');
    if (!ttsText) {
      await sock.sendMessage(chatId, { text: `💛 Donne-moi un texte : ${PREFIX}tts [fr|en] <texte> (200 caractères max)` });
      return;
    }
    try {
      await sock.sendMessage(chatId, { text: `🎙️ Je prépare le message vocal...` });
      const audioBuffer = await generateTTS(ttsText, lang);
      await sock.sendMessage(chatId, { audio: audioBuffer, mimetype: 'audio/mpeg', ptt: false });
    } catch (e) {
      console.error('Erreur TTS:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci avec la synthèse vocale, réessaie plus tard.` });
    }
  },
};

const pdf = {
  command: 'pdf',
  category: 'GENERAL',
  description: 'Génère un PDF à partir d\'un texte',
  handler: async ({ sock, chatId, args }) => {
    const content = args.slice(1).join(' ');
    if (!content) {
      await sock.sendMessage(chatId, { text: `📄 Utilise : ${PREFIX}pdf <texte à mettre dans le PDF>` });
      return;
    }
    try {
      await sock.sendMessage(chatId, { text: `📄 Je génère ton PDF...` });
      const pdfBuffer = await generatePDF(content, `Document ${BOT_NAME}`);
      await sock.sendMessage(chatId, {
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: `document-${Date.now()}.pdf`,
      });
    } catch (e) {
      console.error('Erreur PDF:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci pour générer le PDF, réessaie.` });
    }
  },
};

export default [tts, pdf];
