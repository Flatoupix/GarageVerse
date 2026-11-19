# T-039 · Annuler un achat d'édition ou de style fait trop vite

- **Type :** Ergonomie / économie
- **Priorité :** P2
- **Statut :** Implémenté dans `dev` (aperçu avant achat, bouton Annuler pendant 30 s) ; à valider sur appareil
- **Signalement :** demande du joueur du 19 novembre 2026 : pouvoir annuler un achat d'édition ou de style fait un peu rapidement
- **Tickets liés :** [T-037 · bugs des échanges](037-echanges-synchro-lot-change.md) (les éditions font partie de la photo d'une voiture en vitrine)
- **Fichiers à examiner :** [`src/game/save.ts`](../src/game/save.ts) (`unlockEdition`, `unlockEditionCheck`, `editionPrice`, `editionDuplicates`, `selectEdition`), [`src/views/CarSheet.vue`](../src/views/CarSheet.vue) (section Styles, fonction `applyStyle` vers la ligne 136), [`src/game/edition.check.cjs`](../src/game/edition.check.cjs), [`src/feedback.ts`](../src/feedback.ts) (`notify`)

## Constat

- Dans la fiche d'une voiture, toucher un style non possédé **l'achète immédiatement**, sans confirmation : `unlockEdition` retire le prix (40, 75, 120 ou 200 ₡ selon la rareté) et **2 doublons**, ajoute le style et l'affiche.
- Le même geste sert à **appliquer** un style déjà possédé. Un toucher destiné à essayer ou prévisualiser un style peut donc déclencher un achat.
- Rien ne permet de revenir en arrière. Les doublons dépensés sont souvent plus rares que les crédits.

## Expérience attendue

1. **Annulation juste après l'achat :**
   - la notification « Style X débloqué » propose un bouton **Annuler**, pendant environ 10 secondes ou tant que la fiche reste ouverte (à arbitrer) ;
   - annuler rend **exactement** les crédits et les doublons dépensés, retire le style et réaffiche le style précédent ;
   - le message de confirmation est par exemple « Achat annulé : 75 ₡ et 2 doublons rendus ».
2. **Seul le dernier achat de la voiture** est annulable. Il ne l'est plus si la voiture a été depuis :
   - échangée, mise en vitrine ou engagée dans une offre ;
   - vendue ou recyclée ;
   - utilisée pour un autre achat qui a consommé ses doublons.

   Dans ces cas, le bouton disparaît, sans message d'erreur.
3. **Prévention complémentaire, à arbitrer :** séparer *aperçu* et *achat*. Toucher un style non possédé montre l'aperçu sur la carte, et un bouton explicite « Débloquer · 75 ₡ + 2 doublons » confirme. Cela réduit les achats involontaires sans ajouter de fenêtre de confirmation.
4. **Effets :** l'annulation coupe proprement les étincelles et le son de déblocage, et respecte le mouvement réduit.

## Règles et contraintes

- L'annulation passe par une fonction de `save.ts` (par exemple `undoEditionUnlock`), testée dans `edition.check.cjs`. L'interface ne modifie pas la sauvegarde directement.
- L'état nécessaire (voiture, style acheté, style affiché avant, crédits et doublons dépensés, horodatage) est conservé de façon à survivre à un rechargement pendant le délai, ou bien l'annulation est explicitement limitée à la session (à arbitrer).
- **Aucune duplication possible :**
  - pas de remboursement après une vente, un échange ou une dépense des doublons ;
  - pas d'annulation multiple ;
  - le crédit rendu ne dépasse pas les limites de la sauvegarde.
- Ne pas modifier `rules.ts` ni `data.ts`. Textes en français et en anglais.

## Critères de validation

- [ ] Acheter un style puis toucher **Annuler** rend crédits et doublons, retire le style et remet l'apparence précédente.
- [ ] Après le délai, ou après avoir quitté la fiche selon la règle retenue, l'annulation n'est plus proposée.
- [ ] Impossible d'annuler après un échange, une mise en vitrine, une vente ou un second achat qui a utilisé les doublons.
- [ ] Une ancienne sauvegarde se charge normalement.
- [ ] vue-tsc, i18n, `src/game/*.check.cjs` (dont `edition.check.cjs`) et le build passent.
