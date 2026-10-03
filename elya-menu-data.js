// elya-menu-data.js — Index des commandes Elya (préfixe "!"), utilisé par :
//  - mitsuki/handler.js : pour dire "cette commande est côté Elya, utilise !xxx"
//  - elya/plugins/help.js : pour ".help <commande>" (recherche ciblée)
//
// N'existait pas dans le zip fourni. Reconstruit à partir du contenu réel du menu
// affiché par elya/plugins/help.js — la liste de commandes ci-dessous doit rester
// synchronisée avec ce menu si de nouvelles commandes Elya sont ajoutées.

const SECTIONS = [
  { emoji: '✦', name: 'GENERAL', cmds: ['menu', 'help', 'aide', 'status', 'reset', 'ping', 'apropos'] },
  { emoji: '💌', name: 'CONVERSATION', cmds: ['memoire', 'oublie', 'gouts', 'personnalite', 'image', 'tts', 'ttsg', 'voixauto', 'voixtous', 'traduction', 'pdf', 'drive', 'upload', 'setavatar', 'humeur', 'bonjour', 'rappels'] },
  { emoji: '💎', name: 'AUTRES IA & OUTILS', cmds: ['ia', 'nanobanana', 'pinterest', 'dictionnaire', 'actu', 'deepseek', 'code', 'recherche', 'autosearch', 'diffusion', 'writecream', 'kimi', 'nova'] },
  { emoji: '🎀', name: 'JEUX & FUN', cmds: ['pfc', 'vraifaux', 'vrai', 'faux', 'match', 'citation', 'blague', 'insulte', 'startup', 'slogan'] },
  { emoji: '👑', name: 'SOCIAL & GROUPE', cmds: ['sondage', 'niveau', 'recap'] },
  { emoji: '🦋', name: 'MODERATION', cmds: ['regles', 'strikes', 'elyaon', 'elyaoff', 'antidelete', 'presentation', 'milestones', 'silence', 'reactions'] },
  { emoji: '🎧', name: 'VOIX & LIENS', cmds: ['transcribe', 'liensdetect', 'linkdetect', 'chaines', 'unfollow', 'liens', 'setlinkgroup'] },
  { emoji: '📦', name: 'COFFRE', cmds: ['add', 'give', 'delete', 'list'] },
  { emoji: '🔮', name: 'AVANCE', cmds: ['addword', 'delword', 'iastatus', 'credits', 'backup', 'logs', 'lockdown', 'send', 'broadcast'] },
  { emoji: '📢', name: 'CHAINE', cmds: ['newsletter', 'projet', 'programmer', 'projets', 'delprojet', 'annuler'] },
];

// Cherche une commande Elya dans l'index ci-dessus, retourne sa section si trouvée.
export function findElyaCommand(cmd) {
  const clean = (cmd || '').toLowerCase().replace(/^!/, '');
  for (const section of SECTIONS) {
    if (section.cmds.includes(clean)) {
      return { name: clean, section: section.name, emoji: section.emoji };
    }
  }
  return null;
}

export { SECTIONS as ELYA_SECTIONS };
