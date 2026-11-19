# T-037 · Suggestions d'écurie avant une course

- **Type :** Ergonomie / aide à la décision
- **Priorité :** P2
- **Statut :** À valider (maquette à 320/390 px avant code) ; pas de choix automatique imposé au joueur
- **Demande :** retour du joueur du 19 novembre 2026 : « faire des suggestions de sélection de voiture pour une course ». Les suggestions d'amélioration (atelier) ont été écartées par le joueur : **hors périmètre**.
- **Tickets et sources liés :** [T-017 · Sélection course/garage](017-ux-selection-course-garage.md) (ne pas relancer la grille commune) ; [T-012 · Auras](012-aura-synergies-conditionnelles.md) ; [docs/meta.md](../docs/meta.md) « Choix des voitures d'une course » ; [RaceView.vue](../src/views/RaceView.vue) ; [rules.ts](../src/game/rules.ts) ; [save.ts](../src/game/save.ts).

## 1. Intention

Aider le joueur à composer son écurie de trois voitures **sans jouer à sa place** : quelques suggestions lisibles, chacune avec une raison courte (« Meilleure en virage sous la pluie »), qu'il peut appliquer d'un geste ou ignorer. Le but est de rendre visible ce que le calcul sait déjà, surtout quand le garage dépasse une vingtaine de voitures et que le plafond de coût rend le choix combinatoire.

## 2. Ce qui existe déjà (à réutiliser, pas à dupliquer)

- **`circuitScores(racer, circuit)`** (`rules.ts`) calcule pour chaque type de secteur du circuit le score moyen d'une voiture, pondéré par les probabilités de conditions (pluie, terre, ville, nuit…), hors nitro, consigne et bonus liés à l'adversaire.
- **`garageCars`** (`RaceView.vue`) trie déjà « Ton garage » : voitures choisies, puis favorites, puis **score moyen estimé** décroissant, puis coût croissant. Le tri aide, mais ne tient compte ni du plafond, ni de la complémentarité des trois voitures.
- **`recommendedCars`** / bloc `.race-priorities` (« Préparer ta course ») : pour chaque statistique prioritaire du circuit, il désigne la meilleure voiture **déjà dans l'écurie** et ouvre l'atelier. Il ne propose rien tant que l'écurie est vide et ne suggère jamais une voiture du garage non choisie.
- Contraintes de validité : 3 voitures différentes, présentes et non en transit (`inTransit`, échanges T-008), coût total ≤ plafond (`lineupCheck` ; `nightLineupCheck` avec `NIGHT_CAP` ; `dailyLineupCheck` avec la contrainte du jour : coût, catégorie ou rareté via `constraintCheck`).
- Points de règles qui rendent la composition non triviale : **5 secteurs pour 3 voitures** et surchauffe (`engagements` : 1 + Endurance/4 + effets `stamina`, −3 en surchauffe) ; **auras** qui dépendent des autres voitures de l'écurie (`effect.type === 'aura'`) ; effets `underdog` et `comeback` qui dépendent de l'adversaire et du déroulé.

## 3. Proposition

### 3.1 Calcul (pur, testable, sans interface)

Nouvelle fonction pure, par exemple `suggestLineups(garage, circuit, rule, options)` dans `src/game/suggest.ts` (ou `rules.ts` si elle reste courte), vérifiée par `src/game/suggest.check.cjs` comme les autres modules.

- **Entrées :** voitures disponibles avec leur préparation (`prepOf`), circuit, règle de validité (plafond et éventuelle contrainte catégorie/rareté), écurie adverse si connue, graine de la course.
- **Score d'une écurie** (et non d'une voiture isolée) : pour chaque secteur du circuit dans l'ordre, la meilleure voiture disponible avec `circuitScores`, en respectant le nombre d'engagements avant surchauffe ; auras comptées avec les deux autres voitures du trio. Rester une **estimation** (pas de simulation complète du duel ni de nitro) pour garder un calcul instantané.
- **Recherche :** garage de 131 voitures au plus, donc ≈ 370 000 trios ; élaguer d'abord (par exemple les 12 à 15 meilleures voitures par type de secteur, plus les moins chères pour tenir le plafond) puis énumérer. Budget visé : < 20 ms sur téléphone moyen, mesuré.
- **Sorties :** jusqu'à 3 écuries valides, avec pour chaque voiture une **raison** choisie parmi un petit vocabulaire traduisible : meilleure sur le secteur dominant, bonus de terrain probable (pluie · intégrale, terre · tout-terrain, ville · gabarit, nuit · aura culturelle), endurance qui couvre deux secteurs, aura avec une autre voiture du trio, coût bas qui libère le plafond.

