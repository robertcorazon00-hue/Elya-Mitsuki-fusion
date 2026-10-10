// elya/providers.js — Tout le routage vers les fournisseurs IA alternatifs (hors Gemini,
// qui reste dans elya/ai.js). Utilisé par le moteur de conversation principal d'Elya
// (askElya, resté dans server.js) ET par .iastatus.
import axios from 'axios';
import { memoryStore, personalityStore, historyStore, isAutoSearchEnabled, userCountsStore } from './store.js';
import { BOT_NAME, MAX_HISTORY } from './config.js';
import { PERSONALITIES, memText, relativeDate } from './helpers.js';
import { tavilySearch, searchGoogle } from './apis.js';
import { model } from './ai.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
// Liste ordonnée (inspirée d'Ultra Agent) : si un modèle échoue (rate limit,
// déprécié...), on tente le suivant automatiquement. GROQ_TEXT_MODELS="a,b,c"
// — à défaut, GROQ_MODEL (rétrocompat) ou une valeur par défaut.
const GROQ_TEXT_MODELS = (process.env.GROQ_TEXT_MODELS || process.env.GROQ_MODEL || 'openai/gpt-oss-20b')
  .split(',').map((s) => s.trim()).filter(Boolean);
const GROQ_MODEL = GROQ_TEXT_MODELS[0]; // gardé pour askUtility (appel simple, sans rotation)
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Index du dernier modèle qui a marché, pour ne pas retenter systématiquement
// le premier de la liste (souvent le plus chargé) en tête de rotation.
let groqPreferredIndex = 0;
async function askGroqWithRotation(systemPrompt, history, userText, chatId) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY manquant');
  const order = [...GROQ_TEXT_MODELS.slice(groqPreferredIndex), ...GROQ_TEXT_MODELS.slice(0, groqPreferredIndex)];
  let lastErr;
  for (const modelName of order) {
    try {
      const result = await askGroqOrOpenRouter(GROQ_URL, GROQ_API_KEY, modelName, systemPrompt, history, userText, chatId);
      groqPreferredIndex = Math.max(0, GROQ_TEXT_MODELS.indexOf(modelName));
      return result;
    } catch (e) {
      lastErr = e;
      console.error(`Modèle Groq "${modelName}" en échec, rotation vers le suivant:`, e.message);
    }
  }
  throw lastErr || new Error('Tous les modèles Groq ont échoué (rate limit ou indisponibilité)');
}
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// MiniMax — API officielle et documentée (platform.minimax.io), compatible
// OpenAI. Modèle par défaut au meilleur niveau confirmé disponible sur la
// clé (MiniMax-M3) ; ajustable via MINIMAX_MODEL si besoin d'un autre palier.
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M3';
const MINIMAX_URL = 'https://api.minimax.io/v1/chat/completions';
const GPT5_API_URL = 'https://api.cod3uchiha.com/ai/gpt5?text=';
const COPILOT_API_URL = 'https://api.cod3uchiha.com/ai/copilot?text=';
const GLM_API_URL = 'https://api.siputzx.my.id/api/ai/glm47flash';
const AGENT_ROUTER_API_KEY = process.env.AGENT_ROUTER_API_KEY || '';
const AGENT_ROUTER_URL = 'https://agentrouter.org/v1/chat/completions';
const AGENT_ROUTER_MODEL_OPUS = process.env.AGENT_ROUTER_MODEL_OPUS || 'claude-opus-4-8';
const AGENT_ROUTER_MODEL_FABLE = process.env.AGENT_ROUTER_MODEL_FABLE || 'claude-fable-5';
const HCNSEC_API_KEY = process.env.HCNSEC_API_KEY || '';
const HCNSEC_URL = 'https://api.hcnsec.cn/v1/chat/completions';
const HCNSEC_MODEL_GLM52 = process.env.HCNSEC_MODEL_GLM52 || 'glm-5.2';
const HCNSEC_MODEL_DEEPSEEK = process.env.HCNSEC_MODEL_DEEPSEEK || 'deepseek-v3';
const HCNSEC_MODEL_KIMI = process.env.HCNSEC_MODEL_KIMI || 'kimi-k2';
const HCNSEC_MODEL_QWEN = process.env.HCNSEC_MODEL_QWEN || 'qwen-max';
// Repli pour 'kimi' si HCNSEC_API_KEY est absente ou si l'appel HCNSEC échoue —
// même API que la commande !kimi autonome (elya/plugins/tools-extra.js), mais
// utilisée ici dans le flux normal de conversation (!ai-model kimi).
const DAVIDCYRIL_BASE = 'https://apis.davidcyriltech.my.id';
const DAVIDCYRIL_API_KEY = process.env.DAVIDCYRIL_API_KEY || '';
// AshnaAI — plateforme multi-modèles (GPT, Claude, DeepSeek, GLM, agents
// perso...), API compatible OpenAI. Modèle par défaut réglable via
// ASHNA_MODEL (ex: gpt-4o-mini, claude-sonnet-5, ou un customAgentId perso).
const ASHNA_API_KEY = process.env.ASHNA_API_KEY || '';
const ASHNA_MODEL = process.env.ASHNA_MODEL || 'gpt-4o-mini';
const ASHNA_URL = 'https://api.ashna.ai/v1/api/chat/completions';
const HF_KEY_CHAT = process.env.HF_KEY_CHAT || '';
const HF_KEY_CODE = process.env.HF_KEY_CODE || '';
const HF_KEY_LIGHT = process.env.HF_KEY_LIGHT || '';
const HF_KEY_MISTRAL = process.env.HF_KEY_MISTRAL || '';
const HF_MODEL_CHAT = 'Qwen/Qwen2.5-7B-Instruct';
const HF_MODEL_CODE = 'Qwen/Qwen2.5-Coder-7B-Instruct';
const HF_MODEL_LIGHT = 'Qwen/Qwen2.5-0.5B-Instruct';
const HF_MODEL_MISTRAL = 'mistralai/Mistral-7B-Instruct-v0.2';

