// pluginLoader.js — Système de plugins pour Mitsuki Kiryu-MD
//
// Chaque fichier dans ./plugins exporte par défaut un objet (ou un tableau d'objets) :
//   export default {
//     command: 'ping',            // nom de la commande (sans préfixe)
//     aliases: ['pong'],          // optionnel
//     category: 'GENERAL',        // doit correspondre à un nom de SECTIONS dans menu.js
//     description: '...',         // optionnel, pour .help
//     ownerOnly: false,           // optionnel — bloque automatiquement si pas owner
//     groupOnly: false,           // optionnel — bloque automatiquement si pas en groupe
//     handler: async (ctx) => {}, // logique de la commande
//   }
//
// ctx fourni au handler : { sock, msg, from, sender, isGroup, isOwner, cmd, args, argText, storage }
//
// Migration progressive : dispatch() renvoie `false` si aucune commande ne correspond,
// ce qui permet à handler.js de retomber sur l'ancien switch/case pour tout ce qui
// n'a pas encore été porté en plugin.

import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGINS_DIR = path.join(__dirname, 'plugins');

const commands = new Map();   // command -> plugin
const aliasMap = new Map();   // alias -> command

function registerPlugin(plugin, filePath) {
  if (!plugin || !plugin.command || typeof plugin.handler !== 'function') {
    console.warn(`[plugins] Fichier ignoré (format invalide) : ${filePath}`);
    return;
  }
  const cmdKey = plugin.command.toLowerCase();
  commands.set(cmdKey, plugin);
  if (Array.isArray(plugin.aliases)) {
    for (const alias of plugin.aliases) {
      aliasMap.set(alias.toLowerCase(), cmdKey);
    }
  }
}

// En ESM il n'existe pas d'équivalent à require.cache : pour forcer un rechargement
// (utilisé par watch()), on ajoute un paramètre d'URL unique à chaque import.
async function loadFile(filePath, { fresh = false } = {}) {
  try {
    const url = pathToFileURL(filePath).href + (fresh ? `?update=${Date.now()}` : '');
    const mod = await import(url);
    const exported = mod.default;
    if (Array.isArray(exported)) {
      for (const plugin of exported) registerPlugin(plugin, filePath);
    } else {
      registerPlugin(exported, filePath);
    }
    return true;
  } catch (err) {
    console.error(`[plugins] Erreur de chargement ${filePath} :`, err.message);
    return false;
  }
}

async function loadAll() {
  commands.clear();
  aliasMap.clear();
  if (!fs.existsSync(PLUGINS_DIR)) return;
  const files = fs.readdirSync(PLUGINS_DIR).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    await loadFile(path.join(PLUGINS_DIR, file));
  }
  console.log(`[plugins] ${commands.size} commande(s) chargée(s) depuis /plugins (+ ${aliasMap.size} alias)`);
}

// Recharge un seul fichier à chaud (utile en dev) — désactivé par défaut en prod.
// Note ESM : chaque rechargement crée une nouvelle instance de module en mémoire
// (pas d'invalidation de cache comme require.cache en CommonJS) ; à réserver au dev.
function watch() {
  if (!fs.existsSync(PLUGINS_DIR)) return;
  fs.watch(PLUGINS_DIR, (eventType, filename) => {
    if (!filename || !filename.endsWith('.js')) return;
    const filePath = path.join(PLUGINS_DIR, filename);
    if (fs.existsSync(filePath)) {
      loadFile(filePath, { fresh: true }).then((ok) => {
        if (ok) console.log(`[plugins] Rechargé à chaud : ${filename}`);
      });
    }
  });
}

function getPlugin(cmd) {
  const clean = (cmd || '').toLowerCase();
  return commands.get(clean) || commands.get(aliasMap.get(clean)) || null;
}

// Exécute la commande si un plugin correspond. Renvoie true si géré (même en cas de
// refus owner/groupe), false si aucun plugin ne correspond à `cmd` — dans ce cas
// handler.js doit continuer vers son switch/case existant.
async function dispatch(cmd, ctx) {
  const plugin = getPlugin(cmd);
  if (!plugin) return false;

  if (plugin.ownerOnly && !ctx.isOwner) {
    await ctx.sock.sendMessage(ctx.from, { text: '• Commande réservée au propriétaire du bot.' });
    return true;
  }
  if (plugin.groupOnly && !ctx.isGroup) {
    await ctx.sock.sendMessage(ctx.from, { text: '• Cette commande fonctionne seulement dans un groupe.' });
    return true;
  }

  try {
    await plugin.handler(ctx);
  } catch (err) {
    console.error(`[plugins] Erreur dans la commande .${cmd} :`, err);
    await ctx.sock.sendMessage(ctx.from, { text: `• Une erreur est survenue avec .${cmd}.` });
  }
  return true;
}

function list() {
  return Array.from(commands.values());
}

// Top-level await : tout module qui fait `import pluginLoader from './pluginLoader.js'`
// attendra automatiquement que ce chargement initial soit terminé avant de continuer.
await loadAll();

export { dispatch, getPlugin, list, loadAll, watch };
