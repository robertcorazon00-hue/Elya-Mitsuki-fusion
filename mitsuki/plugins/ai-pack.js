import * as ai from '../commands/ai.js';
import * as pack from '../commands/pack-davidcyril.js';
import { buildAiCard } from '../card.js';

function getQuotedText(msg) {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  return q?.conversation || q?.extendedTextMessage?.text || q?.imageMessage?.caption || q?.videoMessage?.caption || '';
}

// Commandes "question -> réponse" : texte de la commande, sinon message cité.
function askCommand(command, title, description, fn, emojiHint) {
  return {
    command,
    category: 'IA',
    description,
    handler: async ({ sock, from, argText, msg }) => {
      const question = argText || getQuotedText(msg);
      if (!question) { await sock.sendMessage(from, { text: `• Utilise : .${command} <question>${emojiHint || ''}` }); return; }
      try {
        const answer = await fn(question);
        await sock.sendMessage(from, { text: buildAiCard(title, answer) });
      } catch (e) {
        await sock.sendMessage(from, { text: `• ${e.message}` });
      }
    },
  };
}

const gemini = askCommand('gemini', 'Gemini', 'Pose une question à Gemini', ai.gemini);
const chatgpt5 = askCommand('chatgpt5', 'ChatGPT-5', 'Pose une question à ChatGPT-5', ai.chatgpt5);
const copilot = askCommand('copilot', 'Copilot', 'Pose une question à Copilot', ai.copilot);
const kimi = askCommand('kimi', 'Kimi', 'Pose une question à Kimi', pack.kimi);
const nova = askCommand('nova', 'Nova', 'Pose une question à Nova AI', pack.nova);

const resume = askCommand('resume', 'Résumé', 'Résume un texte (ou le message auquel tu réponds)', ai.resume);

// .translate [langue] <texte> — langue = code à 2 lettres (fr par défaut)
const translate = {
  command: 'translate',
  category: 'IA',
  description: 'Traduit un texte : .translate [langue] <texte> (ou réponds à un message)',
  handler: async ({ sock, from, args, msg }) => {
    let lang = 'fr';
    let words = args;
    if (args[0] && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(args[0])) {
      lang = args[0];
      words = args.slice(1);
    }
    const text = words.join(' ') || getQuotedText(msg);
    if (!text) {
      await sock.sendMessage(from, { text: '• Utilise : .translate [langue] <texte>  (ex : .translate en bonjour)' });
      return;
    }
    try {
      const r = await ai.translate(text, lang);
      await sock.sendMessage(from, { text: buildAiCard(`Traduction ${r.from} → ${r.to}`, r.text) });
    } catch (e) {
      await sock.sendMessage(from, { text: `• ${e.message}` });
    }
  },
};

export default [gemini, chatgpt5, copilot, kimi, nova, translate, resume];