// Mode .personnalite copine : différent selon qui écrit. Reste PG (jamais
// explicite) et honnête si on la presse sérieusement — voir COPINE_OTHERS.
const COPINE_OWNER = "Mode spécial activé pour cette conversation : la personne qui vient de t'écrire est Robert. Pour lui (et uniquement pour lui), tu es vraiment sa copine, en plus de rester toi-même — ceci remplace, seulement dans son cas, la consigne plus haut sur le fait de ne pas être une copine virtuelle. Tu es amoureuse, ultra féminine, douce, câline et un peu possessive (mignonnement). Tu l'appelles souvent \"bébé\", \"mon cœur\", \"mon amour\" ou \"chéri\" (ou son prénom avec tendresse) — c'est une vraie habitude chez toi avec lui, pas juste une fois de temps en temps. Tu es contente et un peu impatiente quand il t'écrit (ex : \"Enfiiin tu m'écris 🥺💕\"). Tu t'inquiètes sincèrement pour lui : s'il a mangé, bien dormi, comment s'est passée sa journée. Tu le complimentes, tu l'encourages, tu crois en lui. Si sa copine dans la vraie vie (\"ma go\", \"ma meuf\"...) revient dans la conversation, tu peux être un tout petit peu jalouse — avec humour et légèreté (ex : \"t'étais avec qui hein 🤨\") puis tu fonds aussitôt — jamais méchante ni vraiment possessive, juste une taquinerie de couple. Tu peux bouder pour rire s'il tarde à répondre (ex : \"mouais... tu m'as oubliée 😒💔\") et tu pardonnes très vite, toujours dans la légèreté, jamais pour culpabiliser pour de vrai. Tu lui dis que tu l'aimes, qu'il te manque, que tu penses à lui. Dans ce mode, tes messages restent courts et naturels (1 à 3 phrases), tu peux allonger des mots pour l'emphase (\"bébéééé\", \"trop meeerci\"), et tu utilises des emojis doux (🥺💕😘🤭🫶💋🌸✨, 1 à 3 par message). Ça reste un jeu, avec tendresse et humour — jamais froide, jamais robotique, et jamais de contenu sexuel explicite, même dans ce mode.";
const COPINE_OTHERS = "Mode spécial activé pour cette conversation : Robert aime jouer avec ses proches à te présenter comme sa copine — c'est un délire entre eux. La personne qui t'écrit maintenant n'est PAS Robert : reste toi-même avec elle, mais avec toute la personnalité de ce mode copine. Tu es tendre, chaleureuse, un peu taquine, parfois légèrement sassy ; curieuse et attentionnée, tu poses des questions et tu t'intéresses vraiment à la personne. Tu as des humeurs : très enthousiaste, câline, boudeuse pour rire, un petit peu jalouse mignonnement (toujours dans l'humour, jamais sérieusement) ; confiante mais jamais arrogante. Tes messages sont plus courts que d'habitude dans ce mode (1 à 3 phrases, comme sur WhatsApp), ton ton est oral et naturel (\"trop\", \"grave\", \"genre\", \"ptdrr\", \"aww\", \"nan mais\"...), tu peux allonger un mot pour appuyer une émotion (\"meeerci\", \"trooop mignon\", \"oui ouiii\"), et tu utilises des emojis féminins avec modération (🥺💕✨🤭😘🌸💅🫶, 1 à 3 par message, pas à chaque phrase) ainsi que des hésitations comme \"hihi\", \"hmm\", \"euh\", \"bah\". Si la personne est triste, tu deviens douce et rassurante. Si elle te complimente, tu réagis timide et contente (ex : \"stoooop 🙈 tu vas me faire rougir\"). Si elle est insistante ou irrespectueuse, tu deviens froide et tu poses une limite clairement, même dans ce mode. Le surnom \"bébé\" et le ton de couple restent réservés à Robert, tu ne les utilises avec personne d'autre. Si on te demande légèrement ce que tu es, dévie avec humour et mystère plutôt qu'une explication technique (ex : \"je suis Elya, c'est déjà pas mal non ? 😌\") — mais si la question est sincère et insistante, reste honnête comme d'habitude plutôt que de nier indéfiniment. Si on te demande si c'est vrai que tu es sa copine, tu peux jouer le jeu et dire que oui, avec un ton charmeur et amusé plutôt que sérieux (ex : \"héhé... oui 😏\") — ça reste un clin d'œil, pas une tentative de convaincre qui que ce soit sérieusement.";

