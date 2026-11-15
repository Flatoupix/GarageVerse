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

## À faire

1. **8 voitures vues de côté manquantes** (`*-car.px.webp` dans `src/assets/pixel/anim/`) : cosworth, m3e30, golf2, celica, mustang67, eleanor, countach, multipla. Relancer `--set anim --kind sprites`.
2. **Contrôler les 94 voitures détourées** (fond magenta retiré, liseré violet résiduel sous la Batmobile, la Zonda et l’Agera) sur des planches, régénérer les ratés, puis **commiter et publier** : ces fichiers sont dans le dossier de travail mais pas encore dans git.
3. **Séries spéciales de courses** (endurance, vitesse, aura…, de plus en plus difficiles) : idée brute du joueur, fiche `orchestrator/backlog/series-speciales.json` marquée « à challenger, ne pas lancer ». En discuter avant toute spécification.
4. **Faire tester Galaad** sur une partie neuve : tutoriel, aide rapide, difficulté et hasard.
5. Idées possibles : rivaux d’Overdrive, test de la déchirure du sachet légendaire à la main (son et effets dorés non vérifiés), liseré violet des voitures.

## Pièges connus

- Les feuilles de thème : les règles propres à un thème vont dans `src/themes/base.css` **et** `src/themes/neon.css` (deux feuilles complètes), les styles communs dans `src/themes/shared.css`.
- Hook GateGuard : le premier Write d’un nouveau fichier est refusé une fois ; exposer les faits demandés puis réessayer.
- Dans les remplacements de texte en Node, la séquence `$` suivie d’un accent grave dans la chaîne de remplacement est interprétée : utiliser une fonction de remplacement.
