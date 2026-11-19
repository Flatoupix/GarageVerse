# T-048 · Pilotage manuel : la mini-course doit être la vraie course, jusqu'à l'arrivée

- **Type :** Gameplay visuel / continuité de la scène de course
- **Priorité :** P2
- **Statut :** À concevoir, implémenter et playtester sur smartphone
- **Signalement :** retour joueur du 19 novembre 2026 : « Pendant le jeu de rythme et le passage de vitesse, il y a une course, mais ce n'est pas la course finale. Je veux que ce soit la vraie course : la voiture avance et, à la fin, elle franchit la ligne d'arrivée. »
- **Tickets liés :** [T-026 · vitesses](026-prototype-passage-vitesses-timing.md), [T-027 · virages gauche/droite](027-prototype-direction-virages.md), [T-047 · résultats manuels compacts](047-pilotage-manuel-bilan-compact.md).
- **Fichiers à examiner :** [`src/views/RaceView.vue`](../src/views/RaceView.vue) (`pendingManual`, `finishManual`, `showRound`, `step`, `settle`), [`src/components/SectorRun.vue`](../src/components/SectorRun.vue) (`run-live`, `run-mover`, `run-finish`), [`src/components/TimingGauge.vue`](../src/components/TimingGauge.vue), [`src/components/TurnControl.vue`](../src/components/TurnControl.vue), styles de course.

## Problème

Pendant le **mini-jeu de passage de vitesses ou le rythme gauche/droite**, on voit déjà les voitures rouler dans une scène de course. **Mais cette animation ne représente pas encore l'avancement définitif** : `SectorRun.vue` utilise une animation `live` basée sur le temps, puis l'interface passe à un `round` calculé et **rejoue une autre animation** via les lignes de score dans `showRound`.

Le résultat ressenti est **deux courses successives** pour la même action : une animation pendant que le joueur pilote, puis une animation de résolution qui paraît être la vraie.

## Résultat attendu

**Le pilotage manuel doit se dérouler directement dans la course réelle**, sur une seule scène continue, sans prévisualisation suivie d'une seconde course.

1. Dès le **« 3, 2, 1, Partez ! »**, les voitures commencent à avancer sur la **piste qui servira jusqu'au résultat**, pendant que le joueur passe ses vitesses ou négocie ses virages.
2. **Chaque geste** (Parfait, Bien, Raté) influence **immédiatement et visiblement** la dynamique : légère accélération, ralentissement, rattrapage, fumée, à-coup, mouvement relatif des deux voitures. Ne pas rendre ces effets trompeurs sur le score final.
3. Le **rival participe à cette même course**, pas à une animation séparée ensuite. Ses actions et sa progression doivent rester cohérentes avec les règles du duel.
4. À la fin des gestes du secteur, **ne pas réinitialiser les voitures à zéro** et **ne pas rejouer toutes les lignes de score**. Terminer la même animation puis afficher directement le **vrai résultat de ce secteur**.
5. Lorsque la **course complète** se termine (dernier secteur), montrer la voiture atteindre **la ligne d'arrivée**, avec une conclusion claire (gagné/perdu, victoire finale, récompenses) **sans recommencer une nouvelle animation de course**.
6. Si plusieurs secteurs constituent le duel, préserver la continuité visuelle autant que le découpage le permet : l'arrivée finale doit correspondre à la dernière résolution, sans faire croire qu'une animation provisoire est la victoire définitive.
7. Pendant cette transition, conserver les contrôles tactiles visibles, sans déplacement brutal du bouton de vitesse ou des flèches au moment du geste.

## Contraintes techniques et fonctionnelles

- Le **moteur de règles** doit rester la source de vérité pour la sélection des voitures, la nitro, les scores, les points, la victoire et les récompenses. **Ne pas déduire un gagnant définitif d'une animation provisoire**.
- Concevoir une manière de **lier la position des voitures aux gestes et aux résultats**, puis de raccorder leur position à l'état final, sans téléportation ni deuxième départ. Le rival peut avoir une trajectoire visuelle anticipée, mais sans inventer un score contraire au résultat.
- Les réactions intermédiaires aux gestes (animation de jump, boost, brake) ne doivent pas compter deux fois le score ni produire deux validations de secteur.
- Conserver le modèle de **cinq secteurs**, les changements de voiture et les consignes de pilotage ; ne pas exiger de changer le moteur du Versus, de la Nuit sans fin ou du mode Automatique.
- Bien séparer **fin du mini-jeu**, **fin du secteur** et **fin de la course complète**, pour afficher l'arrivée au bon moment.
- En **mouvement réduit**, éviter les déplacements longs : indiquer la progression et l'arrivée par une animation minimale ou une transition statique compréhensible.
- Conserver les résultats lors d'un **changement d'onglet, rechargement, skip et retour** ; aucun double commit, saut de progression ni course bloquée.
- Synchroniser les sons de rapports, moteurs, freinage et verdict avec les gestes et le franchissement final (à coordonner avec [T-036](036-refonte-musiques-bruitages.md)).

## Critères d'acceptation

- [ ] Pendant le jeu de rythme **et** le passage de vitesses, les voitures avancent dans la **même scène** qui affiche ensuite leur résultat réel.
- [ ] Un geste réussi ou raté a un **effet perceptible et immédiat** sur la progression, sans résultat trompeur.
- [ ] **Aucun retour au départ et aucun second replay complet** des voitures après le dernier geste du secteur.
- [ ] À la fin du dernier secteur du duel, une arrivée claire clôt la course **avant le récapitulatif / les récompenses**.
- [ ] Le gagnant affiché et les scores correspondent exactement au moteur existant ; pas de double dépense de nitro ou de double comptage.
- [ ] Le tout fonctionne sur **320 et 390 px** avec gestes tactiles, au clavier, et en mouvement réduit.
- [ ] Aucun blocage après interruption de l'onglet, recharge d'une sauvegarde, raté ou appui répété.
- [ ] Comparaison visuelle **avant/après** montrant qu'il s'agit d'une seule course continue au lieu de deux animations.

**Livrable :** une course manuelle réellement animée de bout en bout, dans laquelle les gestes jouent sur la progression visible et la dernière action mène naturellement à l'arrivée.
