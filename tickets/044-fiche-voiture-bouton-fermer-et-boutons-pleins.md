# T-044 · Fiche de voiture : bouton Fermer trop proche du favori, et plus de boutons « pleins »

- **Type :** Ergonomie / interface
- **Priorité :** P2
- **Statut :** À implémenter
- **Signalement :** retour du joueur du 19 novembre 2026 : « revoir le bouton close des fenêtres sur les cartes de voiture, il est trop proche du lien fav, et ce serait bien d'avoir un peu plus de boutons "filled" »
- **Tickets liés :** [T-018 · finitions desktop et thèmes](018-desktop-et-themes-regressions.md), [T-038 · sélection des voitures](038-ux-selection-voitures-course-echanges.md)
- **Fichiers à examiner :** [`src/views/CarSheet.vue`](../src/views/CarSheet.vue) (en-tête avec `.favorite-button` vers la ligne 249, actions des onglets Performances, Atelier et Carte), [`src/App.vue`](../src/App.vue) (fenêtre `.sheet-modal` et `.close-modal` vers la ligne 631), [`src/components/GvButton.vue`](../src/components/GvButton.vue), [`src/themes/base.css`](../src/themes/base.css), [`src/themes/shared.css`](../src/themes/shared.css) et les thèmes de `src/themes/`

## Constat (capture à 390 px, fiche de la Renault Clio III, thème Néon)

- **Fermer (×) et favori (☆) se touchent presque.**
  - Le bouton de fermeture de la fenêtre est en haut à droite, débordant du cadre.
  - L'étoile du favori est dans l'en-tête de la fiche, juste à sa gauche et un peu plus bas.
  - Les deux cibles rondes sont collées : on risque de fermer la fiche en voulant mettre en favori, ou l'inverse.
- **Presque tous les boutons de la fiche sont « fantômes »** (contour seul, `button ghost`) : environ 10 fantômes pour 5 pleins.
  - Les actions importantes ont le même poids visuel que les actions secondaires : passer au stage suivant, vendre, voir la carte d'une édition, recycler.
  - On distingue mal ce qui fait avancer la voiture de ce qui annule.

## Comportement attendu

### Fermer et favori

- Au moins **12 px d'écart** entre les deux cibles, chacune d'au moins 44 × 44 px, sans chevauchement à 320, 390 et 1280 px.
- **Pistes (à arbitrer) :**
  - garder × en haut à droite de la fenêtre et déplacer le favori à gauche du titre ;
  - ou le placer sur la carte elle-même (coin de l'illustration), comme au garage ;
  - ou le transformer en bouton libellé « ☆ Favori » sous le titre.
- Le favori reste lisible sans couleur (☆ / ★ et libellé accessible) et garde son état `aria-pressed`.
- Même traitement pour les autres fenêtres à × proches d'une action : fiche de pièce, fenêtre des Réglages. Vérifier qu'aucune autre action ne colle au ×.

### Boutons plus « pleins »

- **Hiérarchie claire dans la fiche :**
  - **une action principale pleine** par zone (bouton `primary` existant) ;
  - les **actions positives secondaires** dans un nouveau style **plein mais plus sobre** : fond coloré du thème, texte contrasté, à définir dans `GvButton` ou `base.css` comme variante réutilisable, par exemple `button filled` ;
  - les **annulations et retours** restent fantômes.
- **À passer en plein**, par exemple : « Stage suivant », « Voir la carte » d'une édition, le bouton de déblocage d'un style (T-039), « Atelier », « Améliorer ».
- **À laisser fantômes :** « Annuler », « Vendre » tant qu'il n'est pas confirmé (action destructive, ne pas l'encourager).
- Appliquer la même logique, si c'est simple, aux autres écrans qui alignent beaucoup de boutons fantômes, en commençant par la boutique et la préparation de course. Ne pas refaire tout le jeu dans ce ticket.
- **Cohérence dans les huit thèmes :**
  - contraste du texte suffisant (WCAG AA) ;
  - états survolé, appuyé et désactivé visibles ;
  - zones tactiles d'au moins 44 px ;
  - mouvement réduit respecté.

## Contraintes

- Ne pas modifier `rules.ts`, `data.ts` ni `supabase/` : c'est de la mise en page et du style.
- Aucun nouveau bouton fonctionnel : on change la place et l'apparence des boutons existants.
- Textes en français et en anglais si un libellé change.

## Critères de validation

- [ ] À 320, 390 et 1280 px, le × et le favori sont séparés d'au moins 12 px, sans chevauchement, et chacun reste facile à toucher au pouce.
- [ ] La fiche montre une hiérarchie lisible : une action principale pleine, des actions secondaires pleines et sobres, des annulations fantômes.
- [ ] La nouvelle variante de bouton plein est cohérente dans les huit thèmes (captures dans au moins trois thèmes, dont un thème pixel).
- [ ] vue-tsc, i18n, `src/game/*.check.cjs` et le build passent ; aucune erreur dans la console.
