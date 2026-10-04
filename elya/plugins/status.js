import {
  historyStore, memoryStore, strikesStore, translationStore, antideleteStore,
  introStore, milestonesStore, linkDetectionStore, personalityStore, aiModelStore,
  isAutoReplyEnabled, isTranscribeEnabled, isAutoSearchEnabled,
} from '../store.js';

export default {
  command: 'status',
  category: 'GENERAL',
  description: 'Affiche l\'état des réglages de la conversation',
  handler: async ({ sock, chatId }) => {
    const autoOn = isAutoReplyEnabled(chatId);
    const transOn = isTranscribeEnabled(chatId);
    const tradOn = !!(translationStore[chatId] && translationStore[chatId].enabled);
    const antidelOn = !!(antideleteStore[chatId] && antideleteStore[chatId].enabled);
    const presOn = !!(introStore[chatId] && introStore[chatId].enabled);
    const milesOn = !!(milestonesStore[chatId] && milestonesStore[chatId].enabled);
    const linksOn = !!(linkDetectionStore[chatId] && linkDetectionStore[chatId].enabled);
    const perso = personalityStore[chatId] || 'normale';
    const iaModel = aiModelStore[chatId] || 'gemini';
    const searchOn = isAutoSearchEnabled(chatId);
    await sock.sendMessage(chatId, {
      text: `🌙 *Statut d'Elya*\n\n` +
        `Mode auto-réponse : ${autoOn ? '✅ Activé' : '🔕 Désactivé'}\n` +
        `Personnalité : ${perso}\n` +
        `Modèle IA : ${iaModel}\n` +
        `Recherche web auto : ${searchOn ? '✅ Activée' : '🔕 Désactivée'}\n` +
        `Transcription vocale : ${transOn ? '✅ Activée' : '🔕 Désactivée'}\n` +
        `Traduction auto : ${tradOn ? '✅ Activée' : '🔕 Désactivée'}\n` +
        `Anti-suppression : ${antidelOn ? '✅ Activé' : '🔕 Désactivé'}\n` +
        `Présentation obligatoire : ${presOn ? '✅ Activée' : '🔕 Désactivée'}\n` +
        `Félicitations auto : ${milesOn ? '✅ Activées' : '🔕 Désactivées'}\n` +
        `Détection de liens : ${linksOn ? '✅ Activée' : '🔕 Désactivée'}\n` +
        `Messages en mémoire : ${(historyStore[chatId] || []).length}\n` +
        `Souvenirs : ${(memoryStore[chatId] || []).length}\n` +
        `Strikes : ${Object.keys(strikesStore[chatId] || {}).length} utilisateur(s)`
    });
  },
};
