# T-034 · Indexer la difficulté du pilotage manuel sur la progression des rivaux et des boss

- **Type :** Gameplay / équilibrage du pilotage manuel
- **Priorité :** P2
- **Statut :** À implémenter et playtester ; ne pas modifier les règles publiées sans validation
- **Signalement :** question du 18 novembre 2026 : « Est-ce que la difficulté et la vitesse du mode manuel est indexé avec la difficulté du perso ? » ; demande de cohérence entre les passages de vitesses et les virages
- **Tickets liés :** [T-026 · passage de vitesses](026-prototype-passage-vitesses-timing.md), [T-027 · virages gauche/droite](027-prototype-direction-virages.md), [T-028 · automatique / manuel](028-pilotage-automatique-ou-manuel.md)
- **Fichiers à examiner :** [`src/game/timing.ts`](../src/game/timing.ts), [`src/game/turn.ts`](../src/game/turn.ts), [`src/game/data.ts`](../src/game/data.ts), [`src/views/RaceView.vue`](../src/views/RaceView.vue), [`src/game/timing.check.cjs`](../src/game/timing.check.cjs), [`src/game/turn.check.cjs`](../src/game/turn.check.cjs), [`docs/meta.md`](../docs/meta.md)

## Constat dans le prototype actuel

Les deux mini-jeux **ne suivent pas aujourd'hui le même principe de difficulté** :

1. **Passage de vitesses** : `soloTimingWindow` calcule une difficulté à partir de la moyenne des statistiques préparées des trois voitures adverses pour le secteur (`rivalStat / STAT_CAP`). `timingWindow` la borne entre 0 et 1 et l'applique à la vitesse de l'aiguille (**montée raccourcie jusqu'à 12 %, plancher 800 ms**) et à la fenêtre verte (**jusqu'à −20 %**). Une aide propre à la voiture du joueur dépend de sa statistique, de son Stage et des pièces pertinentes (**plafond ×1,35**).
2. **Virages en rythme (gauche/droite)** : `turnSequence` calcule actuellement `hashTurn(rivalId) / 0xffffffff`, ce qui détermine les seuils Parfait/Bien/Accepté. **Le hash de l'identifiant ne représente pas la difficulté réelle** du rival. L'espacement des notes est fixe à **1 050 ms** et leur rythme ne progresse pas avec le niveau, même si les tolérances varient arbitrairement.
3. Les rivaux de campagne ont déjà **trois étapes : Essais (1), Qualifs (2), Finale (3)** dans `rivalSteps`. Les **ligues** et les **cinq paliers des séries spéciales** structurent aussi la progression. Il faut que la difficulté ressentie respecte ces progressions, sans confondre puissance de voiture et compétence du pilote.

**Objectif :** faire sentir un adversaire de plus en plus exigeant, sans qu'un personnage débutant puisse devenir arbitrairement plus dur au rythme qu'un boss, ou qu'une étape « Essais » soit plus sévère que sa propre Finale.

## Comportement attendu

- Définir une **source de difficulté commune**, numérique, stable et explicite (par exemple `pilotDifficulty` de 0 à 1) pour les deux mini-jeux, à partir de la **progression du rival / boss et de l'étape courante**. Utiliser, selon le plus petit changement robuste, un profil dans les données de `Rival` ou une fonction centrale qui déduit ce niveau des données existantes. Éviter de faire du hash d'identifiant ou des statistiques brutes l'unique source de difficulté.
- Garantir une progression **non décroissante** pour **Essais → Qualifs → Finale** d'un même personnage ; faire monter la difficulté entre **ligues** et entre **paliers des séries spéciales**, avec un profil dédié pour les boss. Prévoir des exceptions explicites et justifiées si nécessaire.
- Conserver l'identité de chaque épreuve : un départ peut rester plus vif qu'une endurance, la ligne droite plus précise, les virages demander deux directions. Le coefficient de difficulté vient **moduler** le profil propre au secteur, pas effacer ces différences.
- **Vitesses** : modifier progressivement **durée de montée de l'aiguille**, **largeur de zone verte** (et éventuellement orange, après équilibrage) ; garder des limites inférieures de temps et de largeur pour la jouabilité tactile. Maintenir le décalage reproductible des fenêtres entre rapports.
- **Virages gauche/droite** : faire varier avec cette **même difficulté** les fenêtres Parfait/Bien/Accepté, ainsi que la **cadence des notes** et/ou leur vitesse d'approche. Conserver un temps d'annonce suffisant, des fenêtres sans chevauchement et des cibles compréhensibles. Le nombre de notes reste constant dans un premier temps pour isoler l'effet du niveau.
- **Progression des voitures** : continuer à valoriser la statistique pertinente, les Stages et les pièces mécaniques ; en virage, étudier un **élargissement plafonné de la tolérance à partir de la MAN et des pièces adaptées**, en distinguant ce bénéfice des bonus de score déjà appliqués. Aucune voiture ne doit rendre la réussite automatique.
- Garder les modificateurs de score de référence et le rôle des attributs de la voiture. Le barème de jugement `timingModifiers` / `turnModifiers` reste inchangé tant qu'un playtest n'a pas justifié une modification.
- Une même configuration (rival, étape, circuit, secteur, voiture, préparation, graine) produit toujours **les mêmes paramètres de difficulté et le même placement des fenêtres / notes**. La difficulté ne se recalcule pas arbitrairement en cours de geste.
- Le joueur doit percevoir la progression sans devoir deviner des chiffres cachés : éventuellement afficher un indice simple (« Accessible », « Technique », « Expert », « Boss ») lors du briefing, sans encombrer la scène.

