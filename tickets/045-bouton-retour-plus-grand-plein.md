# T-045 · Bouton Retour trop petit : le rendre plus grand et visuellement plein

- **Type :** UX mobile / hiérarchie des boutons
- **Priorité :** P2
- **Statut :** À corriger
- **Signalement :** retour joueur du 19 novembre 2026 : « Le bouton back, il est petit. Le grossir un peu et lui donner un aspect plein. »
- **Fichiers à examiner :** [`src/views/RaceView.vue`](../src/views/RaceView.vue) (bouton `.back-link` « ← Rivaux » sur la préparation), [`src/components/GvButton.vue`](../src/components/GvButton.vue), [`src/themes/base.css`](../src/themes/base.css), [`src/themes/shared.css`](../src/themes/shared.css).
- **Tickets liés :** [T-044](044-fiche-voiture-bouton-fermer-et-boutons-pleins.md) (bouton de **fermeture ×** d'une fiche, sujet distinct), [T-038](038-ux-selection-voitures-course-echanges.md).

## Problème

Le bouton de retour, en particulier le lien **« ← Rivaux »** de la préparation de course, apparaît trop petit et visuellement trop discret pour une action de navigation importante. Il ressemble davantage à un simple texte qu'à un bouton confortable à utiliser au pouce.

**Attention :** la demande concerne le **bouton Back / Retour**, et non la croix « × » qui ferme la fiche d'une voiture (déjà couverte par T-044).

## Résultat attendu

- Augmenter la taille perçue du bouton et sa **surface tactile**, avec un minimum de **44 × 44 px**.
- Adopter un vrai **fond rempli**, aux couleurs du thème, avec bordure/contraste lisibles, plutôt qu'un lien quasi transparent.
- Conserver une **flèche de retour et un libellé explicite** (« Rivaux » ou « Retour », selon le contexte), sans ambiguïté.
- Rester **secondaire face à « Lancer la course »** : plus visible et confortable ne signifie pas voler toute l'attention du bouton principal.
- Conserver la position logique dans l'en-tête, avec des marges suffisantes sur petit écran et sans chevauchement du titre.
- Si `.back-link` sert sur plusieurs écrans, harmoniser les retours correspondants ; sinon cibler la préparation de course sans changer arbitrairement toute la navigation.
- Préserver l'action : revenir à la liste des rivaux **sans lancer une course ni effacer les données existantes**, conformément au comportement actuel.

## Critères d'acceptation

- [ ] Le retour **« ← Rivaux »** est bien un bouton **plein et immédiatement repérable** sur mobile.
- [ ] Surface tactile minimale 44 × 44 px, avec états focus, appui, désactivé et contrastes suffisants.
- [ ] Lisible et non chevauchant à **320 px / 390 px / 1280 px**, dans les thèmes Synthwave et Pixel, puis les autres.
- [ ] Le retour continue de fonctionner et n'introduit pas de régression sur la sélection des voitures ou la navigation.
- [ ] Vérifier qu'il ne remplace ni ne perturbe la correction du bouton de fermeture de la fiche dans **T-044**.

**Livrable :** une variante de bouton Retour remplie et réutilisable là où cela apporte de la cohérence.
