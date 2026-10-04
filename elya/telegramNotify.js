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
