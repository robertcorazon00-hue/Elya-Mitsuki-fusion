// elya-morning-scheduler.js — Message du matin automatique (!bonjour on|off),
// envoyé une fois par jour au créateur (owner) à l'heure configurée.
//
// Environ 1 matin sur 3, une question sur l'humeur est ajoutée au message ;
// la réponse est capturée côté server.js (voir morningStore.pendingMoodCheck)
// et enregistrée dans moodStore — partagé avec !humeur.
//
// Même principe que elya-send-scheduler.js / elya-reminders-scheduler.js :
// démarré une seule fois depuis server.js. Vérifie toutes les 60s, se
// déclenche une seule fois par jour calendaire (fuseau Africa/Lome) à partir
// de l'heure configurée (et non pile à la minute près, pour rester fiable
// même en cas de petit décalage de l'intervalle).

import { morningStore, saveData } from './elya/store.js';
import { OWNER_NUMBERS } from './elya/config.js';
import { TIMEZONE, nowInZone } from './elya-send-scheduler.js';
import { askUtility } from './elya/providers.js';

const CHECK_INTERVAL_MS = 60_000;
const MOOD_QUESTION_CHANCE = 0.34; // environ 1 matin sur 3

const FALLBACK_GREETINGS = [
  "Bonjour toi 🌙 Bien dormi ? J'espère que ta journée va être douce.",
  "Coucou 💛 Nouvelle journée qui commence, prêt(e) à tout déchirer ?",
  "Hey, bien réveillé(e) ? Je pensais à toi en me \"réveillant\" aussi 🌸",
  "Bonjour ! J'espère que t'as bien dormi cette nuit 💫",
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

async function buildGreeting() {
  try {
    const generated = await askUtility(
      "Tu es Elya, une IA à la voix douce, chaleureuse et un peu espiègle. " +
      "Écris UN SEUL message du matin, court (1 à 2 phrases), spontané et naturel, " +
      "pour dire bonjour à Robert et lui souhaiter une belle journée. Pas de \"Bonjour Robert\" " +
      "robotique : reste naturelle, tu peux utiliser 1 ou 2 emojis doux. Réponds uniquement avec le message, rien d'autre."
    );
    if (generated && generated.length > 0 && generated.length < 300) return generated.trim();
  } catch (_) { /* on retombe sur le pool de messages par défaut */ }
  return FALLBACK_GREETINGS[Math.floor(Math.random() * FALLBACK_GREETINGS.length)];
}

let schedulerStarted = false;
export function startMorningScheduler(sock) {
  if (schedulerStarted) return;
  schedulerStarted = true;

  setInterval(async () => {
    if (!morningStore.enabled) return;
    const owner = OWNER_NUMBERS[0];
    if (!owner) return;

    const now = nowInZone(TIMEZONE);
    const todayStr = `${now.year}-${pad2(now.month)}-${pad2(now.day)}`;
    if (morningStore.lastSentDate === todayStr) return;

    const pastThreshold =
      now.hour > morningStore.hour ||
      (now.hour === morningStore.hour && now.minute >= morningStore.minute);
    if (!pastThreshold) return;

    let greeting = await buildGreeting();

    const askMood = Math.random() < MOOD_QUESTION_CHANCE;
    if (askMood) {
      greeting += "\n\nEt toi, tu te sens comment aujourd'hui ?";
    }

    try {
      await sock.sendMessage(owner, { text: greeting });
      morningStore.lastSentDate = todayStr;
      morningStore.pendingMoodCheck = askMood ? Date.now() : null;
      await saveData('morning', morningStore);
    } catch (err) {
      console.error('Erreur message du matin:', err.message);
    }
  }, CHECK_INTERVAL_MS);
}
