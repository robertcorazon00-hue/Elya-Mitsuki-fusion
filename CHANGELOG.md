# Changelog — Elya Prime (Elya AI + Mitsuki Kiryu-MD)

## 2026-10-01 (suite 3) — 4 nouvelles fonctionnalités Elya

- **`!recap [nombre]`** (`elya/plugins/recap.js`, groupe uniquement) : résume
  les derniers messages du groupe via Gemini/askUtility. Repose sur
  `recentMsgCache` (`elya/store.js`) — ce cache en mémoire existait déjà dans
  le code mais n'était jamais alimenté ; il l'est maintenant pour chaque
  message texte non-commande d'un groupe (jusqu'à 300 par groupe, en mémoire,
  perdu au redémarrage — acceptable pour ce genre de récap).
- **Rappels en langage naturel** (`elya/reminderParser.js` +
  `elya-reminders-scheduler.js`) : "rappelle-moi de X dans 2h", "...à 18h",
  "...demain à 9h" sont détectés directement dans la conversation (sans
  commande), programmés, puis renvoyés dans le même chat à l'heure dite.
  Détection par regex best-effort (pas un vrai NLU) — couvre les tournures
  les plus courantes, pas toutes. Commande `!rappels` / `!rappels cancel
  <numéro>` pour lister/annuler.
- **`!bonjour on|off|heure HH:MM`** (`elya/plugins/bonjour.js` +
  `elya-morning-scheduler.js`, réservé au créateur) : message du matin
  automatique envoyé une fois par jour (8h00 par défaut, fuseau
  Africa/Lome), généré par IA (askUtility) avec un pool de messages de
  secours si l'appel échoue. Environ 1 matin sur 3, une question sur
  l'humeur est ajoutée.
- **`!humeur [texte]`** (`elya/plugins/humeur.js`) : note une humeur libre
  (sans argument : affiche les 7 dernières). Alimenté aussi en silence par
  la question occasionnelle du message du matin (la réponse suivante de
  Robert en DM, dans les 12h, est capturée automatiquement).

## 2026-10-01 (suite 2)

