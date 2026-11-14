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
```

`run` sélectionne `orchestrator/backlog/booster.json` par défaut. Pour ajouter une tâche, copier ce fichier sous un nouvel identifiant, adapter le brief et renseigner les fichiers ou répertoires modifiables dans `paths`. Les tâches peuvent cibler `src/`, `docs/`, `README.md` et `index.html`. Les scripts d’installation et de test restent sous contrôle humain. Le scénario navigateur fourni est propre au booster. Le mode `--dry-run` valide les entrées et affiche le parcours et ses limites sans appeler les agents, Git ou le navigateur.

`queue` enchaîne les identifiants indiqués, chacun dans sa propre branche à partir de la base configurée. La file s’arrête au premier blocage. Reprendre le cycle concerné, puis relancer les tâches qui restent si nécessaire.

Utiliser **Ctrl+C** pour arrêter proprement. La reprise conserve le nombre d’appels déjà réservés, le temps actif, les rapports, la branche et l’itération. Une étape interrompue peut être rejouée. Si le patch a déjà atteint l’index ou le commit, la reprise vérifie l’arbre Git attendu avant de poursuivre. Une durée ou un budget épuisé arrête le cycle. Pour essayer avec un nouveau budget, ajuster la configuration et démarrer un nouveau cycle.

## Exécution et preuves

| Étape | Résultat |
| --- | --- |
| Claude · plan | Critères observables à partir de la tâche et de la bible |
| Codex · implémentation | Proposition de patch Git ou rapport expliquant que la base suffit |
| Contrôles | Typage et build, puis parcours Chrome avec événements tactiles à 320 et 390 px |
| Antigravity · UX | Revue de captures produites par les contrôles, accessibles via un outil MCP local et limité aux PNG du cycle |
| Claude · revue | Avis à partir du diff, des contrôles et de la revue UX |
| Préparation de PR | Rapport Markdown et patch Git local si des commits sont à soumettre |

Chaque cycle a sa propre copie Git et une branche `orchestrator/<identifiant>`. La base par défaut est `prototype/mobile-tcg`, où l’interaction existe déjà. Le dépôt distant est retiré de la copie après le clonage. Codex travaille en lecture seule et propose un patch structuré. Le script vérifie les chemins et le type de patch, l’applique dans la copie isolée puis crée un commit local. Les outils de Claude sont désactivés pour ces appels. Antigravity reçoit une configuration MCP temporaire propre au dossier de revue. La capacité du modèle à ouvrir les images est vérifiée par les appels effectifs à l’outil, avec une capture inspectée à chaque largeur. Si l’accès est refusé, le cycle indique un blocage.

Le cycle cherche d’abord la branche de base dans la copie locale `.orchestrator/source` ou dans le clone courant, si celui-ci a le bon dépôt d’origine. Il consulte GitHub lorsque la branche locale est absente.

Les tests Chrome utilisent un profil éphémère et un serveur sur la boucle locale. Ils émulent les événements tactiles et les dimensions de l’écran. Le toucher, le son et les vibrations sur téléphone physique nécessitent un essai joueur.

Les journaux consultables sont dans `.orchestrator/<identifiant>/`, ignoré par Git. `state.json` sert de mémoire de travail, `events.ndjson` donne la chronologie, et les dossiers numérotés contiennent rapports, captures, résultats et empreintes de patch. Les traces brutes des fournisseurs restent hors de ces fichiers. La sortie structurée est filtrée avant sauvegarde. Les budgets bornent le temps total, le temps par étape, le nombre d’appels et les trois corrections. Le plafond de jetons s’applique au compteur **rapporté** par les fournisseurs et se vérifie entre appels. Claude reçoit en plus une limite de coût estimé par appel. Les quotas et la facturation restent gérés par chaque fournisseur.

Après validation humaine, reprendre le patch dans un clone de confiance avec `git am /chemin/vers/changes.patch` sur une branche créée à partir du commit de base indiqué dans `pull-request.md`. Le push, l’ouverture de la PR et la fusion sont des actions manuelles. Avec une base déjà conforme, le rapport est le livrable du cycle.

## Vérifications locales

```sh
npm --prefix orchestrator test
corepack yarn build
```

Références des CLI : [Claude Code](https://code.claude.com/docs/en/cli-reference) · [Codex exec](https://developers.openai.com/codex/noninteractive) · [Antigravity headless](https://antigravity.google/docs/cli/headless/) · [MCP Antigravity](https://antigravity.google/docs/mcp?tab=cli)
