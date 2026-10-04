import * as local from '../commands/local.js';
import * as info from '../commands/info.js';

const quiz = {
  command: 'quiz',
  category: 'FUN',
  description: 'Question de quiz aléatoire',
  handler: async ({ sock, from }) => {
    const { card } = local.quiz();
    await sock.sendMessage(from, { text: card });
  },
};

const joke = {
  command: 'joke',
  category: 'FUN',
  description: 'Blague aléatoire',
  handler: async ({ sock, from }) => {
    await sock.sendMessage(from, { text: local.joke() });
  },
};

const meme = {
  command: 'meme',
  category: 'FUN',
  description: 'Meme aléatoire',
  handler: async ({ sock, from }) => {
    try {
      const r = await info.meme();
      await sock.sendMessage(from, { image: { url: r.imageUrl }, caption: r.caption });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

export default [quiz, joke, meme];
