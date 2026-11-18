# T-031 · Bug : déblocage de la carte 16 bits de base, et voiture en double

- **Type :** Bug de collection
- **Priorité :** P2
- **Statut :** À reproduire, puis à trancher et corriger
- **Signalement :** Retour du joueur, 18 novembre 2026 : « Il y a un souci avec le déblocage des cartes 16 bits de base, peu importe l'autre édition. Résultat : quand on a une autre édition sur 16 bits, on a deux [cartes]. »
- **Fichiers à examiner :** [`src/game/save.ts`](../src/game/save.ts) (tirage d'un booster, `addCar`, `unlockEdition`, `selectEdition`, normalisation à la lecture de sauvegarde), [`src/game/data.ts`](../src/game/data.ts) (`PIXEL`, `defaultStyle`, `stylesOf`, `altStyles`), [`src/views/GarageView.vue`](../src/views/GarageView.vue) et [`src/views/ShowroomView.vue`](../src/views/ShowroomView.vue) (une tuile par édition), [`src/views/CarSheet.vue`](../src/views/CarSheet.vue)

## Contexte

Le pixel art 16 bits (`PIXEL`, « Pixel 16 bits ») est l'**édition par défaut de toutes les cartes** ; les autres illustrations (Synthwave, Classic, Solarpunk, Abandonnée, Anime…) sont des éditions à collectionner (`stylesOf(id)`). Au tirage d'un booster, une carte sort dans l'édition de base ou, selon `altChance`, dans une édition alternative ; `addCar` n'ajoute que **l'édition tirée** à `car.editions`. Le garage montre une tuile par édition possédée.

## Problème observé

D'après le retour, la carte 16 bits de base **n'est pas débloquée de façon cohérente** quand la voiture arrive avec une autre édition, et un joueur qui possède une autre édition en plus du 16 bits se retrouve avec **deux cartes pour une même voiture**. Le comportement exact (quelle carte apparaît, quand, dans le garage, le récapitulatif ou le showroom) reste à établir.

## À établir avant de corriger (reproduction)

1. Tirer une voiture directement dans une édition alternative : le 16 bits de base est-il débloqué, ou la voiture n'a-t-elle que l'édition tirée ?
2. Tirer ensuite la même voiture en 16 bits : combien de tuiles et d'exemplaires apparaissent (garage, fiche, showroom, compteur de cartes et de doublons) ?
3. Comparer avec une voiture reçue par récompense ou par le garage de départ (`defaultStyle`), et avec une légendaire (qui utilise son image fixe par défaut au lieu du 16 bits).
4. Vérifier le comptage « Voitures découvertes », les doublons recyclables et les éditions manquantes.

## Comportement attendu (à confirmer avec le joueur)

- Le **16 bits de base d'une voiture est débloqué avec la voiture, quelle que soit l'édition dans laquelle elle est tirée**, ou, au contraire, n'est débloqué que par son propre tirage : **choisir une règle unique, la documenter et l'appliquer partout**.
- Une voiture ne compte **qu'une fois** (cartes découvertes, séries, progression), et ses éditions sont des variantes de cette même voiture : pas de second exemplaire ni de seconde carte parasite quand on possède 16 bits et une autre édition.
- Les sauvegardes existantes sont normalisées sans perte ni doublon (lecture de `editions` dans `save.ts`).

## Critères d'acceptation

- [ ] Le scénario du joueur est reproduit dans un test (`.check.cjs`) qui échoue avant la correction.
- [ ] Une règle unique de déblocage du 16 bits de base, documentée dans `docs/meta.md`.
- [ ] Plus de doublon de voiture entre édition de base et autre édition ; compteurs et séries justes.
- [ ] Les sauvegardes existantes se chargent sans perte ; recyclage, sélection d'édition et showroom inchangés pour le reste.
- [ ] Vérifié dans les éditions alternatives disponibles (Classic, Solarpunk, Abandonnée, Anime…) et sur une légendaire.
