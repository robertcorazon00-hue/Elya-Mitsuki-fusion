import { PREFIX } from '../config.js';
import { findElyaCommand } from '../../elya-menu-data.js';

export default {
  command: 'help',
  aliases: ['aide', 'menu'],
  category: 'GENERAL',
  description: 'Affiche l\'aide ou le menu complet des commandes (DM uniquement, silencieux en groupe)',
  handler: async ({ sock, chatId, cmd, args, isGroup }) => {
    // Jamais de réponse en groupe (même tagué) — même pas un message de refus.
    if (isGroup) return;

    // Seul ".help <commande>" fait une recherche ciblée — ".aide x" / ".menu x" affichent le menu complet, comme avant.
    if (cmd === 'help' && args[1]) {
      const found = findElyaCommand(args[1]);
      if (found) {
        await sock.sendMessage(chatId, {
          text: `${found.emoji} ${PREFIX}${found.name}\nCatégorie : ${found.section}\n\nTape ${PREFIX}menu pour voir le détail des autres commandes de cette catégorie.`,
        });
      } else {
        await sock.sendMessage(chatId, { text: `• Commande "${args[1]}" introuvable. Tape ${PREFIX}menu pour voir la liste complète.` });
      }
      return;
    }

    const sep = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

    const menuHeader = `💜 *ELYA PRIME* 💜
_Ton assistante virtuelle, toujours avec toi_ 💛

Coucou, mon étoile ! 💕 Voici tout ce que je sais faire, si un jour tu veux aller plus loin que la conversation.
Sinon, parle-moi juste normalement — pas besoin de commande pour ça.`;

    const menuBody = `${sep}
👑 *GÉNÉRAL*
${sep}

  ${PREFIX}menu
  ${PREFIX}status
  ${PREFIX}reset
  ${PREFIX}ping
  ${PREFIX}apropos — c'est quoi Elya Prime ?

${sep}
💬 *CONVERSATION*
${sep}

_Envoie-moi juste une photo, une vidéo ou un PDF (avec ou sans légende), je l'analyse automatiquement — pas besoin de commande._

  ${PREFIX}memoire
  ${PREFIX}gouts
  ${PREFIX}personnalite <prof|psy|dev|drole|mamie|copine>
  ${PREFIX}humeur [texte] — note ou consulte ton humeur du jour
  ${PREFIX}bonjour on|off / heure HH:MM — message du matin automatique
  ${PREFIX}rappels / rappels cancel <numéro>
  ${PREFIX}traduction on|off
  ${PREFIX}silence [durée|illimite] / off — coupe la conversation ici (commandes actives)
  ${PREFIX}silencetout [durée|illimite] / off — coupe la conversation partout (owners)

_Tu peux aussi juste dire "rappelle-moi de ... dans ..." directement, sans commande._

${sep}
🎨 *CRÉATIVITÉ*
${sep}

  ${PREFIX}image <description>
  ${PREFIX}diffusion <description> — Stable Diffusion
  ${PREFIX}writecream <description>
  ${PREFIX}nanobanana <description>
  ${PREFIX}quotecard — carte de citation (réponds à un message)
  ${PREFIX}pdf <texte>
  ${PREFIX}tts [fr|en] <texte> / ${PREFIX}ttsg <texte> — voix Google
  ${PREFIX}voixauto on|off — répond en note vocale dans ce chat
  ${PREFIX}drive
  ${PREFIX}upload <url> — lien temporaire via TmpLink
  ${PREFIX}setavatar — changer ma photo de profil
  ${PREFIX}pinterest <recherche>

${sep}
🧠 *IA & OUTILS*
${sep}

  ${PREFIX}ia <gemini|groq|openrouter|ashna|gpt5|copilot|glm|huggingface|opus|fable|glm52|deepseek|kimi|qwen|...>
  ${PREFIX}deepseek <question>
  ${PREFIX}kimi <question> — Kimi k2.6 (réponse ponctuelle)
  ${PREFIX}nova <question> — Nova AI (réponse ponctuelle)
  ${PREFIX}code <extrait>
  ${PREFIX}recherche <sujet>
  ${PREFIX}autosearch on|off — recherche web auto (activée par défaut)
  ${PREFIX}actu [sujet]
  ${PREFIX}dictionnaire <mot>

${sep}
🎮 *FUN & COMPAGNIE*
${sep}

  ${PREFIX}pfc <pierre|feuille|ciseaux>
  ${PREFIX}vraifaux (+ ${PREFIX}vrai/${PREFIX}faux)
  ${PREFIX}match @user1 @user2
  ${PREFIX}citation / ${PREFIX}blague / ${PREFIX}insulte [@user]
  ${PREFIX}startup <mots-clés> / ${PREFIX}slogan <sujet>

${sep}
👥 *VIE DE GROUPE*
${sep}

  ${PREFIX}sondage Question | Opt1 | Opt2
  ${PREFIX}niveau [@user]
  ${PREFIX}recap [nombre] — résume les derniers messages
  ${PREFIX}regles / ${PREFIX}strikes
  ${PREFIX}elyaon / ${PREFIX}elyaoff — Elya répond à tout, ou juste si mentionnée
  ${PREFIX}antidelete on|off
  ${PREFIX}presentation on|off
  ${PREFIX}milestones on|off
  ${PREFIX}transcribe on|off
  ${PREFIX}liensdetect on|off

${sep}
🎁 *COFFRE PRIVÉ*
${sep}

_Types : lien, video, document, image, audio, contact, numero, note, message_

  ${PREFIX}add <type> <nom> <contenu>
  ${PREFIX}give <type> <nom> — renvoie l'élément
  ${PREFIX}delete <type> <nom>
  ${PREFIX}list <type> — voir tous les éléments
  ${PREFIX}liens [nombre] / ${PREFIX}liens chaines [nombre]
  ${PREFIX}chaines — chaînes suivies
  ${PREFIX}unfollow <numéro|nom>
  ${PREFIX}linkdetect on <lien_chaîne>
  ${PREFIX}setlinkgroup

${sep}
👑 *MES POUVOIRS*
${sep}

  ${PREFIX}iastatus — teste tous les fournisseurs IA
  ${PREFIX}credits — suivi d'utilisation IA
  ${PREFIX}backup — exporter toutes les données
  ${PREFIX}logs [n] — dernières erreurs
  ${PREFIX}lockdown on|off — restreindre aux owners
  ${PREFIX}send <destinataire> <heure> (<message>) — programmer un envoi
  ${PREFIX}broadcast <message> — envoyer à tous les chats
  ${PREFIX}addword <mot> / ${PREFIX}delword <mot>

${sep}
📣 *MON UNIVERS CHAÎNE*
${sep}

  ${PREFIX}newsletter — JID d'une chaîne
  ${PREFIX}projet — créer un projet lié à une chaîne
  ${PREFIX}programmer — programmer une publication
  ${PREFIX}projets — voir projets et publications
  ${PREFIX}delprojet <id> [id_post]
  ${PREFIX}annuler — annuler une configuration en cours

En groupe, je détecte aussi les liens partagés et je les sauvegarde automatiquement.

💜 _Elya Prime — plus qu'un bot... une présence_ 💜`;

    await sock.sendMessage(chatId, { text: menuHeader });
    await sock.sendMessage(chatId, { text: menuBody });
  },
};
