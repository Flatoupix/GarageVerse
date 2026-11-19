# T-002 · Versus V1 : moteur commun de duel déterministe

- **Priorité :** P1
- **Statut :** Implémenté (migrations `20261118000000_versus_v1.sql` à `20261118020000_versus_secret_seed.sql`, fonctions `create-room`, `join-room`, `submit-move`, `resolve-due`, `claim-settlement`, client `src/game/versus.ts`) ; **mode en pause depuis la v0.13.1** (`VERSUS_OPEN = false` dans `src/game/features.ts`) ; validation sur deux téléphones avant réouverture
- **Sources :** [docs/versus.md](../docs/versus.md) §4 et §9 ; [docs/meta.md](../docs/meta.md) §5

**Objectif.** Réutiliser exactement les règles du duel existant pour les humains et les rivaux, sans permettre aux deux clients de produire des résultats divergents.

**À faire**
- Introduire `playVersusRound(duel, choiceA, choiceB, rng)` dans `src/game/rules.ts`, sans appel à `aiChoice`.
- Faire reposer `playRound` sur ce moteur partagé.
- Respecter l'ordre de consommation du hasard (joueur A puis joueur B) pour la forme, le secteur parfait et les incidents.
- Vérifier les écuries et préparations soumises : plafond, pièces compatibles et potentiel (`installCheck`, `constraintCheck`).
- Définir la sérialisation du duel que le serveur pourra rejouer.

**Critères de validation**
- [ ] À graine et choix identiques, résultats et événements identiques sur client et serveur.
- [ ] Les courses contre l'IA restent inchangées.
- [ ] Les choix adverses ne sont pas dévoilés avant résolution.
- [ ] Tests reproductibles sur les cinq secteurs et les cas d'incident.
