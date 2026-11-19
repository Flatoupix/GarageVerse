# T-032 · Étoile de victoire parfaite sur chaque étape d'un rival

- **Priorité :** P3 (confort, à faire plus tard)
- **Statut :** Implémenté dans `dev` (étoile par étape, avancement sur les trois étapes dans la liste des rivaux) ; à valider sur appareil
- **Signalement :** retour du joueur, 18 novembre 2026
- **Fichiers :** [`src/views/RaceView.vue`](../src/views/RaceView.vue) (liste des rivaux et onglets d'étapes), [`src/game/data.ts`](../src/game/data.ts) (étapes Essais / Qualifs / Finale), [`src/game/save.ts`](../src/game/save.ts) (`save.record`)

## Problème

Chaque rival se joue en trois étapes (Essais, Qualifs, Finale). Quand on réussit une victoire parfaite (tous les secteurs gagnés) sur l'une d'elles, rien n'indique **laquelle** : on ne sait pas quelles étapes il reste à « parfaire ».

## Constat dans le code

- Le palmarès est déjà enregistré **par étape** : `save.record` a une entrée par identifiant d'étape (`<rival>:1`, `<rival>:2` et `<rival>` pour la finale), chacune avec `perfect`.
- Mais l'étoile ★ de la liste des rivaux ne lit que `save.record[r.id]`, c'est-à-dire **la finale** seulement.
- Les onglets d'étapes (`rival-steps-tabs`) affichent 🔒, ✓ ou ◆, sans distinguer une victoire parfaite.

## Demande

- Afficher une petite étoile ★ **sur chaque étape** réussie en victoire parfaite (onglet d'étape), à côté de ✓.
- Dans la liste des rivaux, montrer l'avancement sur les trois étapes (par exemple ★☆☆ ou « 2/3 ★ »), pour voir d'un coup d'œil ce qu'il reste à compléter.
- Libellé accessible (« Victoire parfaite obtenue » / « non obtenue »), lisible sans couleur, textes en français et en anglais.

## Critères d'acceptation

- [ ] Une victoire parfaite en Essais ou en Qualifs fait apparaître l'étoile sur cette étape uniquement.
- [ ] La liste des rivaux indique combien d'étapes sont parfaites sur les trois.
- [ ] Aucune migration de sauvegarde nécessaire (les données existent déjà).
