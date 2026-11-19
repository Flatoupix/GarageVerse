# T-031 · Bug : déblocage de la carte 16 bits de base, et voiture en double

- **Type :** Bug de collection
- **Priorité :** P2
- **Statut :** **Abandonné** le 19 novembre 2026, à la demande du joueur. Non reproduit au navigateur ; le test de la règle « un tirage = l'édition tirée » reste dans `src/game/edition.check.cjs`
- **Signalement :** Retour du joueur, 18 novembre 2026 : « Il y a un souci avec le déblocage des cartes 16 bits de base, peu importe l'autre édition. Résultat : quand on a une autre édition sur 16 bits, on a deux [cartes]. »
- **Précision du joueur (18 novembre 2026) :** « Deux tuiles pour un tirage, il ne faut qu'il n'y ait que le tirage courant. »
- **Fichiers à examiner :** [`src/game/save.ts`](../src/game/save.ts) (tirage d'un booster, `addCar`, `unlockEdition`, `selectEdition`, normalisation à la lecture de sauvegarde), [`src/game/data.ts`](../src/game/data.ts) (`PIXEL`, `defaultStyle`, `stylesOf`, `altStyles`), [`src/views/GarageView.vue`](../src/views/GarageView.vue) et [`src/views/ShowroomView.vue`](../src/views/ShowroomView.vue) (une tuile par édition), [`src/views/CarSheet.vue`](../src/views/CarSheet.vue)

## Contexte

Le pixel art 16 bits (`PIXEL`, « Pixel 16 bits ») est l'**édition par défaut de toutes les cartes** ; les autres illustrations (Synthwave, Classic, Solarpunk, Abandonnée, Anime…) sont des éditions à collectionner (`stylesOf(id)`). Au tirage d'un booster, une carte sort dans l'édition de base ou, selon `altChance`, dans une édition alternative ; `addCar` n'ajoute que **l'édition tirée** à `car.editions`. Le garage montre une tuile par édition possédée.

## Problème observé

Un **seul tirage** de booster fait apparaître **deux tuiles** pour la même voiture : l'édition tirée **et** la carte 16 bits de base, comme si le 16 bits de base était débloqué en plus, quelle que soit l'édition obtenue.

## Règle attendue (précisée par le joueur)

**Un tirage = une seule tuile : l'édition effectivement tirée.** Le 16 bits de base n'est pas débloqué ni affiché en plus. Seul le tirage courant doit apparaître.

## Constat de l'analyse (à confirmer à l'écran)

- La **logique de jeu n'est pas en cause** : une simulation de 3 000 boosters (dont 1 009 tirages d'une édition alternative sur une voiture neuve) n'a jamais donné plus d'une édition à une voiture après un seul tirage. `addCar` n'ajoute que l'édition tirée à `car.editions`.
- La seconde tuile vient donc **d'un affichage** : à chercher dans le récapitulatif (`recap-grid`) ou l'empilement des cartes de `BoosterView.vue` / `RevealStack.vue`, dans le garage (vue planche, filtre « éditions manquantes »), dans `ShowroomView.vue` (une tuile par édition de `stylesOf`) ou dans la fiche (`CarSheet.vue`). Les voitures de départ (déjà en 16 bits via `defaultStyle`) et les légendaires (image fixe par défaut, `defaultStyle`) sont des cas particuliers à tester.

## Reproduction à établir

1. Obtenir une voiture neuve par un tirage en édition alternative (Solarpunk, Abandonnée, Classic, Anime…) : combien de tuiles apparaissent dans le récapitulatif, puis dans le garage, puis dans le showroom ?
2. Même chose avec un tirage en 16 bits, puis avec un doublon dans une autre édition.
3. Comparer avec une voiture de départ et une légendaire.
4. Noter l'écran exact où la seconde tuile apparaît, avec une capture.

## Critères d'acceptation

- [ ] Le scénario du joueur est reproduit et son écran identifié (capture), avec un test automatique qui échoue avant la correction.
- [ ] Un tirage ne produit qu'**une seule tuile**, celle de l'édition tirée, dans le récapitulatif, le garage et le showroom ; le 16 bits de base n'est pas ajouté en plus.
- [ ] Les compteurs (voitures découvertes, doublons, séries) restent justes ; une voiture ne compte qu'une fois.
- [ ] Les sauvegardes existantes se chargent sans perte ; recyclage, sélection d'édition et déblocage d'édition inchangés pour le reste.
- [ ] Vérifié sur les éditions alternatives disponibles, sur une voiture de départ et sur une légendaire ; textes en français et en anglais.