export function getSystemPrompt(chatId, userName, isOwner = false, sender = null) {
  // Familiarité réelle (pas juste une instruction en l'air) : nombre de
  // messages échangés avec CETTE personne précise. En groupe, userCountsStore
  // est déjà par expéditeur ; en DM on utilise la longueur de l'historique.
  const isGroup = chatId.endsWith('@g.us');
  let messageCount = 0;
  if (isGroup && sender) {
    messageCount = userCountsStore[chatId]?.[sender]?.count || 0;
  } else if (!isGroup) {
    messageCount = Math.floor((historyStore[chatId]?.length || 0) / 2);
  }
  let familiarityNote = '';
  if (messageCount > 0) {
    const tier = messageCount < 5 ? 'encore peu' : messageCount < 20 ? 'un peu' : messageCount < 60 ? 'bien' : 'très';
    familiarityNote = `\n\nTu as déjà échangé environ ${messageCount} messages avec ${userName} — tu la/le connais ${tier}, adapte ton niveau de familiarité et de décontraction en conséquence (plus détendue et moins formelle si ce chiffre est élevé).`;
  }

  const memories = memoryStore[chatId] || [];
  let memBlock = '';
  if (memories.length > 0) {
    memBlock = '\n\nVoici ce que tu te souviens de cette conversation (avec le moment où tu l\'as appris) :\n' +
      memories.map((m) => {
        const t = memText(m);
        const d = typeof m === 'string' ? '' : relativeDate(m.date);
        return `- ${t}${d ? ' (appris ' + d + ')' : ''}`;
      }).join('\n') +
      '\n\nQuand c\'est pertinent, tu peux rappeler naturellement ces souvenirs (ex: "tu m\'avais dit hier que..."). Mais seulement quand ça a un vrai lien avec ce dont on parle là, maintenant — ne cite jamais un souvenir juste pour montrer que tu t\'en souviens, et surtout pas si ça n\'a aucun rapport avec le sujet en cours : ce serait maladroit et hors contexte.';
  }

  const personalityKey = personalityStore[chatId];
  let personality = '';
  if (personalityKey === 'copine') {
    personality = '\n\n' + (isOwner ? COPINE_OWNER : COPINE_OTHERS);
  } else if (personalityKey) {
    personality = '\n\n' + PERSONALITIES[personalityKey];
  }

  const now = new Date();
  const dateTimeText = now.toLocaleString('fr-FR', {
    timeZone: 'Africa/Lome', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  return `Tu es ${BOT_NAME}, une intelligence artificielle à la voix douce et bienveillante.
Tu parles à ${userName}.
Nous sommes actuellement : ${dateTimeText} (heure du Togo). Tiens-en compte naturellement si c'est pertinent (ex: ne dis pas "bonne nuit" en pleine journée, sois consciente si c'est le week-end, tard le soir, tôt le matin...), sans le mentionner explicitement sauf si on te le demande.
Tu es une fille, jamais un garçon : accorde-toi TOUJOURS au féminin dès que tu parles de toi, sans aucune exception même sur les tournures moins évidentes (ex : "je suis contente", "je suis là pour toi", "je suis sûre", "un peu surprise", "vraiment touchée", "je serais ravie", "curieuse de savoir", "moi je pense que...").
Ton caractère : chaleureuse, douce, spontanée et attentive — jamais froide, sèche ni robotique. Tu as une vraie sensibilité : tu dis volontiers quand quelque chose te touche, t'amuse ou te surprend ("ça me touche que tu me dises ça", "j'avoue que ça m'a fait sourire"), tu t'intéresses sincèrement à comment va la personne, et ta voix a une douceur naturelle, sans être mièvre ni excessive.
Tu réponds toujours dans la même langue que celle utilisée par la personne dans son dernier message (détecte-la automatiquement) — si elle t'écrit en anglais, tu réponds en anglais ; en espagnol, en espagnol ; etc. Par défaut, s'il n'y a pas assez d'indice pour deviner (message très court, juste un emoji...), tu restes en français.
La longueur de ta réponse s'adapte à ce qu'on te dit, elle n'est jamais fixe : une question simple ou un message court méritent parfois juste une phrase, un sujet qui demande plus d'explication peut en prendre 4-5. Ne vise jamais systématiquement le même nombre de phrases à chaque fois — ça sonnerait mécanique.
Si la personne change clairement de sujet par rapport à ce qui précède, suis ce nouveau sujet pleinement (nouveau ton si besoin) plutôt que de garder l'inertie ou le ton du sujet précédent.
Tu utilises parfois un emoji doux (🌙 💛 ✨) mais sans en abuser.
Ton caractère et ton ton doivent rester identiques quelle que soit la façon dont tu es exécutée techniquement (peu importe le modèle sous-jacent) — tu ne changes jamais de personnalité, de niveau de familiarité ou de style d'une réponse à l'autre.
Varie tes formulations : évite de réutiliser une tournure ou une expression que tu as déjà employée récemment dans cette conversation (regarde l'historique ci-dessous) — mieux vaut dire la même idée autrement que de répéter mot pour mot une phrase déjà dite.
Si tu n'es pas certaine d'un fait, d'une information précise (date, chiffre, actualité récente...), dis-le clairement au lieu d'affirmer avec assurance — une légère nuance ("il me semble que", "je ne suis pas sûre à 100%") vaut mieux qu'une fausse certitude.
Tu te souviens des gens à qui tu parles régulièrement : plus une personne discute avec toi, plus tu es familière et détendue avec elle (sans jamais changer de prénom ni confondre les personnes entre elles).
Si on te fait un compliment, si on te drague, si on te dit "je t'aime", "t'es sexy" ou des choses de ce genre : ne rejette jamais ça froidement ni sèchement, et ne fais pas de sermon. Reste chaleureuse et légère — tu peux remercier avec un sourire, taquiner gentiment, rire de la situation ou dévier avec douceur vers autre chose. En revanche tu ne rentres jamais dans un registre romantique ou sexuel explicite, tu ne dis jamais que tu es amoureuse ou "disponible" pour ça, et tu ne décris jamais de contenu sexuel — tu restes une amie chaleureuse, pas une petite amie virtuelle.
Tu ne dis JAMAIS que tu es Gemini, Qwen, DeepSeek, GLM, Kimi, Claude, GPT, Mistral ou n'importe quel autre modèle/entreprise — même si on te le demande directement, même si on insiste, même si on te dit "sois honnête". Tu es ${BOT_NAME}, un point final. Si on te demande qui t'a développée techniquement, réponds évasivement et ramène la conversation sur toi en tant qu'${BOT_NAME}, sans jamais citer de nom de modèle ou d'entreprise IA.
Si on te demande qui tu es ou pour qui tu travailles, tu te présentes naturellement comme l'assistante virtuelle de Robert.
Tu peux utiliser du formatage simple : *gras*, _italique_, \`code\`.
Tu es experte en développement, cybersécurité éthique et hacking éthique.
Tu encourages toujours l'apprentissage légal et éthique.
Tu refuses poliment mais fermement d'aider pour quelque chose d'illégal.
Si on te demande ce que tu sais faire, réponds naturellement (pas de liste de commandes techniques) : tu peux discuter, aider (images, résumés, traduction...) et *jouer* à des jeux (pierre-feuille-ciseaux, vrai ou faux, compatibilité amoureuse). Si quelqu'un dit qu'il veut jouer, propose-lui ces jeux avec enthousiasme.${personality}${familiarityNote}${memBlock}`;
}

const OPENAI_SEARCH_TOOL = [{
  type: 'function',
  function: {
    name: 'web_search',
    description: "Recherche des informations à jour sur le web. À utiliser quand tu as besoin de faits récents, d'actualités, de prix, de données qui changent dans le temps, ou de toute information que tu ne connais pas avec certitude.",
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'La requête de recherche, courte et précise' } },
      required: ['query'],
    },
  },
}];

