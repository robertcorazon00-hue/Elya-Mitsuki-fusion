import { generateImage, generateNanoBananaImage } from '../ai.js';
import { PREFIX } from '../config.js';
import { recordImage } from '../runtime.js';

const nanobanana = {
  command: 'nanobanana',
  aliases: ['imagepro'],
  category: 'GENERAL',
  description: 'Génère une image via Nano Banana (Gemini), avec repli automatique',
  handler: async ({ sock, chatId, args }) => {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      await sock.sendMessage(chatId, { text: `🍌 Utilise : ${PREFIX}nanobanana <description>` });
      return;
    }
    try {
      await sock.sendMessage(chatId, { text: `🍌 Je génère ton image (Nano Banana)...` });
      const img = await generateNanoBananaImage(prompt);
      if (img.buffer) {
        await sock.sendMessage(chatId, { image: img.buffer, caption: `🍌 *${prompt}*` });
      } else {
        await sock.sendMessage(chatId, { image: { url: img.url }, caption: `🍌 *${prompt}*` });
      }
      await recordImage();
    } catch (e) {
      console.error('Erreur NanoBanana:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci pour générer l'image, réessaie.` });
    }
  },
};

const image = {
  command: 'image',
  category: 'GENERAL',
  description: 'Génère une image (Pollinations)',
  handler: async ({ sock, chatId, args }) => {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      await sock.sendMessage(chatId, { text: `💛 Donne-moi une description : ${PREFIX}image un chat astronaute` });
      return;
    }
    await sock.sendMessage(chatId, { text: `🎨 Je génère ton image...` });
    const imageUrl = await generateImage(prompt);
    await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: `🎨 *${prompt}*` });
    await recordImage();
  },
};

export default [nanobanana, image];
