# T-038 · Ergonomie de la sélection de voitures : préparation de course et échanges

- **Type :** Ergonomie / interface mobile
- **Priorité :** P2
- **Statut :** À concevoir puis implémenter ; aucune règle de jeu modifiée
- **Signalement :** retour du joueur du 19 novembre 2026 : « l'UX est vraiment à revoir pour la partie sélection de voiture, c'est pas du tout intuitif », pour les **deux** écrans
- **Tickets liés :** [T-017 · sélection course/garage](017-ux-selection-course-garage.md), [T-029 · boutons automatique / manuel](029-boutons-pilotage-automatique.md), [T-037 · bugs des échanges](037-echanges-synchro-lot-change.md), [T-008 · Échanges de cartes](008-echanges-de-cartes.md)
- **Fichiers à examiner :** [`src/views/RaceView.vue`](../src/views/RaceView.vue) (préparation : `lineup`, `toggle`, `.lineup-slots`, `.pick-list`), [`src/views/FriendsView.vue`](../src/views/FriendsView.vue) (brouillon d'offre et vitrine), [`src/components/TradeCard.vue`](../src/components/TradeCard.vue), [`src/components/CarCard.vue`](../src/components/CarCard.vue), [`src/themes/base.css`](../src/themes/base.css)

## Constat : préparation de course (capture à 390 px, Boulevard Minitel)

Ordre actuel de l'écran, de haut en bas :
1. rival et réplique ;
2. étapes Essais, Qualifs, Finale ;
3. bulle du mécano ;
4. **bouton « Lancer la course »** ;
5. terrain et voitures conseillées par statistique ;
6. les trois cartes de l'écurie ;
7. écurie adverse ;
8. enfin **« Ton garage »**, la liste où l'on choisit.

Problèmes :
- **Le bouton d'action principal est au-dessus du choix** qu'il valide, et la liste de choix est en bas de page, après un long défilement.
- **Une voiture choisie se distingue à peine** des autres : contour un peu plus clair, sans coche, sans fond marqué.
- **Le cercle chiffré à gauche est le coût**, mais rien ne l'indique. Le total par rapport au plafond (par exemple « 5 / 9 ») n'est pas visible près de la liste, et le message « Dépasse le plafond » n'apparaît que sur les lignes désactivées.
- **Toucher une carte de l'écurie ouvre l'atelier**, au lieu de la retirer ou de la remplacer. Pour retirer une voiture, il faut la retrouver dans la liste.
- Rien n'indique quand l'écurie est complète (3/3), ni ce qu'il manque pour lancer la course.
- Le même schéma sert au défi du jour et à la Nuit sans fin : la refonte doit les couvrir.

## Constat : échanges (brouillon d'offre et vitrine)

- « Tu donnes » affiche **tout le garage** en `TradeCard` de 220 px, avec une case à cocher sous chacune (« Donner Renault Clio III »). Il n'y a ni tri, ni filtre, ni recherche. Avec 50 voitures ou plus, « Tu demandes » se retrouve très loin en bas.
- Les voitures non échangeables restent affichées, grisées, avec leur message d'erreur sous chaque carte.
- Les crédits se saisissent dans un champ numérique nu, sans rappel visible du solde au moment de l'envoi.
- Il n'y a **aucun récapitulatif** (« Tu donnes X et 200 ₡ · Tu reçois Y ») avant « Envoyer l'offre ». Les problèmes s'affichent en paragraphes sous le formulaire.
- La vitrine utilise la même grille de cases, et les cases cochées ne sont envoyées qu'après « Enregistrer la vitrine », sans aucun indice de changements non enregistrés.

## Expérience attendue

### Préparation de course

- **Ordre :** contexte du rival, **écurie (3 emplacements)**, **choix des voitures**, puis **« Lancer la course » en bas**, collé à la sélection. Il reste accessible sans défilement sur mobile, par exemple dans une barre fixe en bas au-dessus de la barre d'onglets.
- **Emplacements :** un emplacement vide invite à choisir (« + Choisir »). Un emplacement rempli propose **Retirer** directement. L'atelier reste accessible par une action secondaire distincte (icône clé ou appui long, à arbitrer).
- **Liste :**
  - coche nette et fond marqué pour les voitures choisies ;
  - coût libellé (par exemple « Coût 2 ») ;
  - un compteur **coût / plafond** qui reste visible pendant le défilement ;
  - les voitures hors plafond expliquent la raison sur la ligne.
- **Tri utile :** voitures conseillées pour ce terrain en premier (le score par statistique existe déjà), puis favoris, puis le reste. Filtre optionnel par catégorie si la liste est longue.
- **Bouton Lancer** désactivé avec la raison quand l'écurie est incomplète ou invalide (« Encore 1 voiture », « Plafond dépassé de 2 »).
- Même composant pour les courses de rivaux, le défi du jour et la Nuit sans fin, avec leurs contraintes propres.

### Échanges

- **Déroulé en étapes**, adapté au mobile :
  1. **Ce que tu donnes :** voitures et crédits ;
  2. **Ce que tu demandes :** vitrine de l'ami et crédits ;
  3. **Récapitulatif** puis envoi.

  Un indicateur d'étape et un retour arrière accompagnent le déroulé.
- **Vignettes compactes** sélectionnables en touchant la carte entière, avec une coche visible au lieu d'une case à cocher séparée. Le détail complet de la carte s'ouvre à la demande.
- **Tri et recherche** dans le garage : nom, rareté, doublons d'abord (les voitures qu'on possède en plusieurs exemplaires sont les plus probables à échanger).
- **Voitures non échangeables masquées par défaut**, avec un lien « Afficher les voitures indisponibles (n) » qui donne la raison.
- **Crédits :** sélecteur avec pas rapides (+50, +100, +500, à arbitrer) et rappel du solde.
- **Récapitulatif** clair des deux lots avant l'envoi, et les problèmes affichés à côté de l'élément concerné.
- **Vitrine :** même sélection en vignettes, avec enregistrement automatique (ou un indicateur « modifications non enregistrées » si l'enregistrement reste manuel). À coordonner avec la republication automatique de [T-037](037-echanges-synchro-lot-change.md).

## Contraintes

- Ne modifier ni `rules.ts`, ni `data.ts`, ni `supabase/` : c'est une refonte d'interface.
- Rester cohérent avec les thèmes existants (Néon, Rétro pixel, Carnet, Sobre…) et avec le mouvement réduit.
- Pas de nouveau réglage ni de bouton non demandé en dehors de ce ticket.
- Textes en français et en anglais (`t()`, dictionnaire `src/i18n/en/`).
- Accessibilité : rôles et états (`aria-pressed` ou `aria-checked`), zones tactiles d'au moins 44 px, navigation au clavier sur ordinateur.

## Critères de validation

- [ ] À 390 px, un nouveau joueur compose une écurie de 3 voitures et lance une course **sans défilement inutile** ; le bouton Lancer est sous la sélection.
- [ ] Les voitures choisies, le coût de chacune et le total par rapport au plafond se lisent sans explication.
- [ ] Retirer ou remplacer une voiture de l'écurie se fait en un geste depuis l'emplacement.
- [ ] Avec un garage de 50 voitures ou plus, préparer une offre d'échange (donner 1 voiture, en demander 1, ajouter des crédits) prend moins de 30 secondes et passe par un récapitulatif.
- [ ] Les voitures non échangeables ne polluent plus la liste par défaut.
- [ ] Défi du jour et Nuit sans fin fonctionnent avec la nouvelle sélection.
- [ ] Captures à 390 px et 1280 px dans au moins deux thèmes. vue-tsc, i18n, `src/game/*.check.cjs` et le build passent.