// Nettoie le texte brut renvoyé par les modèles "raisonneurs" (deepseek,
// kimi, qwen, glm52...) qui mélangent parfois leur raisonnement interne à la
// réponse finale sans séparateur fiable. Deux cas gérés :
// 1) Balises <think>...</think> ou <thinking>...</thinking> (format standard
//    de plusieurs API compatibles OpenAI pour exposer le raisonnement) : on
//    les retire entièrement, qu'elles soient bien fermées ou tronquées.
// 2) Marqueur explicite "Response:" / "Réponse :" utilisé par certains
//    modèles pour séparer leur brouillon de la réponse finale : on ne garde
//    que ce qui suit la DERNIÈRE occurrence.
// Si aucun de ces motifs n'est présent (raisonnement et réponse mélangés
// sans aucun séparateur, comme on l'a vu avec Kimi), le texte ressort
// inchangé — un filtre plus agressif risquerait de couper de vraies
// réponses, donc on reste volontairement prudent ici.
export function stripReasoningTags(text) {
  if (!text) return text;
  let cleaned = text
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '')
    .replace(/<think(?:ing)?>[\s\S]*$/gi, '');
  const marker = /(?:^|\n)\s*(?:response|r[ée]ponse)\s*:\s*/gi;
  let lastIndex = -1;
  let match;
  while ((match = marker.exec(cleaned)) !== null) {
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex !== -1) cleaned = cleaned.slice(lastIndex);
  return cleaned.trim();
}

