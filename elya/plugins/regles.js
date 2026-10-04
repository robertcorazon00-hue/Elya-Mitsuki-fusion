export default {
  command: 'regles',
  category: 'GENERAL',
  description: 'Affiche les règles du groupe',
  handler: async ({ sock, chatId }) => {
    await sock.sendMessage(chatId, {
      text: `📋 *Règles du groupe*\n\n` +
        `1️⃣ Respecte tout le monde\n` +
        `2️⃣ Pas d'insultes, de spam ou de contenu NSFW\n` +
        `3️⃣ Le hacking éthique est encouragé, le malveillant est banni\n` +
        `4️⃣ 3 strikes = expulsion automatique\n` +
        `5️⃣ Amuse-toi et apprends ! 🌙`
    });
  },
};
