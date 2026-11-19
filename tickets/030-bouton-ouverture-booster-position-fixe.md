# T-030 · Interface : le bouton de l'ouverture d'un booster garde toujours la même place

- **Type :** Ergonomie
- **Priorité :** P2
- **Statut :** Corrigé dans `dev` (zone d'actions de hauteur fixe pendant l'ouverture) ; à valider sur appareil
- **Signalement :** Retour du joueur, 18 novembre 2026 : « Corriger la place du bouton, quand on ouvre des boosters, pour qu'il ait toujours la même place, peu importe les messages. »
- **Fichiers à examiner :** [`src/views/BoosterView.vue`](../src/views/BoosterView.vue), [`src/components/RevealStack.vue`](../src/components/RevealStack.vue), [`src/components/PullCard.vue`](../src/components/PullCard.vue), [`src/components/TearPack.vue`](../src/components/TearPack.vue), styles dans `src/themes/shared.css` et les thèmes

## Problème observé

Pendant l'ouverture d'un booster, les cartes se retournent l'une après l'autre avec le même bouton d'action (« Retourner la carte », « Carte suivante », « Voir le récapitulatif »). Selon ce qui s'affiche autour de la carte (« Doublon : +1 exemplaire », proposition d'une nouvelle édition avec « Garder l'apparence actuelle » / « Afficher cette édition », libellés de rareté ou de pièce…), la hauteur du contenu change et **le bouton monte, descend ou saute**. Le joueur qui enchaîne les cartes doit chaque fois rechercher le bouton.

## Reproduction

1. Acheter un booster et l'ouvrir.
2. Retourner la première carte, noter la position du bouton « Carte suivante ».
3. Tirer des cartes avec des messages différents : nouvelle voiture, doublon, nouvelle édition, pièce ; comparer la position du bouton sur chacune.
4. Recommencer à 320, 390 et 1280 px et avec un booster ouvert à la suite d'un autre (« Ouvrir le suivant »).

## Comportement attendu

- Le **bouton principal est toujours au même endroit** à l'écran pendant toute l'ouverture, quel que soit le message ou le nombre de lignes. Piste : zone d'actions ancrée en bas de la scène (hauteur réservée), et zone de messages de hauteur fixe ou défilante au-dessus, plutôt qu'un empilement dont la hauteur varie.
- Les messages et choix (nouvelle édition) restent lisibles sans repousser le bouton ; quand un choix remplace le bouton principal, ses boutons occupent la même zone.
- Même comportement en récapitulatif (« Voir le garage », « Ouvrir le suivant », « Autre booster ») et avec le mouvement réduit.

## Critères d'acceptation

- [ ] Sur une série de cartes aux messages différents, la position verticale du bouton principal ne change pas (mesure à 320, 390 et 1280 px).
- [ ] Un message long (anglais compris) ne déplace pas le bouton ; pas de débordement horizontal.
- [ ] Les choix de nouvelle édition tiennent dans la zone d'actions réservée.
- [ ] Aucune régression du geste de déchirure, du retournement ni de la reprise après rechargement.
- [ ] Captures comparatives avant/après sur plusieurs types de cartes.
