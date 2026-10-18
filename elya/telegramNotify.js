import axios from 'axios';

// Petit "bot" Telegram notifieur — pas un vrai bot interactif, juste un
// canal d'envoi à sens unique via l'API Bot Telegram, pour recevoir le QR
// code ou le pairing code de connexion WhatsApp directement sur Telegram
// (plus fiable que de compter sur l'affichage des logs du panel d'hébergement).
//
// Configuration (.env) :
//   TELEGRAM_BOT_TOKEN=<token donné par @BotFather>
//   TELEGRAM_CHAT_ID=<ton chat_id Telegram — demande-le à @userinfobot> (destinataire par défaut des notifications proactives)
//   TELEGRAM_OWNER_IDS=<liste d'IDs séparés par des virgules autorisés à envoyer des commandes>
//     (CHAT_ID est automatiquement inclus même s'il n'est pas répété dans la liste)
//
// Si l'une des deux variables principales manque, les fonctions ne font
// simplement rien (pas d'erreur bloquante) : le QR/pairing code reste
// visible dans les logs classiques comme avant.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const enabled = !!(TOKEN && CHAT_ID);

// Tous les comptes autorisés à ENVOYER des commandes (/status, /redemarrer,
// /run, /pair...) — CHAT_ID en fait toujours partie, même seul.
const OWNER_IDS = [
  CHAT_ID,
  ...(process.env.TELEGRAM_OWNER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean),
];

const API = `https://api.telegram.org/bot${TOKEN}`;

export function isTelegramNotifyEnabled() {
  return enabled;
}

// targetChatId optionnel : par défaut CHAT_ID (notifications proactives),
// mais une réponse à une commande reçue d'un autre owner repart vers CE
// owner précis plutôt que toujours vers CHAT_ID.
export async function sendTelegramText(text, targetChatId = null) {
  if (!enabled) return;
  try {
    await axios.post(`${API}/sendMessage`, {
      chat_id: targetChatId || CHAT_ID,
      text,
      // Pas de parse_mode HTML : plusieurs messages contiennent des
      // "<numéro>" ou "<chatId>" en guise d'exemples de syntaxe, que
      // Telegram confondait avec des balises HTML invalides et refusait.
    });
  } catch (e) {
    console.error('Erreur envoi Telegram (texte):', e.response?.data?.description || e.message);
  }
}

// Écoute (polling simple, pas de webhook) les messages envoyés par un des
// OWNER_IDS à ce bot Telegram, pour pouvoir déclencher des actions à
// distance : /redemarrer (reconnexion), /status, /run (exécuter une
// commande Elya), /pair (changer le numéro WhatsApp lié).
// Sécurité : seuls les messages venant d'un ID listé dans OWNER_IDS sont
// pris en compte — tout le reste est ignoré silencieusement.
let lastUpdateId = 0;
let pollingStarted = false;

export function startTelegramCommandListener({ onRestart, getStatusText, onCommand, onPair } = {}) {
  if (!enabled || pollingStarted) return;
  pollingStarted = true;

  const poll = async () => {
    try {
      const { data } = await axios.get(`${API}/getUpdates`, {
        params: { offset: lastUpdateId + 1, timeout: 0 },
        timeout: 10000,
      });
      for (const update of data?.result || []) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
        const msg = update.message;
        if (!msg || !OWNER_IDS.includes(String(msg.chat?.id))) continue;
        const senderChatId = msg.chat.id;
        const rawText = (msg.text || '').trim();
        const text = rawText.toLowerCase();
        if ((text === '/redemarrer' || text === '/restart') && onRestart) {
          await sendTelegramText('🔄 Redémarrage demandé depuis Telegram — relance de la connexion WhatsApp...', senderChatId);
          try {
            await onRestart();
          } catch (e) {
            await sendTelegramText(`⚠️ Erreur pendant le redémarrage : ${e.message}`, senderChatId);
          }
        } else if (text === '/status' && getStatusText) {
          try {
            await sendTelegramText(getStatusText(), senderChatId);
          } catch (e) {
            await sendTelegramText(`⚠️ Erreur en récupérant le statut : ${e.message}`, senderChatId);
          }
        } else if (text.startsWith('/run ') && onCommand) {
          // /run !commande args -> exécute dans ta propre conversation
          // /run <chatId> !commande args -> exécute en ciblant ce chat précis
          const rest = rawText.slice(5).trim();
          const parts = rest.split(/\s+/);
          let targetChatId = null;
          let commandText = rest;
          if (parts[0] && !parts[0].startsWith('!')) {
            targetChatId = parts[0];
            commandText = parts.slice(1).join(' ');
          }
          try {
            await onCommand(commandText, targetChatId, senderChatId);
          } catch (e) {
            await sendTelegramText(`⚠️ Erreur pendant l'exécution : ${e.message}`, senderChatId);
          }
        } else if (text.startsWith('/pair') && onPair) {
          // /pair <numéro> -> reconnecte WhatsApp sur ce numéro (nouveau pairing code)
          const newNumber = rawText.slice(5).trim().replace(/[^\d]/g, '');
          if (!newNumber || newNumber.length < 8) {
            await sendTelegramText('⚠️ Syntaxe : /pair <numéro avec indicatif, ex: 22890000000>', senderChatId);
            continue;
          }
          await sendTelegramText(`🔄 Reconnexion sur le numéro ${newNumber}...`, senderChatId);
          try {
            await onPair(newNumber);
          } catch (e) {
            await sendTelegramText(`⚠️ Erreur pendant le changement de numéro : ${e.message}`, senderChatId);
          }
        }
      }
    } catch (e) {
      console.error('Erreur polling Telegram:', e.response?.data?.description || e.message);
    } finally {
      setTimeout(poll, 4000);
    }
  };
  poll();
}

export async function sendTelegramPhoto(buffer, caption, targetChatId = null) {
  if (!enabled) return;
  try {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('chat_id', targetChatId || CHAT_ID);
    if (caption) form.append('caption', caption);
    form.append('photo', buffer, { filename: 'qr.png', contentType: 'image/png' });
    await axios.post(`${API}/sendPhoto`, form, { headers: form.getHeaders() });
  } catch (e) {
    console.error('Erreur envoi Telegram (photo):', e.response?.data?.description || e.message);
  }
}
