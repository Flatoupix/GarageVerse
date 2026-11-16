# Passation GarageVerse (16 novembre 2026)

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

## État du chantier (16 novembre 2026)

**Publié** : `prototype/mobile-tcg` est à `012033b`, version **0.3.2** (tags `v0.3.0` à `v0.3.2`, releases GitHub 0.3.0 et 0.3.1).

**Branche locale non publiée `feat/gaming-ui`** (tête `8f88138`, 17 commits d’avance, rien n’est poussé). Demande du joueur, en sept points, dont six sont faits :

1. **Sélection unifiée** (publiée en 0.4.0 puis **annulée** le 16 novembre à la demande du joueur, **à rediscuter avant toute reprise**) : la grille de cartes commune (`CarBrowser`, `CarFilterBar`, tri « Adaptée au circuit ») était jugée illisible et trop serrée dans la préparation d’une course. Le garage a retrouvé sa barre de filtres et la course son ancienne liste « Ton garage » (coût, secteurs avant surchauffe, points estimés). Au passage, « Par ligne » ne propose plus 4, 5 et 6 sur téléphone (une règle CSS les réaffichait alors qu’ils écrasaient les cartes). La 0.4.0 publiée contient encore la sélection unifiée : la prochaine version devra le noter dans `CHANGELOG.md`.
2. **Design « Asphalt 9 »** (fait pour les boutons, les filtres du garage, les spéciales et les rivaux) : composant `GvButton` (variantes, ton, biseau, relief, balayage), cartes anguleuses des spéciales et des rivaux.
3. **Économie** (fait) : `maxParts` 2 par booster, `partChance` 0,15 / 0,18 / 0,22, soit 0,59 / 0,70 / 0,84 pièce par sachet ; récompenses détaillées sur les rivaux, la boutique et la fin de duel.
4. **Réglages en onglets** (fait) : Paramètres, Thèmes (groupes repliables) et Aide ; le bouton « ? » est retiré de l’en-tête et le lexique est dans l’onglet Aide.
5. **Desktop** (fait le 16 novembre, codé directement par Claude à la demande du joueur, non commité) : à partir de 1024 px, onglets dans la barre du haut, action de course collée au bas de la fenêtre, préparation de course en deux colonnes, barre de filtres compacte, voitures du duel centrées. Vérifié à 320, 390, 1024 et 1280 px, huit thèmes pour l’en-tête. Voir `docs/meta.md`, section 7. Reste connu : en Console 16 bits sur téléphone, le curseur « ▶ » de l’onglet actif est accompagné d’un trait qui barre le libellé (défaut ancien, corrigé seulement sur ordinateur).
6. **Personnages** (fait) : six rivaux avec `bio`, `style`, `likes`, `intro`, `win`, `lose`, `perfect` ; carte de personnage sur la préparation, réplique en fin de duel ; la bio n’est pas affichée (trop haute).
7. **Debug** (fait) : 14 appuis sur le logo donnent 1 000 crédits, uniquement avec `import.meta.env.DEV` (absent du build de production).
8. **Courses fluides** (demande ajoutée en cours de route, fait) : l’action principale de chaque étape d’un duel reste collée au-dessus de la barre d’onglets, et le défilement suit l’étape.

**Bilan fait le 16 novembre** : parcours complet Neon Drive (boutique, ouverture, garage, fiche, course jusqu’à l’arrivée, rivaux, boutique, réglages) réussi à 320, 390 et 1280 px, sans erreur ni débordement, captures relues. Remarque non traitée : à 320 px, les boutons de fin de duel (« Rivaux », « Préparer au garage ») restent sous la barre d’onglets et demandent un défilement. **Version 0.4.0** posée (`package.json`, `CHANGELOG.md`). **Reste** : push de `feat/gaming-ui` vers `prototype/mobile-tcg` (toujours `git ls-remote --heads origin` avant), tag `v0.4.0` et release GitHub si le joueur la veut. **Ne rien pousser sans l’accord du joueur.**

**Ce qui a été appris**
- L’outil de test navigateur (`orchestrator/browser.ts`) couvre 320, 390 **et 1280 px** ; la garde du cycle exige 3 contrôles et la revue d’Antigravity doit consulter des captures des trois largeurs. Passer le chemin du build en **absolu** (un chemin avec `..` est refusé).
- Chaque cycle Codex part du clone `.orchestrator/source` : le **recaler** sur la branche locale avant chaque cycle (`git fetch` depuis le dépôt puis `git reset --hard FETCH_HEAD`), sinon le patch part d’une base périmée. Le récupérer ensuite avec `git fetch <cycle>/checkout` et `git cherry-pick`.
- Une fiche de l’orchestrateur ne peut viser que `src/`, `docs/`, `public/`, `README.md` et `index.html` (pas `pipeline/`). Le bac à sable de Codex interdit de lancer un navigateur : le dire dans la fiche et demander le statut « pass ».
- **Toujours regarder les captures soi-même** avant d’intégrer : cela a révélé des défauts que les revues avaient laissés passer (texte illisible sur le bouton « Toutes » à cause d’anciennes règles CSS, mot « Légende » coupé sur desktop, info de surchauffe disparue des tuiles de course).
- Le joueur refuse tout bouton ou contrôle qu’il n’a pas demandé (voir les boutons de zoom retirés). Les captures doivent lui être montrées, pas seulement décrites.
- Un garde-fou de hooks refuse parfois la première écriture d’un fichier ou d’une commande « destructive » (`git reset --hard`) : exposer les faits demandés puis réessayer.

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
