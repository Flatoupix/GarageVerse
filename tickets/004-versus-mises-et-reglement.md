# T-004 · Versus V1 : mises en crédits et règlement idempotent

- **Priorité :** P1
- **Statut :** Implémenté (migrations `20261118000000_versus_v1.sql` à `20261118020000_versus_secret_seed.sql`, fonctions `create-room`, `join-room`, `submit-move`, `resolve-due`, `claim-settlement`, client `src/game/versus.ts`) ; **mode en pause depuis la v0.13.1** (`VERSUS_OPEN = false` dans `src/game/features.ts`) ; validation sur deux téléphones avant réouverture
- **Sources :** [docs/versus.md](../docs/versus.md) §5

**Objectif.** Gérer une mise en crédits **fictifs du jeu**, conservée dans les sauvegardes locales, avec règlement serveur unique pour deux joueurs amis.

**À faire**
- Débiter les mises des deux joueurs au moment de l'acceptation et mémoriser un identifiant de salle en attente.
- Enregistrer le résultat et les montants côté serveur ; réclamer le règlement via `claim-settlement`.
- Empêcher tout double versement après reconnexion, rechargement ou requêtes concurrentes.
- Rembourser une salle expirée sans course, rendre les mises en cas d'égalité, gérer abandon et commission selon les arbitrages de T-001.
- Respecter la limite annoncée : le serveur ne garantit pas la sincérité d'une sauvegarde locale.
- Désactiver le bonus caché « 14 appuis = 1 000 crédits » lorsqu'un compte Versus existe, comme prévu dans la spécification, après validation.

**Critères de validation**
- [ ] Ni perte ni duplication de crédits en cas de retry.
- [ ] État des mises cohérent après rechargement ou déconnexion.
- [ ] Tests d'égalité, expiration, forfait et règlement réclamé deux fois.
