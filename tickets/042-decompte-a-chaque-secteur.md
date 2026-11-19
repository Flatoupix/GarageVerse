# T-042 · Décompte complet « 3, 2, 1, Partez ! » avant chaque mini-jeu

- **Type :** Ergonomie / pilotage manuel
- **Priorité :** P2
- **Statut :** Implémenté dans `dev` (décompte complet avant chaque mini-jeu manuel) ; à valider sur appareil
- **Signalement :** retour du joueur du 19 novembre 2026 : « le décompte pour les mini-jeux n'arrive qu'une fois, est-ce que tu peux faire en sorte que ce soit le cas à chaque fois ? »
- **Tickets liés :** [T-026 · passage des vitesses](026-prototype-passage-vitesses-timing.md), [T-027 · virages](027-prototype-direction-virages.md), [T-028 · Auto / Manuel](028-pilotage-automatique-ou-manuel.md), [T-035 · Nuit sans fin](035-nuit-sans-fin-pilotage-auto-manuel.md)
- **Fichiers à examiner :** [`src/components/ManualCountdown.vue`](../src/components/ManualCountdown.vue), [`src/views/RaceView.vue`](../src/views/RaceView.vue) (`firstManual` vers la ligne 273, `<ManualCountdown :full="firstManual">` vers la ligne 710, `pendingManual`), [`src/game/countdown.ts`](../src/game/countdown.ts)

## Constat

Depuis la v0.16.0, une course en pilotage manuel commence par un décompte, mais il n'est complet qu'au premier secteur :
- `firstManual` vaut vrai seulement si aucun secteur manuel n'a encore été joué dans le duel ;
- au **premier secteur manuel**, `ManualCountdown` affiche « 3, 2, 1, Partez ! », avec un bip à chaque chiffre et 600 ms par étape (`COUNTDOWN_STEP_MS`) ;
- aux **secteurs suivants**, il n'affiche qu'un « Prêt ? » puis « Partez ! », sans bip et en 450 ms par étape (`READY_STEP_MS`).

Pour le joueur, le décompte n'arrive donc qu'une fois par course.

## Comportement attendu

- **Chaque mini-jeu manuel** (passage des vitesses comme virages) est précédé du décompte complet **« 3, 2, 1, Partez ! »**, avec ses bips, ses effets et le même rythme que le premier. Ça vaut pour tous les secteurs d'une course de rival, du défi du jour, de chaque manche de la Nuit sans fin et des démonstrations des Réglages si elles en ont un.
- Le geste ne démarre qu'à « Partez ! », comme aujourd'hui. Aucun temps de jeu n'est pris pendant le décompte.
- **À arbitrer :** une durée un peu plus courte pour les secteurs suivants (par exemple 450 ms par chiffre au lieu de 600 ms), mais toujours avec les trois chiffres. Par défaut, garder 600 ms partout.
- Après une **bascule en automatique** en cours de course, plus aucun décompte : les secteurs automatiques n'en ont pas.
- **Reprise :** après un rechargement ou un retour dans l'application en plein secteur, le décompte se rejoue avant le geste.
- **Mouvement réduit :** les chiffres restent affichés, sans effets animés, comme aujourd'hui.
- Si la propriété `full` et le libellé « Prêt ? » ne servent plus, les retirer (traduction comprise) au lieu de les laisser inutilisés.

## Critères de validation

- [ ] Sur une course manuelle de 5 secteurs, « 3, 2, 1, Partez ! » apparaît avant **chacun** des 5 mini-jeux, vitesses comme virages.
- [ ] Même chose pour le défi du jour et pour deux manches de la Nuit sans fin.
- [ ] Aucun décompte sur les secteurs joués en automatique, ni après « Passer en automatique pour la suite ».
- [ ] Le tutoriel du premier geste reste affiché avant le premier décompte, une seule fois.
- [ ] vue-tsc, i18n, `src/game/*.check.cjs` et le build passent ; aucune erreur dans la console à 390 et 1280 px.
