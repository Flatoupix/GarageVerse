# Passation GarageVerse (15 novembre 2026)

Note de reprise pour une nouvelle session. À lire avec `docs/meta.md` (règles du jeu, thèmes, aide, économie) et `orchestrator/README.md`.

## Où en est le projet

- Dépôt public `Flatoupix/GarageVerse`, branche de travail `prototype/mobile-tcg`, site https://flatoupix.github.io/GarageVerse/ (déployé par GitHub Actions à chaque push).
- Dernier commit publié : `f01ff15` (sachets métallisés et légendaires). Projet personnel : pas de rappel sur les droits, pas de diffusion prévue.
- Publié : 8 thèmes (Synthwave par défaut, Rétro pixel, Sobre, Sport auto, Carnet, et trois à débloquer : Borne d’arcade, Console 16 bits, Atelier PC), hasard en course, aide rapide et lexique (« ? »), course miroir, victoire parfaite, booster tactile, éditions choisies au tirage, vente de voitures, tutoriel du mécano, séries de collection, Nuit sans fin, hors-ligne avec export/import de sauvegarde, logo néon et icône, sachets métallisés avec couverture légendaire, mini-course des secteurs.
- Autres contributeurs : le propriétaire pousse aussi sur `prototype/mobile-tcg` (v0.2.0, bande-son), et une session Claude sur le web (branches `ccr-…`). Toujours `git ls-remote --heads origin` avant de pousser.

## Organisation de travail voulue

- **Claude** planifie, vérifie, résout les conflits et publie ; **Codex** code via l’orchestrateur ; **Antigravity** (`agy`) teste les captures comme un joueur débutant et fait la contre-revue du diff. Codex et Antigravity se partagent aussi la génération d’images.
- Commit et push seulement sur demande de l’utilisateur ; il valide avant chaque publication.
- Modèle conseillé : Sonnet pour la surveillance, Opus pour le jugement (revues à arbitrer, blocages).

## Outils et commandes

```sh
export PATH=$HOME/.nvm/versions/node/v22.23.1/bin:$PATH      # Node 22, nécessaire pour l’orchestrateur
node orchestrator/cycle.ts queue <id> [<id>…] --integrate     # lance des étapes de orchestrator/backlog/<id>.json
node orchestrator/cycle.ts queue <id> --integrate --dry-run   # valide sans appeler les agents
corepack yarn build && corepack yarn check:daily && node pipeline/balance.mjs
node pipeline/art.mjs --set anim --kind sprites [--engine codex|agy] [--jobs 3]   # ne génère que ce qui manque
```

- Dossier de travail : `/Users/pierrenowak/Desktop/projets/GarageVerse` (pas un dépôt git). Clone git : `.orchestrator/source`, branche `prototype/mobile-tcg`. Synchronisation par `rsync -ac --delete` avec exclusions (`.git/`, `.orchestrator/`, `node_modules/`, `dist/`, `.yarn/`, `generated_images/`, `.codex-attachments/`, PNG à la racine, logs), puis commit et push depuis le clone.
- Parcours de test navigateur : `npx tsx orchestrator/browser.ts <dist> <dossier> <chemin Chrome> neon '<flow JSON>'` (320 et 390 px).
- L’intégration automatique d’une étape (`--integrate`) est refusée quand le clone a des fichiers non suivis (3 PNG de cartes à la racine et `.codex-attachments/`, qui sont à l’utilisateur) : récupérer alors le commit à la main (`git fetch ../<cycle>/checkout orchestrator/<cycle>:refs/cycle/x`, puis `cherry-pick`).
- Quotas : Codex et Antigravity s’épuisent en cours de lot. Si l’un est à court, relancer la même commande avec l’autre moteur ; le pipeline ne régénère que le manquant. Quota d’image d’Antigravity (`gemini-3.1-flash-image`) : retour annoncé vers 21 h 10 le 15 novembre.

## Plan validé avec le joueur (15 novembre, soir)

