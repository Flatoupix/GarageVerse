# T-002 · Versus V1 : moteur commun de duel déterministe

- **Priorité :** P1
- **Statut :** Spécifié, non réalisé
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
