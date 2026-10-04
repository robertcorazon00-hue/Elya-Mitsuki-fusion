import {
  historyStore, memoryStore, strikesStore, bannedWordsStore, statsStore, groupSettingsStore,
  linksStore, personalityStore, introStore, userCountsStore, translationStore, antideleteStore,
  voixAutoStore,
  milestonesStore, aiModelStore, aiUsageStore, dmIntroStore, creatorIndexStore, scheduledSendsStore,
} from '../store.js';

export default {
  command: 'backup',
  category: 'GENERAL',
  description: 'Exporte toutes les données stockées en JSON',
  handler: async ({ sock, chatId }) => {
    try {
      const backup = {
        exportedAt: new Date().toISOString(),
        history: historyStore, memory: memoryStore, strikes: strikesStore,
        bannedWords: bannedWordsStore, stats: statsStore, groupSettings: groupSettingsStore,
        links: linksStore, personality: personalityStore, intro: introStore,
        userCounts: userCountsStore, translation: translationStore, antidelete: antideleteStore,
        voixAuto: voixAutoStore,
        milestonesConfig: milestonesStore, aiModel: aiModelStore, aiUsage: aiUsageStore,
        dmIntro: dmIntroStore, creatorIndex: creatorIndexStore, scheduledSends: scheduledSendsStore,
      };
      const buffer = Buffer.from(JSON.stringify(backup, null, 2));
      await sock.sendMessage(chatId, {
        document: buffer,
        mimetype: 'application/json',
        fileName: `elya-backup-${new Date().toISOString().slice(0, 10)}.json`,
      });
    } catch (e) {
      console.error('Erreur backup:', e.message);
      await sock.sendMessage(chatId, { text: `💛 Petit souci pour générer le backup, réessaie.` });
    }
  },
};
