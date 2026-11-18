# T-008 · Échanges de voitures et de crédits entre amis (indépendant du Versus)

- **Priorité :** P2, **à livrer avant le Versus**
- **Statut :** Spécifié ; à valider avant implémentation
- **Décision :** 18 novembre 2026, les échanges sont **dissociés du Versus**. Ils ne dépendent plus ni des salles ni des mises : seulement du compte anonyme et du code ami déjà posés par le Versus V1 (`gv_players`, fonction `register`).
- **Spécification :** [docs/echanges.md](../docs/echanges.md) (reprend les règles du 17 novembre 2026, anciennement `docs/versus.md` §7)
- **Tickets liés :** [T-007 · amis et palmarès](007-versus-amis-palmares-v2.md) (la liste d'amis passe dans ce chantier ; le palmarès reste au Versus), [T-031 · une édition par tirage](031-bug-edition-16-bits-de-base.md) (règle des éditions à respecter à la fusion des doublons)

**Décisions déjà écrites.** Toutes les cartes sont échangeables, même le dernier exemplaire, avec ou sans crédits ; aucun garde-fou d'équilibre commercial entre amis. Ce ticket ne doit pas réinventer ces règles.

**À faire, par étapes (voir le découpage de `docs/echanges.md` §8)**
1. **Amis** : migration `gv_friendships`, demandes par code acceptées par l'autre, écran Amis, limites.
2. **Règles pures** (`src/game/trade.ts`) : validation d'une offre, transit, réception unique, fusion des doublons, transfert de la progression, retour des biens ; vérifications automatiques.
3. **Serveur** : `gv_showcase`, `gv_trades`, `gv_trade_items`, `gv_trade_claims`, RLS, fonctions `set-showcase`, `propose-trade`, `answer-trade`, `claim-trade`, expiration à 24 h par le planificateur existant.
4. **Client** : transit et réception dans la sauvegarde, reprise après rechargement, aucune duplication.
5. **Interface** : vitrine, offre et contre-offre avec cartes complètes (édition affichée, Stage, ateliers, rareté, crédits), offres reçues et envoyées, historique, dans une entrée **Échanges** du Garage ; textes en français et en anglais.

**Règles de transit.** Cartes retirées des écuries et inutilisables jusqu'à réception ou retour ; tous les exemplaires et la progression suivent la carte ; les pièces montées retournent au vendeur ; doublon chez le destinataire : exemplaires additionnés, meilleure progression, éditions réunies (une seule tuile par édition).

**Interdits.** Un garage à moins de trois voitures, une voiture engagée, des crédits au-delà du solde, plus de 10 offres ouvertes par joueur.

**Critères de validation**
- [ ] Aucun échange dupliqué après rechargement ni après double réception.
- [ ] Si une réception n'est pas confirmée sous 24 h, les biens reviennent à leur propriétaire.
- [ ] Les récompenses déjà obtenues de séries restent acquises.
- [ ] Tests de contre-offre, refus, annulation, expiration, dernier exemplaire, progression, doublon, solde insuffisant et simultanéité.
- [ ] Le Versus est inchangé et n'est pas nécessaire pour échanger.

**Sécurité.** Chaque étape qui touche au serveur ou aux règles de collection reçoit une revue de sécurité ; **les migrations sont relues par le propriétaire avant fusion dans `master`**, qui déclenche le déploiement.
