# Orchestrateur · configuration GarageVerse

Le moteur vit dans son propre dépôt privé, [Flatoupix/orchestrator](https://github.com/Flatoupix/orchestrator), branché ici en sous-module Git (`orchestrator/engine`) et figé sur une version. Son README décrit le cycle, les modèles, la sécurité et toutes les clés de configuration. Ce dossier ne contient que ce qui est propre à GarageVerse :

| Fichier | Rôle |
| --- | --- |
| `config.json` | Dépôt, branche `dev`, CLI, limites, chaînes de modèles et section `project` (chemins modifiables, commandes, vérifications, consignes) |
| `backlog/<tâche>.json` | Les tâches |
| `scenarios.ts` | Parcours Chrome du jeu : `neon` (boutique, booster, garage, fiche, course jusqu’à l’arrivée, rechargements) et `booster` (ancien prototype, obsolète) |
| `engine/` | Le moteur, en sous-module |

## Installer

```sh
git submodule update --init orchestrator/engine
npm --prefix orchestrator/engine ci
node orchestrator/engine/cycle.ts doctor
```

## Utiliser

Depuis la racine du dépôt :

```sh
node orchestrator/engine/cycle.ts queue <tâche> [<tâche>…] --integrate --dry-run   # valide sans appeler les agents
node orchestrator/engine/cycle.ts queue <tâche> [<tâche>…] --integrate             # lance les cycles
node orchestrator/engine/cycle.ts land                                             # reprend les commits dans dev
```

Ne pas committer sur `dev` pendant qu’une file tourne, et `land` exige un arbre propre. Le push reste manuel.

## Chemins modifiables par une tâche

`src/`, `docs/`, `public/`, `supabase/`, `android/`, `README.md`, `index.html`, `capacitor.config.ts` et `vite.config.ts`. Une tâche qui touche `supabase/` passe en profil `heavy`. `package.json`, `yarn.lock`, `.github/` et `orchestrator/` restent sous contrôle humain : l’implémentation tourne sans réseau, donc sans nouvelle dépendance.

Avec le scénario `neon`, le champ `flow` d’une tâche ajoute ses étapes après le parcours commun ; l’étape `{ "tab": "Course" }` vise la barre d’onglets du jeu (`.tabbar button`).

## Mettre à jour le moteur

```sh
git -C orchestrator/engine fetch --tags
git -C orchestrator/engine checkout v1.1.0
npm --prefix orchestrator/engine ci
git add orchestrator/engine && git commit -m "chore(orchestrator): moteur v1.1.0"
```

Le moteur se modifie dans son propre dépôt, jamais par une tâche de l’orchestrateur.
