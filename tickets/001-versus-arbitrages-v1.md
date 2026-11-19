# T-001 · Versus V1 : valider les arbitrages produit

- **Priorité :** P1
- **Statut :** Arbitrages repris dans l'implémentation V1 ([docs/versus.md](../docs/versus.md)) ; à reconfirmer avant la réouverture du mode, en pause depuis la v0.13.1
- **Sources :** [docs/versus.md](../docs/versus.md) §1–3, §5 et §11

**Contexte.** La spécification du mode Versus porte explicitement le statut « à valider avant toute implémentation ». Le jeu est destiné à des amis, avec duels synchrones de cinq secteurs et mises en crédits **du jeu**, pas en argent réel.

**À faire**
- Valider ou ajuster les paliers de mise 50/100/250/500 ₡, le plafond de 25 % du solde et la commission de 10 %.
- Trancher les questions ouvertes : minimum/maximum absolus, plafonds de ligue 9/15/22 ou libres, mise d'une revanche et option sans mise.
- Confirmer les règles de délai : salle 10 min, choix 20 s/secteur, IA en absence de choix, forfait après deux secteurs ignorés ou 60 s déconnecté.
- Fixer le comportement d'une égalité, d'une déconnexion et d'une reprise.

**Critères de validation**
- [ ] Toutes les décisions et cas limites sont documentés dans `docs/versus.md`.
- [ ] Les valeurs non arbitrées restent explicitement présentées comme proposées.
- [ ] Aucun développement Versus n'est lancé sur la base d'une supposition.
