// elya/config.js — Réglages d'Elya AI utilisés par les commandes/plugins.
// Les réglages purement serveur/dashboard (DASHBOARD_PASSWORD, PORT, clés API...)
// restent dans server.js, qui n'en a pas besoin ailleurs.
export const BOT_NAME = process.env.BOT_NAME || 'Elya Prime';
export const PREFIX = process.env.PREFIX || '!';
export const MAX_HISTORY = parseInt(process.env.MAX_HISTORY) || 40;
export const OWNER_NUMBERS = (process.env.OWNER_NUMBERS || '')
  .split(',').map(n => n.trim()).filter(Boolean);
export const OWNER_NUMBER = OWNER_NUMBERS[0]; // rétrocompatibilité

export function isOwner(userId) {
  if (!userId) return false;
  // userId arrive sous forme de JID complet (ex: 22896651556@s.whatsapp.net,
  // ou 245028672770302@lid avec le nouveau format WhatsApp), alors que
  // OWNER_NUMBERS contient des numéros bruts — on compare juste la partie
  // numéro/identifiant avant le "@" (et avant un éventuel ":device").
  const digits = String(userId).split('@')[0].split(':')[0];
  return OWNER_NUMBERS.some((n) => n.split('@')[0] === digits);
}

export const AI_MODELS = ['auto', 'gemini', 'groq', 'openrouter', 'minimax', 'gpt5', 'copilot', 'glm', 'huggingface', 'opus', 'fable', 'glm52', 'deepseek', 'kimi', 'qwen', 'nova', 'blackbox', 'gemini3pro', 'gpt55', 'llama33', 'anonymous', 'claudehaiku45', 'claudeopus48', 'ashna'];
