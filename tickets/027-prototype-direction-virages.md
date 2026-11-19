# T-027 · Prototype de course : prendre les virages avec les flèches gauche et droite

- **Priorité :** P2, à évaluer sur mobile avec le prototype de course.
- **Statut :** Publié en v0.15.0 (mode expérimental), virages en jeu de rythme rétablis en v0.17.0 ; **à playtester sur mobile**
- **Ticket lié** [T-026 · Passage de vitesses au bon régime](026-prototype-passage-vitesses-timing.md).
- **Contexte technique** [RaceView.vue](../src/views/RaceView.vue), [SectorRun.vue](../src/components/SectorRun.vue), [règles de course](../src/game/rules.ts) et [méta du jeu](../docs/meta.md).


## Playtest du 18 novembre 2026 (téléphone)

Les deux gestes fonctionnent mais sont trop lents, se jouent dans un bloc à part au lieu de la scène du duel et jurent avec le design. Le joueur veut le geste en temps réel pendant la course, plusieurs passages de rapport par secteur (un raté ne coûte que des points) et un habillage aux couleurs des thèmes. Tâche : `orchestrator/backlog/pilotage-temps-reel.json`.

## Évolution : jeu de rythme (retour du joueur, 18 novembre 2026)

La première version de ce ticket (un seul virage annoncé, puis une fenêtre « Maintenant ») ne correspondait pas à l'idée du joueur : il imagine **un jeu de rythme**. La variante présente dans `dev` l'applique ainsi :

- les **deux flèches ← et → sont toujours visibles**, chacune sur sa piste avec sa cible « Maintenant » ;
- les **virages à venir arrivent** vers les cibles comme des notes, visibles environ 2,5 s à l'avance ; il faut appuyer sur la bonne piste au bon moment ;
- un secteur de virages devient une **courte séquence** (3 notes par défaut, paramétrable), déterministe à partir du circuit, du secteur et du rival ;
- chaque note est jugée Parfait / Bien / Trop tôt ou Trop tard / Mauvais côté / Raté ; la somme est **bornée** (par défaut de −2 à +2) et s'ajoute au score de base, avec une ligne « Direction » dans le détail ;
- deux grands boutons Gauche / Droite côte à côte au pouce, touches ← et → au clavier, lisible sans couleur, mouvement réduit géré (notes par paliers) ;
- réglage « Direction dans les virages (expérimental) » dépendant du mode timing du T-026 ; démo « Démo des virages » dans Réglages › Paramètres.

Points relevés par les revues, à régler au playtest : la difficulté par rival vient d'un hachage de son identifiant (pas de son niveau), le mouvement réduit avance par pas de 125 ms, le libellé « Maintenant » est un peu bas dans la piste, et la reprise après un onglet masqué est immédiate (sans délai de grâce).

Les sections suivantes décrivent la première idée (un virage, un geste) ; elles restent la référence pour le barème de départ, la tolérance et l'intégration.

## 1. Geste de conduite et guidage

Sur un secteur de type `virage`, le joueur appuie sur **← Gauche** ou **Droite →** quand la voiture atteint l’entrée du virage. Le circuit fixe le sens du virage. Le joueur doit anticiper le geste et le placer au bon moment.

1. **Annonce.** Afficher près de la piste une grande flèche et un court libellé, par exemple « Virage à gauche ». Mettre la commande correspondante en évidence par sa bordure et son libellé. Laisser le temps de lire la direction, y compris lors d’un changement de sens d’un secteur à l’autre.
2. **Entrée du virage.** Faire avancer un repère vers une zone marquée « Maintenant ». La zone, le repère et les libellés restent lisibles sans couleur. Les commandes restent au même endroit pendant toute la séquence. Un mode à animations réduites peut signaler les phases par du texte et un changement d’état du repère.
3. **Résultat.** Au premier appui valide, afficher « Bien placé », « Trop tôt », « Mauvais côté » ou « Trop tard ». Afficher le modificateur de direction dans le détail du score du secteur. Une animation brève de la voiture peut accompagner ce retour.

En V0, les flèches tactiles sont placées côte à côte dans la zone d’action et accessibles au pouce. Sur ordinateur, les touches ← et → déclenchent les mêmes actions pendant le mini-jeu. Les boutons portent les libellés accessibles « Tourner à gauche » et « Tourner à droite ». Ignorer les répétitions clavier et les doubles appuis après validation.

## 2. Articulation avec le passage de vitesses

