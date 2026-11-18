# Orchestrateur local GarageVerse

Le cycle s’exécute sur macOS avec les sessions existantes de Claude Code, Codex et Antigravity CLI. Il est indépendant du serveur du jeu.

## Installation

Prérequis : Node.js 22.18 ou plus récent, npm, Corepack, Git avec accès au dépôt privé et Google Chrome. Vérifier que `claude`, `codex` et `agy` sont accessibles depuis le terminal qui exécutera le cycle.

```sh
npm --prefix orchestrator ci
node orchestrator/cycle.ts doctor
node orchestrator/cycle.ts run booster --dry-run
```

`doctor` contrôle les versions et les sessions visibles par ce terminal. Si Claude Code indique une session indisponible, vérifier `claude auth status` dans ce même terminal et, si nécessaire, se connecter avec `claude auth login`. Pour Codex, vérifier `codex login status`. Pour Antigravity, ouvrir `agy` une fois dans le terminal si la session le demande. Le catalogue de modèles est un contrôle de disponibilité. Le premier appel réel confirme l’accès au modèle et aux outils.

L’orchestrateur hérite des chemins de configuration des CLI et de leur environnement minimal. Une session qui dépend d’un réglage d’environnement absent du terminal peut donc apparaître indisponible. Les variables de clés API ne sont pas transmises. L’accès Git doit fonctionner avec le gestionnaire d’identifiants du Mac ou avec l’assistant Git configuré par GitHub CLI.

## Lancer, arrêter et reprendre

```sh
node orchestrator/cycle.ts run booster
node orchestrator/cycle.ts queue booster autre-tache --dry-run
node orchestrator/cycle.ts status <identifiant>
node orchestrator/cycle.ts resume <identifiant>
node orchestrator/cycle.ts integrate <identifiant>
node orchestrator/cycle.ts land
```

`integrate` empile les commits d’un cycle terminé sur un **tronc d’intégration** : une référence cachée du dépôt (`refs/orchestrator/<base>`) qui ne touche ni votre branche de base, ni votre dossier de travail, et ne demande aucun clone supplémentaire. `land` reprend ensuite ces commits dans la branche de base (il faut être sur cette branche, avec un arbre propre ; avance rapide, ou reprise commit par commit si la branche a avancé) puis supprime le tronc. Le push reste manuel. Si Codex atteint son quota ou perd sa session pendant l’implémentation, Claude prend le relais dans la même copie de travail.

`run` sélectionne `orchestrator/backlog/booster.json` par défaut. Pour ajouter une tâche, copier `backlog/defi-du-jour.json` sous un nouvel identifiant, adapter le brief et renseigner les fichiers ou répertoires modifiables dans `paths`. Les tâches peuvent cibler `src/`, `docs/`, `public/`, `supabase/`, `README.md` et `index.html`. Les scripts d’installation et de test restent sous contrôle humain.

Le champ `browser` choisit le scénario Chrome : `neon` rejoue le parcours complet de la version Neon Drive (boutique, ouverture, garage, fiche, course jusqu’à l’arrivée, rechargements), `booster` est le scénario de l’ancien prototype. Avec `neon`, le champ facultatif `flow` ajoute des étapes propres à la tâche, jouées après le parcours commun : `{ "reset": true }` (sauvegarde neuve), `{ "tab": "Accueil" }`, `{ "tap": "nom accessible du bouton" }`, `{ "expect": "texte visible" }` et `{ "capture": "nom" }`. Les exigences de la tâche doivent donc fixer les libellés que ces étapes utilisent. Les captures ainsi produites sont celles que relit Antigravity. Le mode `--dry-run` valide les entrées et affiche le parcours et ses limites sans appeler les agents, Git ou le navigateur.

`queue` enchaîne les identifiants indiqués, chacun dans sa propre branche à partir de la base configurée. La file s’arrête au premier blocage. Avec `--integrate`, les commits de chaque cycle validé rejoignent le tronc d’intégration avant le cycle suivant, pour que les tâches s’appuient les unes sur les autres. Reprendre le cycle concerné, puis relancer les tâches qui restent si nécessaire.

Utiliser **Ctrl+C** pour arrêter proprement. La reprise conserve le nombre d’appels déjà réservés, le temps actif, les rapports, la branche et l’itération. Une étape interrompue peut être rejouée. Si le patch a déjà atteint l’index ou le commit, la reprise vérifie l’arbre Git attendu avant de poursuivre. Une durée ou un budget épuisé arrête le cycle. Pour essayer avec un nouveau budget, ajuster la configuration et démarrer un nouveau cycle.

## Exécution et preuves

| Étape | Résultat |
| --- | --- |
| Claude · plan | Critères observables à partir de la tâche et de la bible |
| Codex · implémentation | Modifications dans une copie jetable, relevées en patch Git, ou rapport expliquant que la base suffit |
| Contrôles | Typage et build, puis parcours Chrome avec événements tactiles à 320 et 390 px |
| Antigravity · UX | Revue de captures produites par les contrôles, accessibles via un outil MCP local et limité aux PNG du cycle |
| Antigravity · contre-revue | Second avis sur le diff, par un modèle différent de l’auteur. Consultatif : son absence ne bloque pas le cycle |
| Claude · revue | Avis à partir du diff, des contrôles, de la revue UX et de la contre-revue, dont il vérifie les constats |
| Préparation de PR | Rapport Markdown et patch Git local si des commits sont à soumettre |