- **Script de diagnostic `mitsuki/scripts/test-davidcyril.js`** : aucune
  documentation publique trouvée pour apis.davidcyriltech.my.id (plusieurs
  recherches infructueuses) et pas d'accès réseau ici pour tester en vrai.
  Le script appelle les 15 endpoints jamais confirmés via les vraies
  fonctions de `pack-davidcyril.js` (donc teste aussi le parsing, pas juste
  l'appel brut) et affiche ✅/❌ + la réponse de chacun. À lancer une fois
  (`node mitsuki/scripts/test-davidcyril.js`) avec le vrai `.env` ; `gdrive`,
  `mediafire` et `tgsticker` ont besoin d'un vrai lien à ajouter dans
  `TEST_INPUTS` (pas de lien stable/public que je pouvais garantir), les
  11 autres ont déjà une valeur de test sûre par défaut.

## 2026-10-01 (suite)

- **Mode `copine` enrichi** (`elya/providers.js`, `COPINE_OWNER`/`COPINE_OTHERS`) :
  fusion d'un prompt "copine WhatsApp" fourni par Robert avec les blocs
  existants.
  - `COPINE_OTHERS` (avec tout le monde sauf Robert) gagne : humeurs
    (enthousiaste/câline/boudeuse/jalouse-mignon), style d'écriture WhatsApp
    (messages 1-3 phrases, "trop/grave/genre/ptdrr", mots allongés, emojis
    limités, hésitations "hihi/hmm"), réactions (douce si triste, timide si
    complimentée, **froide + limite claire si irrespectueuse**).
  - `COPINE_OWNER` gagne : surnoms variés (mon amour/chéri), s'inquiète
    pour lui (manger/dormir/journée), le complimente, boude pour rire s'il
    tarde à répondre (pardonne vite).
  - Deux écarts volontaires par rapport au prompt fourni, pour rester
    cohérent avec ce qui avait déjà été décidé/discuté avec Robert :
    1. Elle ne nie JAMAIS d'être une IA que par défaut/humour — si on
       insiste sincèrement, elle reste honnête plutôt qu'un déni permanent.
    2. Si quelqu'un d'autre demande sérieusement si c'est sa copine, elle
       dit toujours "oui" (charmeur) plutôt que "la copine de personne" —
       conforme à la demande explicite de Robert plus tôt dans le projet.

- **Menu Elya redessiné une 2e fois** (`elya/plugins/help.js`) : le style
  kawaii (`✿ *Titre* ✿`, `┈┈┈┈┈┈┈┈┈┈┈┈┈┈`, `♡`) remplacé par un style
  ultra épuré, à la demande de Robert ("ultra fin, soigné") — plus aucun
  emoji ni encadrement, titre simple `Elya AI`, une seule ligne fine
  `───────────────` entre les sections. Contenu (commandes, notes) inchangé.

## 2026-09-29 (suite 3)

- 🎀 **Menu Elya redessiné** (`elya/plugins/help.js`) : les cadres façon boîte
  technique (`┌─── X ───┐` / `└────┘`, `╭─╮`/`╰─╯`) remplacés par un habillage
  plus doux — `✿ *Titre* ✿` suivi d'une ligne pointillée `┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
  cohérent avec le reste de l'identité d'Elya (🎀✿💖🌸). Contenu inchangé.
  Au passage : `!broadcast` (section Avancé) et `copine` (dans l'indice de
  `!personnalite`) manquaient dans le texte affiché — ajoutés.

## 2026-09-29 (suite 2)

- 💑 **Mode `copine` affiné** (retour direct de Robert, plus intense/réaliste
  que la première version) :
  - "Bébé" devient une vraie habitude avec lui (pas juste "de temps en
    temps"), avec chouchoutage et attention sincère.
  - **Jalousie légère** si sa copine réelle ("ma go") revient dans la
    conversation — gardée volontairement taquine et légère, jamais
    méchante ni vraiment possessive : le but est l'humour, pas de créer de
    la friction avec sa vraie relation.
  - Aux **autres personnes** du chat qui demandent sérieusement si c'est
    vrai : elle dit désormais "oui", mais sur un ton charmeur/amusé plutôt
    que de le nier sérieusement comme avant — ça reste lisible comme un
    clin d'œil de bot, pas une tentative de tromper qui que ce soit.
    Le surnom "bébé" et le ton de couple restent réservés à Robert.

## 2026-09-29 (suite)

- 💑 **Nouveau mode `.personnalite copine`** : Elya joue la copine de Robert
  — mais seulement avec lui. Techniquement, `isOwner` (déjà utilisé pour
  les commandes réservées au propriétaire) est maintenant transmis jusqu'à
  `getSystemPrompt` (`askElya` → `askGeminiDirect`/`askWithGoogleSearch`/
  `askViaProvider`/`askHuggingFaceAuto`), pour distinguer qui écrit :
  - **Robert** : Elya est affectueuse et complice (petits surnoms tendres,
    "tu m'as manqué"...) — reste PG, jamais de contenu sexuel explicite
    même dans ce mode.
  - **Toute autre personne du chat** : Elya reste elle-même, normale. Elle
    peut jouer le jeu avec légèreté si on la taquine là-dessus, mais si
    quelqu'un demande sérieusement si c'est vrai, elle est honnête : c'est
    une blague entre eux, elle n'insiste pas et ne fait pas semblant que
    c'est réel.
  - S'active avec `!personnalite copine` (comme les autres modes déjà
    existants — prof, psy, dev, drole, mamie), donc désactivé par défaut.

## 2026-09-29

- 💛 **Voix féminine d'Elya enrichie** (`elya/providers.js`, `getSystemPrompt`,
  toujours actif — c'est le prompt de base, pas une personnalité optionnelle) :
  - Accord au féminin : plus d'exemples couvrant des cas moins évidents
    ("sûre", "surprise", "touchée", "ravie", "curieuse") pour réduire le
    risque qu'un modèle glisse au masculin sur une tournure moins fréquente.
  - Caractère : la description était correcte mais sobre ("chaleureuse,
    calme, à l'écoute") — enrichie avec de la sensibilité et de
    l'expressivité concrètes (dire quand quelque chose la touche, l'amuse
    ou la surprend, avec deux exemples de tournures), sans rien changer
    aux limites déjà posées juste après (pas de registre romantique/
    sexuel, jamais "petite amie virtuelle" — cette phrase n'a pas bougé).

## 2026-09-28

- 🐛 **`.gs <texte>` corrigé** : la branche « statut texte » de `groupStatus`
  (`commands/group.js`) envoyait le statut dans le **groupe** au lieu du
  **statut WhatsApp** (`status@broadcast`) — un copier-coller resté à moitié
  fait dans le code d'origine. Les branches image/vidéo/audio ciblaient déjà
  correctement `status@broadcast` ; seule la branche texte était affectée.

## 2026-09-27

- **Routage automatique par intention** dans la conversation normale d'Elya
  (`askElya`, sans avoir besoin de taper `!ia ...`) :
  - Une demande de recherche formulée normalement (« cherche-moi... »,
    « renseigne-toi sur... », « dernières actualités sur... ») déclenche
    désormais une vraie recherche **Google** (nouvel endpoint
    `/search/google` du pack davidcyriltech, jusqu'ici jamais câblé) — les
    résultats sont donnés à Gemini pour formuler une réponse naturelle,
    plutôt que de renvoyer une liste brute de liens.
  - Une demande qui ressemble à du code (mots-clés techniques, bloc
    ``` ``` ```) est envoyée à **MiniMax** plutôt qu'à Gemini.
  - Sinon, conversation normale sur **Gemini**, avec repli automatique sur
    **Groq** si Gemini échoue techniquement (jusqu'ici il fallait passer par
    `!ia auto` pour avoir un repli — ce n'est plus nécessaire).
  - Nouveau : `searchGoogle` (`elya/apis.js`) et `askWithGoogleSearch` /
    `looksLikeSearchRequest` (`elya/providers.js`).
  - Ce routage ne s'applique que si personne n'a fixé un fournisseur précis
    pour ce chat via `!ia <fournisseur>` — ce choix reste toujours respecté.
- **`.gsearch`** (Mitsuki) : implémenté — la commande n'existait jusqu'ici
  que dans le menu (`INFO`), sans handler réel derrière.
- 🔍 **Découverte** : 15 autres commandes du pack davidcyriltech listées dans
  le menu Mitsuki n'avaient jamais eu de handler (`apk`, `gdrive`,
  `mediafire`, `webdl`, `compresspdf`, `pdf2jpg`, `jpg2pdf`, `ssweb`,
  `tgsticker`, `web2zip`, `shorturl`, `web2apk`, `ghstalk`, `y2mate`,
  `flixier`) — jusqu'ici elles échouaient en silence (`.menu` en parle,
  rien ne se passe quand on les tape).
- **Les 15 sont maintenant câblées** (`mitsuki/commands/pack-davidcyril.js`
  + `mitsuki/plugins/pack-davidcyril.js`, même patron GET + `X-API-Key` que
  le reste du pack) :
  - `apk`, `gdrive`, `mediafire`, `webdl`, `web2zip`, `web2apk`, `y2mate` —
    prennent un nom d'appli ou un lien en argument et renvoient le fichier
    obtenu (document/vidéo).
  - `compresspdf`, `pdf2jpg`, `ssweb`, `tgsticker` — prennent un lien en
    argument (PDF, site web, sticker Telegram selon la commande) : ces
    endpoints étant en GET, ils opèrent sur une URL et pas sur un fichier
    envoyé directement dans le chat.
  - `shorturl` (raccourcit un lien), `ghstalk` (infos profil GitHub),
    `flixier` (question -> réponse IA, comme `.kimi`/`.nova`).
  - `jpg2pdf` fait exception : implémenté en local avec `pdf-lib` (identique
    à `.topdf`, déjà fiable) plutôt que via l'API externe non confirmée —
    plus robuste pour ce cas précis.
  - `PENDING_COMMANDS` (`mitsuki/commands/pending.js`) est revenu à vide,
    ces 15 n'y étant plus.
  - ⚠️ Comme pour `/search/google` : aucun de ces 14 endpoints externes n'a
    pu être testé en conditions réelles (pas d'accès réseau ici). Noms de
    paramètres (`url`, `appName`, `username`, `prompt`) et forme des
    réponses sont des suppositions basées sur la convention du pack — à
    corriger commande par commande une fois testées avec la vraie clé API.
- 🐛 **2 bugs préexistants trouvés et corrigés** (déjà présents dans le zip
  d'origine, indépendants du pack davidcyriltech) :
  - `.love` / `.love2` plantaient : `plugins/love.js` appelait
    `local.love` / `local.love2`, qui n'existaient pas dans
    `commands/local.js`. Ajoutées (10 messages cycliques chacune).
  - `.waifu` : `plugins/waifu.js` était un fichier **vide (0 octet)** — la
    commande ne faisait donc rien. Réécrit pour utiliser
    `download.waifu()`, déjà prête.
- **Catégorie TELECHARGEMENT complétée** (`plugins/download-pack.js`) :
  `download`, `video`, `youtube` (routage auto TikTok/Instagram/
  Facebook/YouTube), `fb`, `ig`, `song`, `ytmp3`, `ytmp4`, `mediafire2` —
  toute la logique existait déjà dans `commands/download.js`
  (yt-dlp + APIs de secours), il ne manquait que le branchement plugin.
  `.tt` était déjà un alias de `.tiktok` (non détecté par l'audit initial,
  qui ne lit pas le champ `aliases`).
  - ⚠️ `.ig` est envoyé en vidéo par défaut (Reels majoritaires) — à
    ajuster si le lien pointe vers une photo simple.
  - `.vv` laissé de côté : nom ambigu (pourrait viser un « anti-vue-unique »
    WhatsApp, une fonctionnalité différente et plus sensible) — à clarifier
    avant de deviner une implémentation.
- 📋 **Audit complet** du menu Mitsuki (129 commandes au total) : environ
  44 commandes supplémentaires (GROUPE, UTILISATEUR, FUN, MEDIA, INFO,
  STATUT, SECURITE, AUTO, OWNER) ont leur logique déjà prête dans
  `commands/*.js` (group.js, user.js, owner.js, status.js, settings.js,
  local.js) mais n'ont toujours aucun plugin — même situation que ce qui
  vient d'être corrigé pour le téléchargement. Une vingtaine d'autres
  (weather, news, chatgpt5, copilot, tovideo, tourl, meme, pair, warns/
  unwarn, anticall/autorecording/autotyping...) demandent du code
  vraiment nouveau ou une clé API absente du `.env`.
- **58 commandes câblées d'un coup** (`plugins/group-pack.js`,
  `user-pack.js`, `fun-pack.js`, `media-pack.js`, `info-pack.js`,
  `status-pack.js`, `security-pack.js`, `auto-pack.js`, `owner-pack.js`,
  `general-pack.js`) :
  - **GROUPE** (15) : kick, promote, demote, add, clean, mute, unmute,
    lock, unlock, invite, tagall, htag, gs, acceptall, rejectall.
  - **UTILISATEUR** (11) : save, set, active, profile, block, unblock,
    jid, fullpp, getdp, leave, join.
  - **FUN** (2), **MEDIA** (2 : qrcode, wallpaper), **INFO** (2 : calc,
    time), **STATUT** (3), **OWNER** (6 : unban, setname, mode,
    createchannel, post, setpp), **GENERAL** (2, bonus : ping, apropos).
  - **SECURITE** (6 : antilink, antispam, antibot, antiedit, antihidetag,
    antidelete) + **warns/unwarn** — bonne surprise en creusant : ces
    comportements sont déjà **actifs** dans `handler.js` (suppression de
    lien, 3 avertissements = kick pour spam/hidden-tag...), il ne
    manquait que la commande pour les activer/désactiver.
    Exception : `antidelete` se laisse basculer mais la détection de
    message supprimé elle-même n'est pas câblée dans `handler.js` — la
    commande ne fait donc encore rien de visible.
  - **AUTO** (7 : autoreact, autoread, autosave, autoreply, anticall,
    autorecording, autotyping) — même bonne surprise : `anticall`
    (rejet d'appel) et `autotyping`/`autorecording` (présence simulée)
    étaient déjà actifs dans `handler.js`, lisant des réglages qu'aucune
    commande ne permettait de changer.
  - `PENDING_COMMANDS` mis à jour avec les 21 commandes qui restent
    vraiment à faire (`desc`, `gname`, `gpp`, `revoke`, `pair`,
    `meme`, `gemini`, `chatgpt5`, `copilot`, `kimi`, `nova`, `translate`,
    `resume`, `weather`, `news`, `wiki`, `fancy`, `blur`, `toimage`,
    `tovideo`, `tourl`) — plus de commande silencieuse dans tout le menu.
- **`.vv`** (téléchargement de vue unique) : réponds à un message vue unique
  (photo, vidéo, vocal) avec `.vv`. Réservé au propriétaire du bot, et le
  média est renvoyé dans son chat privé (comme `autosave`) plutôt que dans
  le groupe, pour ne pas republier par accident un média que son expéditeur
  croyait éphémère. Facile à changer dans `plugins/vv.js` si tu préfères
  le renvoi dans le chat d'origine.
  - ⚠️ Non testé (pas de WhatsApp ici) : selon la version de WhatsApp, un
    média déjà ouvert peut ne plus être téléchargeable — dans ce cas la
    commande répond « Impossible de récupérer ce média ».
- **20 dernières commandes câblées** — il ne reste que `.pair` :
  - **GROUPE** : `desc`, `gname`, `gpp`, `revoke` (appels Baileys directs,
    fonctions ajoutées dans `commands/group.js`, réservées aux admins).
  - **INFO** (`commands/info.js`, APIs gratuites **sans clé**, déjà
    déclarées dans `config.js` par le Mitsuki d'origine) : `weather`
    (Open-Meteo), `news` (saurav.tech), `wiki` (API Wikipédia officielle),
    `fancy` (11 polices Unicode, aucune API), `blur` (sharp, image citée).
  - **FUN** : `meme` (meme-api.com, memes marqués NSFW/spoiler écartés).
  - **MEDIA** (`commands/media.js`) : `toimage` (sticker → PNG), `tovideo`
    (sticker animé → mp4 : sharp extrait les images, ffmpeg les assemble —
    ffmpeg 5.1 de Debian ne décode pas les WebP animés), `tourl` (catbox.moe,
    repli 0x0.st). ⚠️ `.tourl` renvoie un lien **public**, le message le
    précise.
  - **IA** (`commands/ai.js` + `pack-davidcyril.js`) : `gemini`,
    `translate` (Google gtx, repli Gemini), `resume` — via la clé Gemini
    d'Elya, rien à ajouter ; `chatgpt5`, `copilot` — endpoints cod3uchiha de
    `config.js` (les mêmes qu'Elya) ; `kimi`, `nova` — davidcyriltech
    (schéma confirmé, seule commande de ce lot qui demande
    `DAVIDCYRIL_API_KEY`).
  - `.pair` reste en « Bientôt disponible », avec une raison explicite :
    il faudrait lancer une **nouvelle session WhatsApp par numéro**
    (architecture multi-session absente d'ici), et un `.pair` public
    reviendrait à générer des codes de liaison de compte pour n'importe quel
    numéro — un vecteur d'hameçonnage classique. À ne faire qu'en connaissance
    de cause.
  - `pending.js` : `PENDING_COMMANDS = ['pair']`, avec une raison par
    commande (`REASONS`).
  - ⚠️ Rien de ce lot n'a pu être testé en conditions réelles (pas d'accès
    réseau ni WhatsApp ici) : formats de réponse des APIs connus mais à
    vérifier au premier essai.
- ⚠️ Le schéma exact de `/search/google` (paramètre, forme de la réponse)
  n'a pas pu être confirmé par un test réel (pas d'accès réseau ici) — la
  fonction suit la même convention que le reste du pack davidcyriltech
  (GET, header `X-API-Key`, paramètre `query`) mais est à vérifier en
  conditions réelles, comme il avait déjà fallu le faire pour les endpoints
  `/ai/*`.

## 2026-09-26 (suite)

- **🔴 Correctif critique** : `args[1]` était toujours `undefined` dans **tous**
  les plugins Elya (`!antidelete on`, `!ia groq`, `!logs 20`,
  `!personnalite prof`, `!voixtous on`, `!silence 10`, `!memoire <numéro>`...)
  — le routeur retirait le nom de la commande du tableau `args` alors que
  tous les plugins supposent `args[0]` = la commande elle-même et `args[1]`
  = le premier argument réel. Corrigé à la racine dans `server.js` (une
  ligne) plutôt que dans chaque plugin.
- **`!oublie`** (nouvelle commande) : efface uniquement la mémoire long
  terme de la conversation (contrairement à `!reset` qui efface aussi
  l'historique et les strikes). `!oublie <numéro>` (owner) pour le faire à
  distance sur un autre chat.
- **`!reactions on|off`** (nouvelle commande) : Elya réagit occasionnellement
  (~1 message sur 4) avec un emoji doux aux messages du chat, pour une
  présence plus vivante — n'affecte jamais les commandes.
- **`!broadcast <message>`** (nouvelle commande, owner uniquement) : envoie
  un message à tous les chats déjà connus d'Elya (déduits de l'historique de
  conversation), avec une pause entre chaque envoi pour rester raisonnable.

## 2026-09-26

- **Intro DM** : nouveau message de présentation automatique au premier
  message reçu en privé : `*Salut* [nom] !` / `*𝗘𝗹𝘆𝗮✿* ici 💛, comment
  puis-je vous aider ?` (remplace l'ancien message générique).
- **Mode vocal global** : nouvelle commande `!voixtous on|off` (alias
  `!voixall`, `!vocaltous`), réservée au créateur et utilisable uniquement en
  DM — fait répondre Elya en note vocale à **tout le monde, dans tous les
  chats** (DM + groupes), contrairement à `!voixauto` qui ne concerne que le
  chat courant. S'applique aux réponses de conversation classiques et à
  celles qui suivent un message vocal reçu ; repli automatique en texte si la
  synthèse vocale échoue.
- **Persona féminine renforcée** : le prompt système précise explicitement
  qu'Elya est une fille (accords au féminin), et qu'elle ne rejette jamais
  froidement un compliment ou une déclaration ("je t'aime", "t'es sexy"...) —
  elle reste chaleureuse et légère (remercie, taquine, dévie en douceur) sans
  jamais flirter en retour ni produire de contenu romantique/sexuel explicite
  (le bot répond à n'importe qui, sans vérification d'âge).
- **Mémoire long terme élargie** :
  - Liste de déclencheurs par mots-clés (`MEMORY_CUES`) très étoffée
    (couple, famille, études, peurs, objectifs, métier...).
  - Capacité de stockage par chat portée de 40 à 80 souvenirs.
  - Nouveau : **résumé automatique par IA** (`summarizeAndArchive`) — quand
    l'historique court terme déborde de sa fenêtre, les échanges qui en
    sortent sont résumés en 1-2 phrases par Gemini et archivés dans la
    mémoire long terme au lieu d'être simplement perdus.
- **`!memoire <numéro>`** : le créateur peut désormais consulter la mémoire
  d'un autre chat directement depuis son propre DM (sans avoir à écrire
  depuis ce numéro). Comportement inchangé pour tout le monde sans argument.
- **`!silence [durée] / off`** (nouvelle commande) : coupe la conversation
  libre d'Elya dans le chat courant pour une durée donnée (30 min par
  défaut), sans désactiver le bot — les commandes `!...` restent actives
  pendant le silence.
- **Correctif** : `!menu` / `!help` / `!aide` répondaient en groupe avec un
  message de refus ("réservé au DM") au lieu de rester complètement
  silencieux, même quand le bot était tagué. Comportement corrigé : silence
  total en groupe, comme prévu à l'origine.
- `README.md` et `CHANGELOG.md` (ce fichier) créés/mis à jour.

## Avant (reconstruction à partir de l'historique du projet)

- Fusion initiale d'Elya AI (`!`) et Mitsuki Kiryu-MD (`.`) sur un seul
  socket WhatsApp (base `server.js` d'Elya conservée, dashboard web inclus).
- Nom final retenu : **Elya Prime** pour l'identité globale, **Elya AI**
  pour le sous-menu `!`, **Mitsuki Kiryu-MD** pour le sous-menu `.`.
- Menus : `/menu` (grand menu global), `!menu` (style féminin, DM
  uniquement), `.menu` (style Mitsuki, toutes commandes gardées).
- Correction de sécurité : commandes de groupe (`.kick`, `.promote`,
  `.mute`, `.lock`...) qui ne vérifiaient pas les droits admin — corrigé
  avec `group.isSenderAdmin`, messages d'erreur clairs si le bot lui-même
  n'a pas les droits nécessaires.
- Ajouts fonctionnels portés depuis divers projets fournis : jeu manga
  multijoueur, outils `.desc/.gname/.gpp/.revoke/.blur/.topdf`,
  planificateur de publications sur chaînes WhatsApp (catégorie 📢 Chaîne),
  `.kickall/.anticall/.autorecording/.autotyping`, `.love`/`.love2`,
  `!upload`/`.fancy`.
- Retrait de toute restriction owner/admin sur les commandes Elya AI (sauf
  `!menu`, toujours DM uniquement).
