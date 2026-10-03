# Elya Prime — Elya AI + Mitsuki Kiryu-MD

Bot WhatsApp fusionné (Baileys) : une seule connexion WhatsApp partagée entre
deux identités de commandes qui coexistent sur le même numéro.

- **Elya AI** (préfixe `!`) — l'IA conversationnelle : personnalité douce et
  chaleureuse, mémoire des conversations, multi-fournisseurs IA (Gemini par
  défaut, avec repli automatique), génération d'images, TTS/transcription
  vocale, recherche web, dashboard web de suivi.
- **Mitsuki Kiryu-MD** (préfixe `.`) — le module "commandes bot" classique :
  téléchargements, outils de groupe, jeux, stickers, etc.

`/menu` affiche le grand menu (marqué **Elya Prime**) avec les deux
catégories ; `!menu` et `.menu` affichent chacun leur propre sous-menu.

## Démarrage

```bash
npm install
cp .env.example .env   # si présent — sinon éditer .env directement
npm start
```

Au premier lancement, Baileys demande soit un QR code, soit un code de
jumelage (`USE_PAIRING_CODE=true` + `PAIRING_NUMBER=<numéro avec indicatif>`
dans `.env`) pour connecter le numéro WhatsApp du bot.

Le dashboard web démarre sur `PORT` (par défaut 3000), protégé par
`DASHBOARD_PASSWORD`.

## Structure du projet

```
server.js              Point d'entrée : connexion Baileys, dashboard, boucle
                        de conversation Elya (askElya), routage des messages
elya/                   Tout le module Elya AI
  config.js             Réglages (BOT_NAME, PREFIX, owners...)
  store.js              Tous les stores persistants (JSON par défaut, ou
                         Mongo/Postgres/MySQL si configuré — voir shared/db.js)
  providers.js           Routage vers les fournisseurs IA alternatifs + prompt système
  ai.js                  Client Gemini
  media.js               TTS, transcription, génération PDF
  helpers.js             Jalons, personnalités, dates relatives
  plugins/               Une commande "!..." par fichier (ou un tableau de
                         commandes), chargées automatiquement par pluginLoader.js
mitsuki/                Module Mitsuki Kiryu-MD (préfixe ".")
  handler.js             Point d'entrée des commandes "."
  plugins/, commands/    Commandes Mitsuki
shared/                 Code partagé (persistance db.js, etc.)
data/                   Toutes les données persistées (JSON par défaut)
public/                 Dashboard web (Express + Socket.io)
```

## Ajouter une commande Elay AI (`!...`)

Créer un fichier dans `elya/plugins/`, avec ce format (un objet, ou un
tableau d'objets si plusieurs commandes dans le même fichier) :

```js
export default {
  command: 'exemple',
  aliases: ['ex'],           // optionnel
  category: 'GENERAL',
  description: 'Ce que fait la commande',
  ownerOnly: false,          // réservée au créateur si true
  dmOnly: false,             // fonctionne uniquement en message privé si true
  groupOnly: false,          // fonctionne uniquement en groupe si true
  handler: async (ctx) => {
    // ctx = { sock, msg, chatId, sender, senderName, isGroup, isOwner, cmd, args, text }
    await ctx.sock.sendMessage(ctx.chatId, { text: 'Réponse ici' });
  },
};
```

Le fichier est chargé automatiquement (pas besoin de l'enregistrer ailleurs),
et rechargé à chaud en développement (`pluginLoader.watch()`).

⚠️ Exception : `!menu`/`!help`/`!aide` ne doit **jamais répondre en groupe**,
même tagué — géré manuellement dans `elya/plugins/help.js` (pas via
`dmOnly`, qui répondrait avec un message de refus au lieu de rester
silencieux).

## Mémoire d'Elya

Deux couches, toutes deux persistées sur disque (donc rien n'est perdu au
redémarrage tant que `DATA_DIR` reste sur un disque durable) :

- **Historique court terme** (`historyStore`, `MAX_HISTORY` échanges,
  20 par défaut) — le fil de la conversation en cours, réinjecté dans le
  prompt à chaque message.
- **Mémoire long terme** (`memoryStore`, jusqu'à 80 entrées par chat) —
  alimentée de deux façons :
  1. Détection immédiate par mots-clés (`MEMORY_CUES` dans `server.js`) sur
     chaque message.
  2. Résumé automatique par IA (`summarizeAndArchive`) : quand l'historique
     déborde de sa fenêtre, les échanges qui en sortent sont résumés en 1-2
     phrases par Gemini avant d'être jetés, pour qu'Elya continue de
     "connaître" la personne sans garder tout le texte brut indéfiniment.

Commandes utiles : `!memoire` (ce qu'elle sait sur ce chat), `!memoire
<numéro>` (owner uniquement, consulter un autre chat), `!gouts` (filtre sur
les goûts), `!reset` (efface la conversation en cours).

## Routage automatique par intention (conversation normale)

Sans configuration particulière (`!ia` non utilisé pour ce chat), `askElya`
choisit automatiquement où envoyer chaque message selon ce qu'il détecte :

- **Recherche** (« cherche-moi... », « renseigne-toi sur... », « dernières
  actualités sur... ») → recherche **Google** (`/search/google`, pack
  davidcyriltech), puis Gemini formule une réponse naturelle à partir des
  résultats.
- **Code** (mots-clés techniques, bloc ` ``` `) → **MiniMax**.
- **Sinon** → **Gemini**, avec repli automatique sur **Groq** si Gemini
  échoue.

`!ia <fournisseur>` reste prioritaire : si quelqu'un a fixé un fournisseur
précis pour ce chat, ce routage automatique ne s'applique pas.

## Modes vocaux

- `!voixauto on|off` — réponses en note vocale, dans **ce chat uniquement**.
- `!voixtous on|off` — réservé au créateur, tapé en DM : réponses en note
  vocale pour **tout le monde, partout** (DM + groupes).
- `!tts [fr|en] <texte>` — convertit un texte donné en note vocale, à la
  demande.

## Couper Elya temporairement

- `!silence [durée]` — coupe la conversation libre d'Elya dans **ce chat**
  pour la durée donnée (30 min par défaut ; ex: `!silence 10`, `!silence
  2h`, `!silence off` pour lever). Les commandes `!...` continuent de
  fonctionner pendant le silence.
- `!elyaoff` (en groupe) — Elya ne répond plus que si elle est mentionnée.
- `!lockdown on` — restreint toutes les commandes aux owners (urgence).

## Limites assumées (choix de design)

- Les clés API restent en clair dans `.env` / le code (choix explicite, pas
  un oubli).
- Elya a une personnalité féminine, chaleureuse, qui ne rejette jamais
  froidement un compliment ou une déclaration — mais qui ne flirte jamais en
  retour et ne produit aucun contenu romantique/sexuel explicite, car le bot
  répond à n'importe qui sans vérification d'âge.
