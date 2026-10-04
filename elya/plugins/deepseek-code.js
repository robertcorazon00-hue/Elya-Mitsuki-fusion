import { askDeepSeek, askAICode } from '../apis.js';
import { PREFIX } from '../config.js';

const deepseek = {
  command: 'deepseek',
  category: 'GENERAL',
  description: 'Pose une question à DeepSeek',
  handler: async ({ sock, chatId, args }) => {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      await sock.sendMessage(chatId, { text: `🐋 Utilise : ${PREFIX}deepseek <question>` });
      return;
    }
    try {
      const reply = await askDeepSeek(prompt);
      await sock.sendMessage(chatId, { text: `🐋 ${reply}` });
    } catch (e) {
      await sock.sendMessage(chatId, { text: `💛 Petit souci avec DeepSeek, réessaie.` });
    }
  },
};

const code = {
  command: 'code',
  category: 'GENERAL',
  description: 'Explique un extrait de code',
  handler: async ({ sock, chatId, args }) => {
    const codeText = args.slice(1).join(' ');
    if (!codeText) {
      await sock.sendMessage(chatId, { text: `💻 Utilise : ${PREFIX}code <extrait de code à expliquer>` });
      return;
    }
    try {
      const reply = await askAICode('explain', codeText);
      await sock.sendMessage(chatId, { text: `💻 ${reply}` });
    } catch (e) {
      await sock.sendMessage(chatId, { text: `💛 Petit souci pour analyser le code, réessaie.` });
    }
  },
};

export default [deepseek, code];