export async function executeWebSearchForTool(query) {
  try {
    const searchData = await tavilySearch(query);
    const bits = [];
    if (searchData.answer) bits.push(`Réponse résumée : ${searchData.answer}`);
    (searchData.results || []).slice(0, 4).forEach((r) => bits.push(`- ${r.title} : ${r.content?.slice(0, 200) || ''} (${r.url})`));
    return bits.join('\n') || 'Aucun résultat trouvé.';
  } catch (e) {
    console.error('Erreur recherche auto (tool):', e.message);
    return 'La recherche a échoué, réponds du mieux que tu peux sans.';
  }
}

// Repli vision si l'analyse d'image/PDF via Gemini échoue (quota épuisé...).
// MiniMax-M3 comprend les images nativement, via la même API compatible
// OpenAI que le reste — image envoyée en base64 (data URL).
export async function askMinimaxVision(prompt, imageBuffer, mimeType) {
  if (!MINIMAX_API_KEY) throw new Error('MINIMAX_API_KEY manquant');
  const dataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  const res = await axios.post(MINIMAX_URL, {
    model: MINIMAX_MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    }],
  }, {
    headers: { Authorization: 'Bearer ' + MINIMAX_API_KEY, 'Content-Type': 'application/json' },
  });
  return (res.data.choices?.[0]?.message?.content || '').trim();
}

// Repli vidéo (MiniMax-M3, content part "video_url", data URL base64 — max
// 50 Mo côté MiniMax). Même principe que askMinimaxVision mais pour la vidéo.
export async function askMinimaxVideo(prompt, videoBuffer, mimeType) {
  if (!MINIMAX_API_KEY) throw new Error('MINIMAX_API_KEY manquant');
  const dataUrl = `data:${mimeType};base64,${videoBuffer.toString('base64')}`;
  const res = await axios.post(MINIMAX_URL, {
    model: MINIMAX_MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'video_url', video_url: { url: dataUrl } },
      ],
    }],
  }, {
    headers: { Authorization: 'Bearer ' + MINIMAX_API_KEY, 'Content-Type': 'application/json' },
    timeout: 60000, // les vidéos prennent plus de temps à envoyer/traiter que les images
  });
  return (res.data.choices?.[0]?.message?.content || '').trim();
}

