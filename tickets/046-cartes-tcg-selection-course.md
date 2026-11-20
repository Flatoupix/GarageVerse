# T-046 · Préparation de course : retrouver les vraies cartes TCG des voitures

- **Type :** Régression UX / direction artistique TCG
- **Priorité :** P2
- **Statut :** Livré en v0.21.0 ; à valider sur téléphone
- **Signalement :** retour joueur du 19 novembre 2026 : « Je veux le système d'avant, c'était mieux » ; les voitures choisies ne sont plus présentées comme des **cartes**.
- **Tickets liés :** [T-038 · UX de sélection de voitures](038-ux-selection-voitures-course-echanges.md) (refonte globale déjà livrée, dont la présentation ne convient pas au joueur), [T-041 · suggestions d'écurie](041-suggestions-ecurie-avant-course.md).
- **Fichiers à examiner :** [`src/views/RaceView.vue`](../src/views/RaceView.vue) (`.lineup-slots`, `.slot-car`, `.pick-list`), [`src/components/CarCard.vue`](../src/components/CarCard.vue), [`src/themes/shared.css`](../src/themes/shared.css), [`src/themes/base.css`](../src/themes/base.css) et les autres thèmes.

## Retour et problème observé

Dans la constitution de l'écurie de course, la refonte actuelle a privilégié des **emplacements contenant une très petite illustration de voiture et son nom**, accompagnés des boutons **« Retirer »** et **« Atelier »**. Les cases vides portent **« + Choisir »** et le garage utilise une liste textuelle.

Cela fonctionne peut-être pour sélectionner des voitures, mais **l'identité visuelle de GarageVerse est perdue** : le joueur ne retrouve plus ses voitures **en vraies cartes de collection**, comme avant. Les boutons et les lignes utilitaires occupent davantage la scène que les visuels des cartes.

**Demande principale : restaurer le rendu TCG de l'ancienne présentation**, plutôt qu'une simple retouche des espacements ou l'ajout de boutons supplémentaires.

## Comportement attendu

1. Dans les **trois emplacements d'écurie sélectionnée**, afficher de **véritables cartes automobiles** (illustration et habillage de carte, rareté/édition et identité visuelle) à une taille reconnaissable, avec le composant existant `CarCard.vue` ou une variante compacte fidèle.
2. Dans la liste permettant de **choisir une voiture**, conserver une présentation qui met **les cartes** au premier plan, au lieu d'une liste essentiellement textuelle. La sélection doit rester claire et rapide.
3. **Vérifier visuellement l'ancienne version** avant de développer : comparer avec le rendu précédent de la préparation de course et rétablir ce qui fonctionnait pour le joueur. Ne pas inventer une troisième présentation sans besoin.
4. **Ne pas perdre les améliorations ergonomiques de T-038** : trois emplacements, possibilité de choisir/remplacer/retirer, compteur d'écurie et plafond de coût, action de lancement bien placée, bonnes tailles tactiles.
5. Éclaircir les actions existantes : **sélectionner/retirer** une voiture doit être évident ; **toucher sa carte** doit permettre d'en consulter la fiche, comme le souhaite le joueur, si cela correspond au fonctionnement antérieur. Garder l'**Atelier** accessible via une action secondaire, sans recouvrir la carte d'un bouton géant. **Auditer le comportement historique réel** avant de figer les clics.
6. Sur mobile, garder les cartes **visibles sans les écraser** ni déclencher un interminable défilement. Préférer une grille, un défilement horizontal contrôlé ou une présentation compacte des cartes qui préserve l'identité TCG.
7. Les éditions spéciales, le Pixel, les thèmes, les états sélectionné/favori et les contraintes de coût restent correctement lisibles.

## Reproduction / vérification

- Ouvrir **Course → DJ Cassette → préparation**.
- Observer l'écurie : petite vue voiture + nom, puis **Retirer / Atelier**, sans carte TCG.
- Choisir une autre voiture via la liste : le nouveau choix apparaît comme une petite illustration plutôt que comme une carte.
- Comparer avec l'ancienne présentation depuis l'historique Git / une capture de référence ; noter précisément les éléments visuels à restaurer.

## Critères d'acceptation

- [ ] Les **3 voitures de l'écurie** apparaissent de nouveau **sous forme de cartes**, reconnaissables comme celles du garage.
- [ ] Le **choix dans le garage** conserve les codes visuels TCG, pas uniquement une suite de lignes et de noms.
- [ ] Les contrôles Choisir / Retirer / Fiche / Atelier sont compréhensibles, sans masquer l'artwork ni introduire d'action involontaire.
- [ ] Les cartes sélectionnées restent visiblement distinguables de celles non retenues ; le **coût total et les contraintes** restent lisibles.
- [ ] Vérifié sur **320/390/1280 px**, dans plusieurs thèmes, y compris avec trois cartes sélectionnées et un garage volumineux.
- [ ] La même sélection reste fonctionnelle pour rivaux, Défi du jour et Nuit sans fin ; aucune régression des sauvegardes ni des scores.
- [ ] Une **capture avant/après** montre que le caractère « jeu de cartes à collectionner » a été restauré.

**Livrable :** retour à une préparation de course centrée sur les cartes TCG, en conservant les améliorations utiles de l'UX moderne.
