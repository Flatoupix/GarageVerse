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

## État du plan validé avec le joueur (15 novembre, soir)

Dernier commit publié : `d5dd0be` sur `prototype/mobile-tcg`. Fait et publié :

1. **Correctifs rapides** : recyclage confirmé puis annulable 6 s (refusé si les crédits sont dépensés), boutons grisés avec la raison chiffrée, badge « Nouveau », réglage « aide en touchant les mots soulignés » (désactivé pour une partie neuve).
2. **Garage** : un appui ouvre la carte ; zoom et déplacement **au geste seulement** (le joueur a refusé les boutons de zoom) avec l’inclinaison holo conservée ; couleurs de rareté ; puces de rareté et de tri.
3. **Légendaires en image fixe** : l’animation de carte est abandonnée. Onze en Synthwave stylisé (`LEGEND_STYLE` dans `pipeline/art.mjs`), Jeep, Interceptor et 1000tipla gardent leur style propre. Les calques animés ne servent plus qu’à la mini-course. Les ~31 règles CSS `.pixel-scene`/`.scene-*` de chaque feuille sont devenues inutiles (nettoyage à faire).
4. **Thèmes** : les 8 sont gardés et rangés en trois groupes (Ambiances, Univers, À gagner). Le thème par défaut reste Synthwave (Galaad ne l’aime pas : le choix au premier lancement n’a pas été décidé).
5. **Éditions** : débloquer une édition coûte les crédits (40/75/120/200) **et 2 doublons**, pour toutes les éditions ; Solarpunk et Abandonnée sont **à l’essai sur 5 cartes** (Clio III, 205 GTI, Supra, MX-5 NB, F40). À étendre aux autres cartes seulement si le joueur valide l’essai (~200 images).

**Prochain : séries spéciales de courses.** 4 séries, une par secteur (départ/accélération, virage/maniabilité, ligne droite/vitesse, endurance), plusieurs paliers de difficulté et gains croissants ; passer `balance.mjs` pour l’inflation de crédits. Puis **exhibition** : concours à critères tournants (juges qui aiment le rétro, le tuning, la rareté…) pour qu’une Fiat 500 puisse battre une Mazda tunée selon le concours. À spécifier avec le joueur avant de coder.

## À voir plus tard (rien à faire sans l’accord du joueur)

- **Démontage de voiture** à l’atelier, pour récupérer des pièces. Mis de côté : le joueur veut en reparler. Pas de kits d’amélioration.
- **Mode multijoueur** (le site est statique sur GitHub Pages, sans serveur : duels asynchrones plus simples que le temps réel).
- **Version Android**, avec son écran de lancement de studio « Crazy Popping Cats » (fait sous Construct, fichiers à récupérer sur son PC). Une publication sur le Play Store rouvre la question des marques et des voitures de films : prévoir un nom générique par voiture et une version sans marques, séparée et sans code secret.
- **Étendre Solarpunk et Abandonnée** aux autres cartes, et éventuellement d’autres styles.
- **Choix du thème au premier lancement** pour un joueur neuf.
- **Nettoyage du CSS de scène** devenu inutilisé.

**Version** : le jeu est en 0.3.0 (`package.json`, affichée dans les Réglages). À chaque publication, changer la version et ajouter une entrée en tête de `CHANGELOG.md` (voir `docs/meta.md`, « Version et notes de version »).

**Règle apprise** : ne jamais ajouter de bouton ou de contrôle que le joueur n’a pas demandé (voir les boutons de zoom retirés).

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
