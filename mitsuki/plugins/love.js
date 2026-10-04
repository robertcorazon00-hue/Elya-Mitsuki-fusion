import * as local from '../commands/local.js';
import * as storage from '../storage.js';
function makeLovePlugin(command, storageKey, loveFn) {
  return {
    command,
    category: 'FUN',
    description: 'Message d\'amour aléatoire (mentionne quelqu\'un ou donne un nom)',
    handler: async ({ sock, from, argText, msg }) => {
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = contextInfo?.mentionedJid;
      let displayName = argText || null;
      let mentions = [];
      if (mentioned && mentioned.length) {
        displayName = `@${mentioned[0].split('@')[0]}`;
        mentions = [mentioned[0]];
      }
      const index = storage.getNextCycleIndex(storageKey, 10);
      const message = loveFn(displayName, index);
      await sock.sendMessage(from, { text: message, mentions });
    },
  };
}

export default [
  makeLovePlugin('love', 'love', local.love),
  makeLovePlugin('love2', 'love2', local.love2),
];
