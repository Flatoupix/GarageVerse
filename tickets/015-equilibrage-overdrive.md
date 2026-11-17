# T-015 · Évaluer l'équilibrage de la Ligue Overdrive sur des collections réelles

- **Priorité :** P2
- **Statut :** À tester
- **Sources :** [docs/meta.md](../docs/meta.md) §9 ; [pipeline/balance-review.md](../pipeline/balance-review.md)

**Contexte.** La simulation existante ne remplace pas un playtest sur des garages avancés.

**À faire**
- Tester la ligue Overdrive avec plusieurs collections réelles (entrée de ligue, intermédiaire, maximisée).
- Mesurer la difficulté, la diversité des écuries viables, la fréquence de victoire et la pertinence des pièces.
- Confronter les résultats à `node pipeline/balance.mjs`, sans réappliquer aveuglément les anciens correctifs : les valeurs de Venom, Brian, Silvia, Hummer, K9K, turbo hybride et Roxy sont déjà corrigées dans les données.
- Formuler des corrections chiffrées uniquement si les essais le justifient.

**Critères de validation**
- [ ] Rapport avec profils d'essai, taux de réussite et cas injustes.
- [ ] Ajustements motivés avec tests de non-régression sur les ligues précédentes.
- [ ] Les modifications déjà présentes ne sont pas proposées une seconde fois.