## Modèles et relais

La clé `models` de `config.json` donne, pour chaque phase (`plan`, `implement`, `ux`, `critique`, `review`), une chaîne ordonnée de maillons `{ "engine": "claude" | "codex" | "agy", "model": "…" }`. Le premier maillon fait le travail ; s’il est à court de quota, sans session, surchargé, sans le modèle demandé (ou, pour Codex, sans bac à sable), l’appel est rejoué sur le maillon suivant, sur la même étape et dans la même copie de travail. Antigravity expose trois familles de modèles aux quotas distincts (Gemini 4, Gemini 3.8 et Claude) : les chaînes `ux` et `critique` les parcourent toutes avant, pour `ux`, de passer au CLI Claude. `model` absent signifie le modèle par défaut du CLI. Les jetons de tous les essais sont comptés, et le journal indique le maillon de relais. Un échec d’une autre nature (délai, rapport invalide) n’est pas rejoué sur un autre modèle. Sans clé `models`, les chaînes par défaut de `agents.ts` s’appliquent.

Le **profil** de la tâche choisit l’ordre des modèles à l’intérieur de chaque moteur, sans jamais changer l’ordre des moteurs. `heavy` met les modèles les plus forts en premier (Opus, Gemini 4), `light` les plus économes (Sonnet, Gemini 3.8 Flash), `standard` garde l’ordre de la chaîne. Le profil est calculé automatiquement : `light` pour une tâche courte (au plus 2 exigences, 1 chemin, brief de moins de 500 caractères, pas de parcours `flow`), `heavy` au-delà de 6 exigences, 3 chemins, 1 500 caractères de brief, 8 étapes de `flow` ou dès que `supabase/` est touché, `standard` sinon. Une tâche peut l’imposer avec `"profile": "light" | "standard" | "heavy"`, et toute correction après une revue refusée monte en `heavy`. Le journal indique le profil et le premier modèle de chaque étape.

Moteurs permis par phase : `plan` et `review` → `claude` ; `implement` → `codex`, `claude` ; `ux` et `critique` → `agy`, `claude`. `node orchestrator/cycle.ts doctor` affiche les chaînes et vérifie les modèles Antigravity dans son catalogue (`agy models`) ; les modèles Claude et Codex se confirment au premier appel réel. Un cycle garde la chaîne qu’il avait au démarrage : pour appliquer un changement, démarrer un nouveau cycle.

Chaque cycle a sa propre copie Git et une branche `orchestrator/<identifiant>`. La base par défaut est `dev`, la branche du travail en cours (jamais publiée telle quelle). Le dépôt distant est retiré de la copie après le clonage. Codex écrit dans une copie jetable du dépôt, confinée à ce dossier, sans réseau ni destination distante, où il peut vérifier le typage. Le script relève le diff limité aux chemins de la tâche, vérifie les chemins et le type de patch, l’applique dans la copie isolée puis crée un commit local. La copie jetable est ensuite supprimée. Les outils de Claude sont désactivés pour ces appels. Antigravity reçoit une configuration MCP temporaire propre au dossier de revue. La capacité du modèle à ouvrir les images est vérifiée par les appels effectifs à l’outil, avec une capture inspectée à chaque largeur. Si l’accès est refusé, le cycle indique un blocage.

Le cycle lit la branche de base dans le dépôt qui contient l’orchestrateur, s’il a le bon dépôt d’origine ; si des cycles déjà intégrés prolongent cette branche (tronc d’intégration), il part du tronc, donc chaque tâche voit le travail des précédentes. Il consulte GitHub lorsque la branche locale est absente.

Les tests Chrome utilisent un profil éphémère et un serveur sur la boucle locale. Ils émulent les événements tactiles et les dimensions de l’écran. Le toucher, le son et les vibrations sur téléphone physique nécessitent un essai joueur.

Les journaux consultables sont dans `.orchestrator/<identifiant>/`, ignoré par Git. `state.json` sert de mémoire de travail, `events.ndjson` donne la chronologie, et les dossiers numérotés contiennent rapports, captures, résultats et empreintes de patch. Les traces brutes des fournisseurs restent hors de ces fichiers. La sortie structurée est filtrée avant sauvegarde. Les budgets bornent le temps total, le temps par étape, le nombre d’appels et les trois corrections. Le plafond de jetons s’applique au compteur **rapporté** par les fournisseurs et se vérifie entre appels. Claude reçoit en plus une limite de coût estimé par appel. Les quotas et la facturation restent gérés par chaque fournisseur.

Après validation humaine, reprendre le patch dans un clone de confiance avec `git am /chemin/vers/changes.patch` sur une branche créée à partir du commit de base indiqué dans `pull-request.md`. Le push, l’ouverture de la PR et la fusion sont des actions manuelles. Avec une base déjà conforme, le rapport est le livrable du cycle.

## Vérifications locales

```sh
npm --prefix orchestrator test
corepack yarn build
```

Références des CLI : [Claude Code](https://code.claude.com/docs/en/cli-reference) · [Codex exec](https://developers.openai.com/codex/noninteractive) · [Antigravity headless](https://antigravity.google/docs/cli/headless/) · [MCP Antigravity](https://antigravity.google/docs/mcp?tab=cli)
