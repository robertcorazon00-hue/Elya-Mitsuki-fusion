// elya/antiFlood.js — Anti-flood/anti-spam par fenêtre glissante, porté
// d'Ultra Agent (src/moderation/antiSpam.js). État en mémoire uniquement :
// perdu à chaque redémarrage, ce qui est acceptable pour un compteur de
// flood (pas une donnée à conserver sur la durée).
// clé = `${chatId}:${userId}` -> tableau de timestamps (ms)
const history = new Map();

function key(chatId, userId) {
  return `${chatId}:${userId}`;
}

/**
 * Enregistre un message et retourne { isFlooding, count } sur la fenêtre
 * glissante [maintenant - windowSec, maintenant].
 */
export function recordMessage(chatId, userId, maxMessages, windowSec) {
  const k = key(chatId, userId);
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const timestamps = (history.get(k) || []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  history.set(k, timestamps);
  return { isFlooding: timestamps.length > maxMessages, count: timestamps.length };
}

/** Vide le compteur d'un membre (ex: après une sanction, pour repartir propre). */
export function resetFlood(chatId, userId) {
  history.delete(key(chatId, userId));
}