### Proposition de profil initial à tester (non contractuelle)

| Progression | Rythme / vitesse | Tolérance |
| --- | --- | --- |
| Essais / adversaire débutant | Montée lente, notes espacées | Généreuse |
| Qualifs / adversaire intermédiaire | Montée modérée, cadence régulière | Normale |
| Finale / adversaire avancé | Montée rapide, notes rapprochées | Réduite |
| Derniers paliers / boss | Niveau élevé, rythmes exigeants mais lisibles | Réduite avec garde-fous |

Ces intitulés ne sont pas des valeurs finales : **calibrer une courbe mesurable**, compatible avec les profils de secteurs, l'équipement de départ et la progression des joueurs. Vérifier les personnages déjà présents et ne pas supposer que l'ordre alphabétique ou l'identifiant reflète leur classement.

## Architecture et périmètre

- Proposer une petite API pure et testable de détermination de la difficulté (ex. `manualDifficultyForRival(rival, contexte)`) **partagée** entre `soloTimingWindow` et `turnSequence`.
- Conserver le hash / générateur déterministe **uniquement pour la variété des sens gauche/droite et des positions de cibles**, pas pour attribuer la difficulté d'un personnage.
- Centraliser les bornes de temps, de largeur de fenêtre et d'espacement pour éviter les valeurs impossibles sur téléphone, notamment avec l'accessibilité et le mouvement réduit.
- Préserver le mode **Automatique**, les rencontres contre l'IA, les trois étapes, les séries spéciales, les réglages du mode manuel et les anciennes sauvegardes. **Ne pas modifier le moteur commun Versus/Supabase** ni attribuer un avantage serveur non prévu.
- Préciser le cas des adversaires générés ou non classés (Défi du jour, Nuit sans fin, autres épreuves) : profil par défaut explicite et progressif si ces modes utilisent les gestes manuels, sans valeur erratique.
- Vérifier le chemin de lancement de `RaceView.vue`, qui appelle actuellement `turnSequence(opponent.circuit.name, index, opponent.id)` : injecter la difficulté réelle du rival actif, et non une valeur recréée au hasard.

## Critères d'acceptation

- [ ] Le passage de vitesses **et** le jeu de rythme gauche/droite utilisent le **même indice de difficulté du rival actif**.
- [ ] À voiture et secteur équivalents, **Essais ≤ Qualifs ≤ Finale** pour la difficulté du même personnage (fenêtres qui ne s'élargissent pas arbitrairement et rythme qui ne ralentit pas).
- [ ] Les ligues et paliers de spéciales suivent une montée de difficulté cohérente, avec vérification explicite des boss / derniers paliers.
- [ ] La **durée de montée de l'aiguille**, la **largeur des zones** et la **cadence ou vitesse d'approche des notes de virage** réagissent à l'indice commun, sous des plafonds documentés.
- [ ] L'identifiant / le hash d'un rival **ne fixe plus ses seuils de difficulté** ; le hash reste permis pour des séquences reproductibles.
- [ ] La préparation du joueur continue d'améliorer la tolérance du passage de vitesses ; la possibilité de le faire pour les virages est évaluée avec un plafond et des tests d'équilibrage.
- [ ] Les épreuves débutantes restent lisibles et gagnables avec le garage initial, tandis que les boss sont exigeants sans fenêtres ingérables au doigt.
- [ ] Les positions et directions des cibles restent reproductibles, sans nouvelles fluctuations aléatoires cachées.
- [ ] Tests unitaires à ajouter / adapter dans `timing.check.cjs` et `turn.check.cjs` : monotonicité, cas extrêmes, bornes temporelles, répétabilité, difficulté par rival/étape et cohérence entre les deux mini-jeux.
- [ ] Playtest à **320 px et 390 px** sur mobile, avec **mouvement réduit**, clavier desktop, changements d'onglet et rechargements.
- [ ] Aucune régression du mode automatique, du système de score, du choix de voiture, des sauvegardes et du Versus.

## Livrable / validation

Une version de test du **pilotage manuel à difficulté progressive**, un tableau des paramètres réels obtenus pour tous les rivaux/étapes/paliers et un court bilan de playtest. Ajuster la courbe avant intégration en production. Le ticket concerne **l'équilibrage du pilotage expérimental**, pas l'ajout d'un nouveau mode de course.
