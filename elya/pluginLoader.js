// elya/pluginLoader.js — Système de plugins pour Elya AI (miroir de mitsuki/pluginLoader.js).
//
// N'existait pas dans le zip fourni : les fichiers elya/plugins/*.js exportent déjà
// tous le même format (export default { command, category, handler(ctx) }), exactement
// comme les plugins Mitsuki, mais rien ne les chargeait ni ne les distribuait — c'est
// le rôle de ce fichier, utilisé par server.js pour router les commandes "!".
//
// ctx fourni au handler : { sock, msg, chatId, sender, senderName, isGroup, isOwner,
//                           cmd, args, text }

import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGINS_DIR = path.join(__dirname, 'plugins');

const commands = new Map();
const aliasMap = new Map();

function registerPlugin(plugin, filePath) {
  if (!plugin || !plugin.command || typeof plugin.handler !== 'function') {
    console.warn(`[elya-plugins] Fichier ignoré (format invalide) : ${filePath}`);
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
    console.error(`[elya-plugins] Erreur de chargement ${filePath} :`, err.message);
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
  console.log(`[elya-plugins] ${commands.size} commande(s) chargée(s) depuis elya/plugins (+ ${aliasMap.size} alias)`);
}

function watch() {
  if (!fs.existsSync(PLUGINS_DIR)) return;
  fs.watch(PLUGINS_DIR, (eventType, filename) => {
    if (!filename || !filename.endsWith('.js')) return;
    const filePath = path.join(PLUGINS_DIR, filename);
    if (fs.existsSync(filePath)) {
      loadFile(filePath, { fresh: true }).then((ok) => {
        if (ok) console.log(`[elya-plugins] Rechargé à chaud : ${filename}`);
      });
    }
  });
}

function getPlugin(cmd) {
  const clean = (cmd || '').toLowerCase();
  return commands.get(clean) || commands.get(aliasMap.get(clean)) || null;
}

// Exécute la commande si un plugin correspond. Renvoie true si géré (même en cas de
// refus owner/groupe/dmOnly), false si aucun plugin ne correspond.
async function dispatch(cmd, ctx) {
  const plugin = getPlugin(cmd);
  if (!plugin) return false;

  if (plugin.ownerOnly && !ctx.isOwner) {
    await ctx.sock.sendMessage(ctx.chatId, { text: '💛 Commande réservée au créateur.' });
    return true;
  }
  if (plugin.groupOnly && !ctx.isGroup) {
    await ctx.sock.sendMessage(ctx.chatId, { text: '💛 Cette commande fonctionne seulement dans un groupe.' });
    return true;
  }
  if (plugin.dmOnly && ctx.isGroup) {
    await ctx.sock.sendMessage(ctx.chatId, { text: '💛 Cette commande fonctionne seulement en message privé.' });
    return true;
  }

  try {
    await plugin.handler(ctx);
  } catch (err) {
    console.error(`[elya-plugins] Erreur dans la commande !${cmd} :`, err);
    await ctx.sock.sendMessage(ctx.chatId, { text: `💛 Une erreur est survenue avec !${cmd}.` }).catch(() => {});
  }
  return true;
}

function list() {
  return Array.from(commands.values());
}

await loadAll();

export { dispatch, getPlugin, list, loadAll, watch };