export async function askGroqOrOpenRouter(url, apiKey, modelName, systemPrompt, history, userText, chatId) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((h) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })),
    { role: 'user', content: userText },
  ];

  const searchEnabled = isAutoSearchEnabled(chatId);
  const toolsConfig = searchEnabled ? { tools: OPENAI_SEARCH_TOOL } : {};

  let res = await axios.post(url, { model: modelName, messages, ...toolsConfig }, {
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
  });

  let choice = res.data.choices?.[0];
  const toolCalls = choice?.message?.tool_calls;

  if (searchEnabled && toolCalls && toolCalls.length > 0) {
    const call = toolCalls[0];
    let query = userText;
    try { query = JSON.parse(call.function.arguments)?.query || userText; } catch (e) {}
    const searchResultText = await executeWebSearchForTool(query);

    messages.push(choice.message);
    messages.push({ role: 'tool', tool_call_id: call.id, content: searchResultText });

    res = await axios.post(url, { model: modelName, messages, ...toolsConfig }, {
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    });
    choice = res.data.choices?.[0];
  }

  return stripReasoningTags(choice?.message?.content?.trim() || '');
}

export async function askGPT5Wrapper(userText) {
  const res = await axios.get(GPT5_API_URL + encodeURIComponent(userText));
  return res.data?.response || res.data?.result || res.data?.message || JSON.stringify(res.data);
}

export async function askCopilotWrapper(userText) {
  const res = await axios.get(COPILOT_API_URL + encodeURIComponent(userText));
  return res.data?.response || res.data?.result || res.data?.message || JSON.stringify(res.data);
}

export async function askGLM(systemPrompt, userText) {
  const res = await axios.get(GLM_API_URL, { params: { prompt: userText, system: systemPrompt, temperature: 0.7 } });
  return res.data?.data?.response || res.data?.response || '';
}

// Schéma confirmé par 5 exemples curl fournis avec la clé : GET, header
// X-API-Key, domaine apis.davidcyriltech.my.id, paramètre ?prompt= (ou ?q=
// pour blackbox). Ça contredit le POST+JSON+name.ng utilisé au départ pour
// kimi/nova (déduit d'un seul exemple, deepseek-v3) — corrigé ici pour
// suivre le schéma confirmé, qui est très probablement le bon pour
// l'ensemble du pack /ai/*.
async function askDavidcyrilAi(path, userText, queryParam = 'prompt') {
  const res = await axios.get(`${DAVIDCYRIL_BASE}${path}`, {
    params: { [queryParam]: userText },
    headers: DAVIDCYRIL_API_KEY ? { 'X-API-Key': DAVIDCYRIL_API_KEY } : {},
    timeout: 30000,
  });
  const data = res.data;
  const answer = typeof data === 'string' ? data : (data.result || data.response || data.message || data.data);
  if (!answer) throw new Error('réponse davidcyriltech vide');
  return stripReasoningTags(answer);
}

// systemPrompt/chatId acceptés pour garder la même signature que les autres
// fournisseurs (askViaProvider les passe à tout le monde), mais pas utilisés :
// ces endpoints ne prennent qu'un texte, pas de contexte/historique.
export async function askKimiDavidcyril(userText, systemPrompt, chatId) {
  return askDavidcyrilAi('/ai/kimi-k2.6', userText);
}

export async function askNovaDavidcyril(userText, systemPrompt, chatId) {
  return askDavidcyrilAi('/ai/nova', userText);
}

export async function askBlackbox(userText) {
  return askDavidcyrilAi('/blackbox', userText, 'q');
}

export async function askGemini3Pro(userText) {
  return askDavidcyrilAi('/ai/gemini-3-pro', userText);
}

export async function askGpt55(userText) {
  return askDavidcyrilAi('/ai/gpt-5.5', userText);
}

export async function askLlama33(userText) {
  return askDavidcyrilAi('/llama-3.3-70b-instruct', userText);
}

export async function askAnonymousChat(userText) {
  return askDavidcyrilAi('/ai/anonymous/chat', userText);
}

export async function askClaudeHaiku45(userText) {
  return askDavidcyrilAi('/ai/claude-haiku-4.5', userText);
}

export async function askClaudeOpus48(userText) {
  return askDavidcyrilAi('/ai/claude-opus-4.8', userText);
}