### 3.2 Variété (« pas toujours la même voiture »)

- La première suggestion est **la meilleure estimation**, sans hasard : le joueur doit pouvoir lui faire confiance.
- Les suivantes doivent être **réellement différentes** (au moins une voiture de moins en commun avec la précédente) et rester proches en score (écart maximal à fixer, par exemple 10 %). Les nommer selon leur angle : « Meilleure estimation », « Plus économique », « Autre option ».
- En cas d'égalité ou de quasi-égalité, départager de façon reproductible avec la graine de la course (`seededRng`) plutôt qu'avec l'ordre du catalogue, pour que les voitures de même niveau tournent d'une course à l'autre.
- Ne pas pénaliser une voiture parce qu'elle a été suggérée récemment : la variété ne doit jamais dégrader la première suggestion.

### 3.3 Interface (écran « Préparer ta course »)

- Un bloc compact **« Suggestions »** au-dessus de « Ton garage » (ou dans `race-briefing`), replié en une ligne quand l'écurie est déjà complète.
- Chaque suggestion montre les trois noms, le coût total / plafond et une raison courte par voiture ; un bouton **« Prendre cette écurie »** remplace l'écurie actuelle (geste réversible : rien ne démarre la course).
- Dans « Ton garage », un petit repère (par exemple ◆) sur les voitures de la première suggestion, sans changer le tri actuel ni masquer le coût, les secteurs avant surchauffe et les scores (T-017).
- Conserver le texte d'avertissement existant : estimations selon le terrain, hors nitro et bonus liés à l'adversaire.
- Pas de son ni d'animation insistante ; respecter le mouvement réduit.

### 3.4 Modes de course

| Mode | Comportement attendu |
| --- | --- |
| Rivaux et étapes (Essais, Qualifs, Finale), spéciales | Circuit et plafond connus : suggestions complètes. |
| Défi du jour | Respecter la contrainte du jour (coût, catégorie ou rareté). Si aucune écurie valide n'existe, le dire au lieu de suggérer. |
| Nuit sans fin | Le circuit change à chaque manche : suggérer une écurie **polyvalente** sous `NIGHT_CAP` (moyenne sur les types de secteurs), en l'annonçant comme telle. À arbitrer : suggérer aussi entre deux manches ou non (voir T-035). |
| Versus | Hors périmètre de ce ticket (le calcul doit rester réutilisable, `rules.ts` étant copié côté serveur ; ne rien y mettre qui dépende de la sauvegarde). |

## 4. Hors périmètre

- Suggestions d'amélioration, de pièces ou d'atelier (écartées par le joueur le 19/11/2026).
- Conseil pendant le duel (choix de la voiture par secteur, nitro, consigne) : l'IA `aiChoice` existe mais ne doit pas jouer pour le joueur.
- Sélection automatique sans action du joueur, ou suggestion préremplie à l'ouverture de l'écran.

## 5. Questions à trancher avant le code

1. Nombre de suggestions : une seule écurie, ou trois écuries comme proposé ici ?
2. Les favoris (★) doivent-ils être favorisés dans les suggestions, ou seulement dans le tri du garage ?
3. Affichage par défaut : bloc ouvert pour tous, ou seulement tant que l'écurie est incomplète ?
4. Faut-il un réglage pour masquer les suggestions (joueurs qui préfèrent composer seuls) ?

## 6. Critères de validation

- [ ] Décisions de la section 5 validées par le joueur avant code.
- [ ] Toute écurie suggérée passe `lineupCheck` / `dailyLineupCheck` / `nightLineupCheck` du mode concerné ; aucune voiture en transit.
- [ ] Vérification `suggest.check.cjs` : validité, respect du plafond et des contraintes, déterminisme pour une même graine, différence réelle entre suggestions, cas « garage trop petit » ou « aucune écurie valide ».
- [ ] Chaque voiture suggérée a une raison courte, en français et en anglais (`src/i18n/en`).
- [ ] « Prendre cette écurie » remplace l'écurie sans lancer la course ; le joueur peut ensuite retirer ou ajouter des voitures normalement.
- [ ] Calcul mesuré sous 20 ms avec un garage complet sur téléphone.
- [ ] Lisible à 320 et 390 px dans les huit thèmes ; informations existantes de « Ton garage » intactes.
- [ ] `docs/meta.md` (« Choix des voitures d'une course ») et `CHANGELOG.md` mis à jour à la livraison.