- Tester d’abord **une action par secteur**. Dans la variante avec direction, le geste de direction occupe les secteurs `virage`. Le compte-tours du T-026 reste disponible sur les secteurs `depart`, `ligne` et `endurance`. Dans la variante de comparaison, les virages gardent le passage de vitesses du T-026.
- Commencer par un seul virage indiqué par secteur. Après le playtest, évaluer si deux virages successifs ou un passage de vitesse après la sortie du virage enrichissent la course. Garder les deux fenêtres distinctes si ces gestes sont combinés.
- Laisser le choix des trois voitures, la consigne et la nitro suivre le déroulé habituel. La statistique **MAN**, la préparation et les conditions continuent de contribuer au score de base du virage.

## 3. Score et difficulté

| Geste | Retour proposé | Modificateur de départ |
| --- | --- | ---: |
| Bon côté à l’entrée du virage | Bien placé | +1 |
| Bon côté pendant l’approche, avant la fenêtre | Trop tôt | 0 |
| Mauvais côté pendant la phase jouable | Mauvais côté | −1 |
| Fenêtre écoulée sans appui | Trop tard | −1 |

Utiliser ce barème comme point de départ pour les tests. Pendant l’annonce, la flèche est visible et les boutons sont temporairement désactivés. La phase jouable commence ensuite, puis la fenêtre de réussite s’ouvre. L’expiration clôt le geste et donne le résultat « Trop tard ». Afficher **score de base + direction = score du secteur** dans la variante direction. Appliquer les limites habituelles du score.

Commencer avec la même tolérance pour toutes les voitures. Après mesure, tester si la MAN ou certaines pièces peuvent élargir légèrement la fenêtre, avec un plafond et en tenant compte de leur effet déjà présent sur le score de base. Ajuster le délai d’annonce et la fenêtre séparément pour conserver une consigne lisible à chaque difficulté.

## 4. Intégration proposée

1. **Décrire le virage.** Pour la démo, associer une direction gauche ou droite aux indices des secteurs `virage` de quelques circuits de test. Garder la direction stable pour un circuit et un secteur donnés. Si le circuit n’a pas de direction définie, utiliser le déroulé du mode de comparaison pour ce secteur.
2. **Déclencher le contrôle dans `RaceView.vue`.** Dans le mode expérimental, présenter le virage après la validation voiture/consigne/nitro et avant l’appel à `playRound`, qui résout le secteur. Le contrôle Vue reçoit la direction attendue et les durées, gère les phases annonce → approche → fenêtre → résultat, et transmet un seul résultat. `SectorRun.vue` affiche ensuite le secteur résolu, comme dans le déroulé actuel.
3. **Calculer le résultat et le score.** Isoler la classification du geste et son modificateur dans une fonction testable qui reçoit la direction attendue, l’entrée du joueur et le temps écoulé. Utiliser une horloge monotone. Dans le chemin expérimental solo, intégrer le modificateur au calcul du joueur avant de comparer le secteur, à l’emplacement de la variation de hasard que le T-026 prévoit de remplacer pour ce joueur. Afficher la ligne « Direction » dans le détail du score. Le rival conserve sa résolution habituelle.
4. **Gérer la reprise.** Suspendre le chrono si l’onglet est masqué et réafficher la consigne à la reprise. Si un rechargement interrompt le geste avant la résolution du secteur, reprendre depuis la sélection. Vérifier qu’un appui, une expiration ou une reprise ne peut valider le même secteur deux fois. Utiliser le réglage de test du T-026 pour comparer les variantes solo.

## Critères d’acceptation du prototype

- [ ] Au moins un virage à gauche et un à droite sont jouables, au tactile et au clavier, avec une annonce lisible avant l’ouverture de la fenêtre.
- [ ] Le bon côté, l’appui anticipé, le mauvais côté et l’expiration donnent chacun un retour immédiat et un score vérifiable. Les tests couvrent les bornes de la fenêtre.
- [ ] La phase active se joue avec une seule commande. Les raccourcis clavier sont limités au mini-jeu, et les doubles appuis et reprises ne résolvent qu’un secteur.
- [ ] Les flèches et les libellés restent lisibles à 320 et 390 px, y compris avec les animations réduites. Le mode solo standard, la reprise de sauvegarde et le Versus passent les vérifications de régression.
- [ ] Un playtest compare le T-026 seul et le T-026 avec direction sur les mêmes circuits, voitures et rivaux. Relever les erreurs de côté, les appuis précoces ou tardifs, la durée de course et le ressenti après plusieurs répétitions.

**Livrable attendu** Une variante solo jouable et un court bilan indiquant si les flèches améliorent le rythme des virages et si le joueur comprend quand et dans quel sens agir.