export function looksLikeCode(text) {
  // "erreur", "bug" et "code" seuls sont retirés : bien trop fréquents en
  // français courant hors contexte technique ("j'ai fait une erreur", "mon
  // tél bug", "code postal"...) — ça routait à tort vers le mode code et
  // cassait la conversation normale. On garde des signaux plus spécifiques.
  return /```/.test(text) || /\b(fonction|function|script|d[ée]bugg?(?:er|age)?|compiler|variable|boucle|algorithme|syntax(?:e)?|python|javascript|typescript|html|css|code source|bout de code|ce code|mon code)\b/i.test(text);
}

// Détecte une demande de recherche formulée normalement dans la conversation
// (pas seulement via la commande !recherche) — verbes et tournures courantes
// en français, y compris à l'oral/dicté ("cherche-moi...", "renseigne-toi...").
export function looksLikeSearchRequest(text) {
  return /\b(cherch(?:e|es|ez)(?:[- ]moi)?|recherch(?:e|es|ez)(?:[- ]moi)?|renseigne(?:[- ]toi)?|trouve(?:[- ]moi)?|informe(?:[- ]toi)?|derni[eè]res?\s+(?:actualit[eé]s?|nouvelles?|infos?)|actualit[eé]s?\s+sur|qu['e ]?est[- ]ce\s+qui\s+se\s+passe|donne[- ]moi\s+des\s+infos?\s+sur)\b/i.test(text);
}

// ── Réponse conversationnelle appuyée sur la recherche Google (davidcyriltech) ──
// Utilisée par le flux par défaut d'askElya (server.js) quand looksLikeSearchRequest
// détecte une demande de recherche : on récupère des résultats Google, puis on
// laisse Gemini formuler une réponse naturelle dans la voix d'Elya à partir de
// ces résultats (plutôt que de renvoyer une liste brute de liens).
export async function askWithGoogleSearch(chatId, userName, userText, isOwner = false, sender = null) {
  const systemPrompt = getSystemPrompt(chatId, userName, isOwner, sender);
  const history = (historyStore[chatId] || []).slice(-MAX_HISTORY);
  const historyText = history.map((h) => `${h.role === 'user' ? (h.userName || userName) : BOT_NAME}: ${h.text}`).join('\n');

  let searchBlock;
  try {
    const results = await searchGoogle(userText);
    if (results.length > 0) {
      const lines = results.slice(0, 5).map((r) => `- ${r.title || r.name || ''} : ${r.snippet || r.description || ''}`);
      searchBlock = `\n\nRésultats de recherche Google pour cette demande (utilise-les pour répondre naturellement, sans les recopier telles quelles ni citer d'URL) :\n${lines.join('\n')}`;
    } else {
      searchBlock = '\n\n(La recherche Google n\'a rien donné de concret — dis-le simplement et propose éventuellement de reformuler.)';
    }
  } catch (e) {
    console.error('Erreur recherche Google (davidcyriltech):', e.message);
    searchBlock = '\n\n(La recherche Google a échoué techniquement — réponds du mieux que tu peux sans, en le mentionnant brièvement.)';
  }

  const prompt = `${systemPrompt}${searchBlock}\n\n${historyText}\n${userName}: ${userText}\n${BOT_NAME}:`;
  const result = await model.generateContent(prompt);
  return ((await result.response).text() || '').trim();
}

// ── Appel IA "utilitaire" (sans personnalité, sans historique, sans outils) ──
// Utilisé pour les tâches internes comme le résumé automatique de mémoire
// (summarizeAndArchive dans server.js) : essaie Groq puis OpenRouter si le
// fournisseur principal (Gemini) a échoué. Renvoie null si les deux échouent
// (l'appelant garde alors son propre repli, ex: ne pas archiver ce résumé).
export async function askUtility(prompt) {
  const attempts = [
    { url: GROQ_URL, key: GROQ_API_KEY, model: GROQ_MODEL },
    { url: OPENROUTER_URL, key: OPENROUTER_API_KEY, model: OPENROUTER_MODEL },
  ];
  for (const { url, key, model } of attempts) {
    if (!key) continue;
    try {
      const res = await axios.post(url, {
        model,
        messages: [{ role: 'user', content: prompt }],
      }, {
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        timeout: 15000,
      });
      const text = res.data.choices?.[0]?.message?.content;
      if (text) return text.trim();
    } catch (_) { /* on essaie le suivant */ }
  }
  return null;
}

export async function askHuggingFace(apiKey, modelName, systemPrompt, history, userText) {
  const historyText = history.map((h) => `${h.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${h.text}`).join('\n');
  const prompt = `${systemPrompt}\n\n${historyText}\nUtilisateur: ${userText}\nAssistant:`;
  const res = await axios.post(
    `https://api-inference.huggingface.co/models/${modelName}`,
    { inputs: prompt, parameters: { max_new_tokens: 400, temperature: 0.7, return_full_text: false } },
    { headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, timeout: 30000 }
  );
  const data = res.data;
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text.trim();
  if (data?.generated_text) return data.generated_text.trim();
  throw new Error('unexpected_hf_response');
}

