# T-017 · Réexaminer l'ergonomie de sélection des voitures pour les courses

- **Priorité :** P2
- **Statut :** À rediscuter, unification antérieure annulée
- **Sources :** [docs/passation.md](../docs/passation.md) « État du chantier » ; [docs/meta.md](../docs/meta.md) « Choix des voitures d'une course » ; retour joueur

**Contexte.** La première demande visait une sélection identique entre garage et course. Une grille commune (`CarBrowser` / `CarFilterBar`) a été publiée en v0.4.0 puis **annulée à la demande du joueur** : trop serrée et moins lisible pour préparer une course. La liste « Ton garage » a donc été restaurée. Ne pas relancer l'unification à l'identique.

**À faire**
- Montrer au joueur les deux parcours actuels et demander ce qui doit réellement être partagé : recherche, filtres, tri, densité ou seulement composants de carte.
- Préserver en course les données essentielles : coût d'écurie, secteurs avant surchauffe, score estimé, plafond et disponibilité.
- Étudier un composant partagé de **logique** sans imposer la grille du garage.
- Prototyper et valider à 320/390 px avant toute modification définitive.

**Critères de validation**
- [ ] Décision produit explicitement validée avant code.
- [ ] Aucun écrasement d'informations utiles en préparation de course.
- [ ] Sélection rapide et intelligible sur petit écran.
