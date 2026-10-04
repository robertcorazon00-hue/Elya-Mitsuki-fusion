import { bannedWordsStore, saveData } from '../store.js';
import { PREFIX } from '../config.js';

// Note : comme dans le code d'origine, ces deux commandes ne sont PAS restreintes au
// propriétaire — n'importe qui peut modifier la liste des mots interdits. À voir si
// tu veux ajouter ownerOnly: true ici.
export default [
  {
    command: 'addword',
    category: 'GENERAL',
    description: 'Ajoute un mot à la liste des mots interdits',
    handler: async ({ sock, chatId, args }) => {
      if (!args[1]) {
        await sock.sendMessage(chatId, { text: `• Usage : ${PREFIX}addword <mot>` });
        return;
      }
      const word = args.slice(1).join(' ');
      if (!bannedWordsStore.words.includes(word)) {
        bannedWordsStore.words.push(word);
        await saveData('bannedWords', bannedWordsStore);
      }
      await sock.sendMessage(chatId, { text: `🛡️ Mot interdit ajouté : "${word}"` });
    },
  },
  {
    command: 'delword',
    category: 'GENERAL',
    description: 'Retire un mot de la liste des mots interdits',
    handler: async ({ sock, chatId, args }) => {
      if (!args[1]) {
        await sock.sendMessage(chatId, { text: `• Usage : ${PREFIX}delword <mot>` });
        return;
      }
      const word = args.slice(1).join(' ');
      bannedWordsStore.words = bannedWordsStore.words.filter(w => w !== word);
      await saveData('bannedWords', bannedWordsStore);
      await sock.sendMessage(chatId, { text: `🛡️ Mot retiré : "${word}"` });
    },
  },
];