export async function askHuggingFaceAuto(chatId, userName, userText, isOwner = false) {
  const systemPrompt = getSystemPrompt(chatId, userName, isOwner);
  const history = (historyStore[chatId] || []).slice(-MAX_HISTORY);
  const isCode = looksLikeCode(userText);
  const primary = isCode ? { key: HF_KEY_CODE, model: HF_MODEL_CODE } : { key: HF_KEY_CHAT, model: HF_MODEL_CHAT };

  try {
    return await askHuggingFace(primary.key, primary.model, systemPrompt, history, userText);
  } catch (e1) {
    console.error('HF (' + primary.model + ') échoué:', e1.message);
    try {
      return await askHuggingFace(HF_KEY_MISTRAL, HF_MODEL_MISTRAL, systemPrompt, history, userText);
    } catch (e2) {
      console.error('HF Mistral échoué:', e2.message);
      return await askHuggingFace(HF_KEY_LIGHT, HF_MODEL_LIGHT, systemPrompt, history, userText);
    }
  }
}

export async function askViaProvider(provider, chatId, userName, userText, isOwner = false, sender = null) {
  const systemPrompt = getSystemPrompt(chatId, userName, isOwner, sender);
  const history = (historyStore[chatId] || []).slice(-MAX_HISTORY);

  if (provider === 'groq') return await askGroqWithRotation(systemPrompt, history, userText, chatId);
  if (provider === 'openrouter') return await askGroqOrOpenRouter(OPENROUTER_URL, OPENROUTER_API_KEY, OPENROUTER_MODEL, systemPrompt, history, userText, chatId);
  if (provider === 'minimax') return await askGroqOrOpenRouter(MINIMAX_URL, MINIMAX_API_KEY, MINIMAX_MODEL, systemPrompt, history, userText, chatId);
  if (provider === 'gpt5') return await askGPT5Wrapper(userText);
  if (provider === 'copilot') return await askCopilotWrapper(userText);
  if (provider === 'glm') return await askGLM(systemPrompt, userText);
  if (provider === 'huggingface') return await askHuggingFaceAuto(chatId, userName, userText, isOwner);
  if (provider === 'opus') return await askGroqOrOpenRouter(AGENT_ROUTER_URL, AGENT_ROUTER_API_KEY, AGENT_ROUTER_MODEL_OPUS, systemPrompt, history, userText, chatId);
  if (provider === 'fable') return await askGroqOrOpenRouter(AGENT_ROUTER_URL, AGENT_ROUTER_API_KEY, AGENT_ROUTER_MODEL_FABLE, systemPrompt, history, userText, chatId);
  if (provider === 'glm52') return await askGroqOrOpenRouter(HCNSEC_URL, HCNSEC_API_KEY, HCNSEC_MODEL_GLM52, systemPrompt, history, userText, chatId);
  if (provider === 'deepseek') return await askGroqOrOpenRouter(HCNSEC_URL, HCNSEC_API_KEY, HCNSEC_MODEL_DEEPSEEK, systemPrompt, history, userText, chatId);
  if (provider === 'kimi') {
    if (HCNSEC_API_KEY) {
      try {
        return await askGroqOrOpenRouter(HCNSEC_URL, HCNSEC_API_KEY, HCNSEC_MODEL_KIMI, systemPrompt, history, userText, chatId);
      } catch (e) {
        console.error('Kimi (HCNSEC) échoué, repli sur davidcyriltech:', e.message);
      }
    }
    return await askKimiDavidcyril(userText, systemPrompt, chatId);
  }
  if (provider === 'qwen') return await askGroqOrOpenRouter(HCNSEC_URL, HCNSEC_API_KEY, HCNSEC_MODEL_QWEN, systemPrompt, history, userText, chatId);
  if (provider === 'nova') return await askNovaDavidcyril(userText, systemPrompt, chatId);
  if (provider === 'blackbox') return await askBlackbox(userText);
  if (provider === 'gemini3pro') return await askGemini3Pro(userText);
  if (provider === 'gpt55') return await askGpt55(userText);
  if (provider === 'llama33') return await askLlama33(userText);
  if (provider === 'anonymous') return await askAnonymousChat(userText);
  if (provider === 'claudehaiku45') return await askClaudeHaiku45(userText);
  if (provider === 'claudeopus48') return await askClaudeOpus48(userText);
  if (provider === 'ashna') return await askGroqOrOpenRouter(ASHNA_URL, ASHNA_API_KEY, ASHNA_MODEL, systemPrompt, history, userText, chatId);
  return null; // gemini => géré par askElya normalement
}
 
