import axios from 'axios';

// Petit "bot" Telegram notifieur — pas un vrai bot interactif, juste un
// canal d'envoi à sens unique via l'API Bot Telegram, pour recevoir le QR
// code ou le pairing code de connexion WhatsApp directement sur Telegram
// (plus fiable que de compter sur l'affichage des logs du panel d'hébergement).
//
// Configuration (.env) :
//   TELEGRAM_BOT_TOKEN=<token donné par @BotFather>
//   TELEGRAM_CHAT_ID=<ton chat_id Telegram — demande-le à @userinfobot>
//
// Si l'une des deux variables manque, les fonctions ne font simplement rien
// (pas d'erreur bloquante) : le QR/pairing code reste visible dans les logs
// classiques comme avant.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const enabled = !!(TOKEN && CHAT_ID);

const API = `https://api.telegram.org/bot${TOKEN}`;

export function isTelegramNotifyEnabled() {
  return enabled;
}

export async function sendTelegramText(text) {
  if (!enabled) return;
  try {
    await axios.post(`${API}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
    });
  } catch (e) {
    console.error('Erreur envoi Telegram (texte):', e.response?.data?.description || e.message);
  }
}

// Écoute (polling simple, pas de webhook) les messages envoyés par CHAT_ID à
// ce bot Telegram, pour pouvoir déclencher des actions à distance — pour
// l'instant juste /redemarrer, qui relance la connexion WhatsApp (nouveau
// pairing code) sans avoir besoin d'ouvrir le dashboard ou Render.
// Sécurité : seuls les messages venant de CHAT_ID (celui configuré en .env,
// donc toi) sont pris en compte — tout le reste est ignoré.
let lastUpdateId = 0;
let pollingStarted = false;

export function startTelegramCommandListener({ onRestart, getStatusText } = {}) {
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
        if (!msg || String(msg.chat?.id) !== String(CHAT_ID)) continue;
        const text = (msg.text || '').trim().toLowerCase();
        if ((text === '/redemarrer' || text === '/restart') && onRestart) {
          await sendTelegramText('🔄 Redémarrage demandé depuis Telegram — relance de la connexion WhatsApp...');
          try {
            await onRestart();
          } catch (e) {
            await sendTelegramText(`⚠️ Erreur pendant le redémarrage : ${e.message}`);
          }
        } else if (text === '/status' && getStatusText) {
          try {
            await sendTelegramText(getStatusText());
          } catch (e) {
            await sendTelegramText(`⚠️ Erreur en récupérant le statut : ${e.message}`);
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

export async function sendTelegramPhoto(buffer, caption) {
  if (!enabled) return;
  try {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    if (caption) form.append('caption', caption);
    form.append('photo', buffer, { filename: 'qr.png', contentType: 'image/png' });
    await axios.post(`${API}/sendPhoto`, form, { headers: form.getHeaders() });
  } catch (e) {
    console.error('Erreur envoi Telegram (photo):', e.response?.data?.description || e.message);
  }
}