Les 102 voitures de côté sont publiées (`b4eb00c`). Liseré magenta nettoyé sauf S15 et Charger (carrosserie violette, laissées telles quelles) ; Zonda : reste du violet entre les montants de l’aileron ; Batmobile, Zonda et Agera ont reçu une seconde passe non commitée. Ordre d’attaque :

1. **Correctifs rapides** : confirmation **et annulation de quelques secondes** du recyclage de doublon (`CarSheet.vue` lignes ~239 et ~320 : l’action est directe, alors que la vente demande déjà confirmation) ; boutons d’amélioration (Stage 1, etc.) **grisés** quand on ne peut pas payer, avec la raison exacte (« il te manque 30 crédits ») ; badge « Nouveau » sur les voitures fraîchement tirées ; réglage « aide en touchant les mots soulignés », désactivé par défaut (le « ? » reste), à signaler dans le tutoriel.
2. **Garage** : un appui sur une voiture ouvre la **carte** (performances dans un onglet ou un bouton), avec **zoom et déplacement** au doigt, l’inclinaison holographique restant active même zoomé ; couleur par **rareté** au lieu du bleu partout ; **tri et filtres** rapides.
3. **Image de l’Agera** à régénérer (la voiture « vole » sur la carte), puis tour des autres cartes douteuses.
4. **Thèmes et plein écran** : trop de thèmes (8) et la plupart sont jugés moches par le joueur, qui garde Synthwave ; Galaad n’aime pas Synthwave. À réduire (garder Synthwave, Rétro pixel, Sobre et au plus un ou deux à débloquer, à choisir sur une planche de captures). Plein écran : inviter à installer le jeu (manifeste `display`) et bouton plein écran là où c’est possible ; iPhone/Safari n’a pas d’API plein écran.
5. **Éditions** : débloquer/changer un style contre **2 doublons + crédits selon la voiture** (aujourd’hui 40/75/120/200 crédits sans doublons). Le « Solarpunk » du joueur est probablement la gouache (à vérifier dans le pipeline) ; « voiture abandonnée » n’existe pas : à **tester sur 5 cartes** avant toute généralisation.
6. **Démontage de voiture** à l’atelier (récupérer des pièces). Pas de kits d’amélioration.
7. **Séries spéciales** : 4 séries, une par secteur (départ/accélération, virage/maniabilité, ligne droite/vitesse, endurance), plusieurs paliers de difficulté et gains croissants ; passer `balance.mjs` pour l’inflation de crédits. Puis **exhibition** : concours à critères tournants (juges qui aiment le rétro, le tuning, la rareté…) pour qu’une Fiat 500 puisse battre une Mazda tunée selon le concours. À spécifier avec le joueur avant de coder.
8. **Plus tard, à cadrer** : **mode multijoueur** ; **version Android** (le joueur veut y mettre son splash screen de studio « Crazy Popping Cats », fait sous Construct, à récupérer sur son PC).

## À faire (reliquat de la session précédente)

1. ~~8 voitures de côté manquantes~~ : faites.
2. ~~Contrôle des détourages~~ : fait, voir ci-dessus.
3. **Séries spéciales de courses** (endurance, vitesse, aura…, de plus en plus difficiles) : idée brute du joueur, fiche `orchestrator/backlog/series-speciales.json` marquée « à challenger, ne pas lancer ». En discuter avant toute spécification.
4. **Faire tester Galaad** sur une partie neuve : tutoriel, aide rapide, difficulté et hasard.
5. Idées possibles : rivaux d’Overdrive, test de la déchirure du sachet légendaire à la main (son et effets dorés non vérifiés), liseré violet des voitures.

## Pièges connus

- Les feuilles de thème : les règles propres à un thème vont dans `src/themes/base.css` **et** `src/themes/neon.css` (deux feuilles complètes), les styles communs dans `src/themes/shared.css`.
- Hook GateGuard : le premier Write d’un nouveau fichier est refusé une fois ; exposer les faits demandés puis réessayer.
- Dans les remplacements de texte en Node, la séquence `$` suivie d’un accent grave dans la chaîne de remplacement est interprétée : utiliser une fonction de remplacement.
