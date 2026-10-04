export default {
  command: 'ping',
  category: 'GENERAL',
  description: 'Vérifie que le bot répond et affiche la latence',
  handler: async ({ sock, chatId }) => {
    const startedAt = Date.now();
    await sock.sendMessage(chatId, { text: `🏓 Pong !` });
    const ms = Date.now() - startedAt;
    await sock.sendMessage(chatId, { text: `⚡ ${ms}ms` }).catch(() => {});
  },
};
