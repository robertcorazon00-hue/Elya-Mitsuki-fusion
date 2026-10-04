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

    const sep = '───────────────';

    const menuHeader = `Elya AI

Voici tout ce que je sais faire, si un jour tu veux aller plus loin que la conversation.
Sinon, parle-moi juste normalement, pas besoin de commande pour ça.`;

    const menuBody = `${sep}

Général

  ${PREFIX}menu
  ${PREFIX}status
  ${PREFIX}reset
  ${PREFIX}ping
  ${PREFIX}apropos — c'est quoi Elya Prime ?

${sep}

Conversation

_Envoie-moi juste une photo ou un PDF (avec ou sans légende), je l'analyse automatiquement — pas besoin de commande._

  ${PREFIX}memoire
  ${PREFIX}gouts
  ${PREFIX}personnalite <prof|psy|dev|drole|mamie|copine>
  ${PREFIX}image <description>
  ${PREFIX}tts [fr|en] <texte>
  ${PREFIX}voixauto on|off — répond en note vocale dans ce chat au lieu du texte
  ${PREFIX}traduction on|off
  ${PREFIX}pdf <texte>
  ${PREFIX}drive
  ${PREFIX}upload <url> — lien temporaire via TmpLink
  ${PREFIX}setavatar — changer ma photo de profil
  ${PREFIX}humeur [texte] — note ou consulte ton humeur du jour
  ${PREFIX}bonjour on|off / heure HH:MM — message du matin automatique
  ${PREFIX}rappels / rappels cancel <numéro> — tes rappels en attente

_Tu peux aussi juste dire "rappelle-moi de ... dans ..." directement, sans commande._

${sep}

Autres IA & outils

  ${PREFIX}ia <gemini|groq|openrouter|gpt5|copilot|glm|huggingface|opus|fable|glm52|deepseek|kimi|qwen>
  ${PREFIX}nanobanana <description>
  ${PREFIX}pinterest <recherche>
  ${PREFIX}dictionnaire <mot>
  ${PREFIX}actu [sujet]
  ${PREFIX}deepseek <question>
  ${PREFIX}code <extrait>
  ${PREFIX}recherche <sujet>
  ${PREFIX}autosearch on|off — recherche web automatique (activée par défaut)
  ${PREFIX}diffusion <description> — génère une image (Stable Diffusion)
  ${PREFIX}writecream <description> — génère une image (Writecream)
  ${PREFIX}ttsg <texte> — voix Google (alternative à ${PREFIX}tts)
  ${PREFIX}kimi <question> — Kimi k2.6 (réponse ponctuelle, sans mémoire)
  ${PREFIX}nova <question> — Nova AI (réponse ponctuelle, sans mémoire)

${sep}

Jeux & fun

  ${PREFIX}pfc <pierre|feuille|ciseaux>
  ${PREFIX}vraifaux (+ ${PREFIX}vrai/${PREFIX}faux)
  ${PREFIX}match @user1 @user2
  ${PREFIX}citation / ${PREFIX}blague / ${PREFIX}insulte [@user]
  ${PREFIX}startup <mots-clés> / ${PREFIX}slogan <sujet>

${sep}

Social & groupe

  ${PREFIX}sondage Question | Opt1 | Opt2
  ${PREFIX}niveau [@user]
  ${PREFIX}recap [nombre] — résume les derniers messages du groupe

${sep}

Modération

  ${PREFIX}regles / ${PREFIX}strikes
  ${PREFIX}elyaon / ${PREFIX}elyaoff
  ${PREFIX}antidelete on|off
  ${PREFIX}presentation on|off
  ${PREFIX}milestones on|off
  ${PREFIX}silence [durée] / off — coupe la conversation ici temporairement (commandes actives)

${sep}

Voix & liens

  ${PREFIX}transcribe on|off
  ${PREFIX}liensdetect on|off
  ${PREFIX}linkdetect on <lien_chaîne> — suivre une chaîne
  ${PREFIX}chaines — lister les chaînes suivies
  ${PREFIX}unfollow <numéro|nom> — se désabonner d'une chaîne
  ${PREFIX}liens [nombre]
  ${PREFIX}liens chaines [nombre]
  ${PREFIX}setlinkgroup

${sep}

Coffre (liens, fichiers, contacts...)

_Types : lien, video, document, image, audio, contact, numero, note, message — insensible aux accents/casse_

  ${PREFIX}add <type> <nom> <contenu> — ex: ${PREFIX}add link 1 https://exemple.com
  ${PREFIX}add image|video|audio|document <nom> — envoie le fichier en légende, ou réponds-y
  ${PREFIX}add message <texte...> (nom) — le nom entre parenthèses, à la fin
  ${PREFIX}give <type> <nom> — renvoie l'élément
  ${PREFIX}delete <type> <nom>
  ${PREFIX}list <type> — voir tous les noms enregistrés pour ce type

${sep}

Avancé

  ${PREFIX}addword <mot>
  ${PREFIX}delword <mot>
  ${PREFIX}iastatus — Teste tous les fournisseurs IA
  ${PREFIX}credits — Suivi d'utilisation IA
  ${PREFIX}backup — Exporter toutes les données
  ${PREFIX}logs [n] — Dernières erreurs
  ${PREFIX}lockdown on|off — Restreindre temporairement les commandes aux owners
  ${PREFIX}send <destinataire> <heure> (<message>) — programmer un envoi (+ ${PREFIX}send list / ${PREFIX}send cancel <numéro>)
  ${PREFIX}broadcast <message> — envoyer un message à tous les chats

${sep}

Chaîne

  ${PREFIX}newsletter — JID d'une chaîne (à taper dans la chaîne)
  ${PREFIX}projet — créer un projet lié à une chaîne
  ${PREFIX}programmer — programmer une publication (texte/image/vidéo)
  ${PREFIX}projets — voir les projets et publications
  ${PREFIX}delprojet <id> [id_post] — supprimer un projet ou une publication
  ${PREFIX}annuler — annuler une configuration en cours

En groupe, je détecte aussi les liens partagés et je les sauvegarde automatiquement.

_Créée avec soin par toi_`;

    await sock.sendMessage(chatId, { text: menuHeader });
    await sock.sendMessage(chatId, { text: menuBody });
  },
};
