# T-008 · Versus V3 : échanges de voitures et crédits entre amis

- **Priorité :** P2
- **Statut :** Spécifié pour V3
- **Sources :** [docs/versus.md](../docs/versus.md) §7 et §9

**Décisions déjà écrites.** Toutes les cartes sont échangeables, même le dernier exemplaire, avec ou sans crédits ; aucun garde-fou d'équilibre commercial entre amis. Ce ticket ne doit pas réinventer ces règles.

**À faire**
- Créer une vitrine de cartes visibles à l'échange, puis propositions, contre-propositions et acceptations (expiration à 24 h).
- Afficher les cartes complètes des deux côtés : édition affichée, Stage, niveaux d'atelier, rareté et crédits.
- Gérer le transit : cartes retirées des écuries et rendues temporairement inutilisables jusqu'à réception ou annulation.
- Transférer tous les exemplaires et la progression (Stage, ateliers, emplacement, éditions) ; rendre les pièces montées au stock du vendeur.
- En cas de doublon chez le destinataire : additionner les exemplaires, conserver meilleure progression et union des éditions.
- Interdire un garage à moins de trois voitures, une voiture engagée ou des crédits au-delà du solde.
- Ajouter `trades`, `trade_items` et `propose-trade`, `answer-trade`, `claim-trade` côté serveur.

**Critères de validation**
- [ ] Aucun échange dupliqué après rechargement.
- [ ] Si une réception n'est pas confirmée sous 24 h, les biens reviennent à leur propriétaire.
- [ ] Les récompenses déjà obtenues de séries restent acquises.
- [ ] Tests de contre-offre, annulation, dernier exemplaire, progression et simultanéité.

**Dépendance.** Versus V1/V2 et persistance d'échange validées.
