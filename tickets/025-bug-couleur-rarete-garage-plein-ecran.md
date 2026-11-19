# T-025 · Bug : couleur de rareté incohérente entre le garage et la carte en plein écran

- **Type :** Bug visuel
- **Priorité :** P2
- **Statut :** Rouvert le 19 novembre 2026. Le premier correctif n'a unifié que les cartes de voiture, les vignettes et les filtres (`src/themes/shared.css`). Il reste une autre palette à l'ouverture de booster, dans les effets de révélation et sur les cartes de pièces : Rare y est rose et Épique orange, alors qu'au garage Rare est bleu et Épique rose. Tâche `t025-couleurs-rarete` dans l'orchestrateur
- **Signalement :** Retour joueur, 17 novembre 2026
- **Fichiers à examiner :** [`src/components/CarCard.vue`](../src/components/CarCard.vue), [`src/views/GarageView.vue`](../src/views/GarageView.vue), [`src/views/CarSheet.vue`](../src/views/CarSheet.vue), styles partagés et thèmes dans `src/themes/`

## Problème observé

La **couleur représentant la rareté d'une même carte** est différente entre sa vignette dans le garage et son affichage agrandi / plein écran.

Ce décalage brouille le code couleur de la collection TCG. La rareté sous-jacente de la carte ne devrait pas changer lorsqu'on ouvre son détail.

## Reproduction

1. Ouvrir le **Garage**.
2. Repérer une carte possédée et observer la couleur de son cadre, liseré ou indicateur de rareté.
3. Toucher la carte pour ouvrir sa fiche / vue agrandie.
4. Comparer la couleur de rareté dans les deux affichages.
5. Recommencer avec une carte de chaque rareté et dans plusieurs thèmes.

**À préciser pendant le diagnostic :** modèles/raretés concernés, thèmes et plateformes, et élément exact qui diverge (cadre, liseré, badge ou autre). Ne pas présumer que tous les thèmes sont affectés.

## Comportement attendu

La même rareté doit utiliser un **code couleur cohérent** en grille du garage et en vue agrandie, sans confusion avec l'édition artistique, l'aura culturelle ou un effet visuel propre au thème.

## Pistes de diagnostic

- Comparer les classes et variables de rareté de `CarCard.vue` avec les styles appliqués dans `CarSheet.vue` et leurs conteneurs.
- Vérifier les styles `finish-*`, `rarity-*`, les variables CSS et d'éventuelles surcharges spécifiques à un thème, à une taille ou à la vue agrandie.
- Si les deux vues utilisent la même carte, rechercher une différence de contexte CSS plutôt qu'une divergence des données `rarity`.

## Critères d'acceptation

- [ ] La couleur associée à chaque rareté est visuellement cohérente entre le garage et la fiche agrandie pour **la même voiture**.
- [ ] Vérifié pour **Courante, Rare, Épique et Légendaire**.
- [ ] Vérifié sur smartphone et desktop, avec les thèmes disponibles.
- [ ] Les effets distinctifs (holographie, animations, éditions artistiques) peuvent varier, mais ne changent pas la lecture de la rareté.
- [ ] Captures comparatives avant/après ; aucune régression des cartes ou des filtres.

**Note :** ce ticket documente le bug signalé. Il ne constitue pas une validation d'une cause technique précise.
