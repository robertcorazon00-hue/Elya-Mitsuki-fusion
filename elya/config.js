// elya/config.js — Réglages d'Elya AI utilisés par les commandes/plugins.
// Les réglages purement serveur/dashboard (DASHBOARD_PASSWORD, PORT, clés API...)
// restent dans server.js, qui n'en a pas besoin ailleurs.
export const BOT_NAME = process.env.BOT_NAME || 'Elya Prime';
export const PREFIX = process.env.PREFIX || '!';
export const MAX_HISTORY = parseInt(process.env.MAX_HISTORY) || 20;
export const OWNER_NUMBERS = (process.env.OWNER_NUMBERS || '')
  .split(',').map(n => n.trim()).filter(Boolean);
export const OWNER_NUMBER = OWNER_NUMBERS[0]; // rétrocompatibilité

export function isOwner(userId) {
  return OWNER_NUMBERS.includes(userId);
}

export const AI_MODELS = ['auto', 'gemini', 'groq', 'openrouter', 'minimax', 'gpt5', 'copilot', 'glm', 'huggingface', 'opus', 'fable', 'glm52', 'deepseek', 'kimi', 'qwen', 'nova', 'blackbox', 'gemini3pro', 'gpt55', 'llama33', 'anonymous', 'claudehaiku45', 'claudeopus48'];
