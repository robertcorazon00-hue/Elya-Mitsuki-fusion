import { memoryStore, saveData } from '../store.js';

// !oublie — efface uniquement la mémoire long-terme de CE chat (garde
// l'historique de conversation en cours, contrairement à !reset qui efface
// tout). !oublie <numéro> (owner uniquement) fait la même chose à distance,
// sur un autre chat, sans avoir à écrire depuis ce numéro.
export default {
  command: 'oublie',
  category: 'GENERAL',
  description: 'Efface ce dont Elya se souvient (owner: !oublie <numéro> pour un autre chat)',
  handler: async ({ sock, chatId, args, isOwner, senderName }) => {
    let targetId = chatId;
    let label = '';
    if (isOwner && args[1]) {
      const digits = args[1].replace(/\D/g, '');
      if (digits) {
        targetId = `${digits}@s.whatsapp.net`;
        label = ` pour ${args[1]}`;
      }
    }

    const hadMemory = (memoryStore[targetId] || []).length > 0;
    delete memoryStore[targetId];
    await saveData('memory', memoryStore);

    const txt = hadMemory
      ? `🧹 C'est oublié${label}. Je repars sans souvenirs${targetId === chatId ? `, ${senderName}` : ''} 💛`
      : `🧹 Il n'y avait déjà rien à oublier${label}.`;
    await sock.sendMessage(chatId, { text: txt });
  },
};
