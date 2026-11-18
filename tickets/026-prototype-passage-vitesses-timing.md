# T-026 · Prototype de course : passage de vitesses au bon régime

- **Priorité :** P2 (prototype gameplay à évaluer sur mobile)
- **Statut :** Prototype V0 présent dans `dev` (mode expérimental désactivé par défaut, démo dans Réglages › Paramètres) ; **à playtester sur mobile** ; **ne remplace pas le système de course existant**
- **Origine :** idée de gameplay exprimée le 18 novembre 2026
- **Contexte technique :** [docs/meta.md](../docs/meta.md) §5 ; [src/game/rules.ts](../src/game/rules.ts) ; [src/views/RaceView.vue](../src/views/RaceView.vue) ; [src/components/SectorRun.vue](../src/components/SectorRun.vue)
- **Ticket lié :** [T-009, modes de duel alternatifs](009-modes-duel-alternatifs.md) (autre piste, indépendante)

## 1. Intention / ressenti

Tester un **nouveau système de résolution des secteurs**, plus actif et moins dépendant de la chance : au lieu d'attendre qu'un tirage fasse varier le score après le choix de la voiture, le joueur **accélère et passe la vitesse au bon moment**, grâce à un mini-jeu de timing.

Le plaisir recherché : voir l'aiguille monter, anticiper la bonne zone, réussir son passage de rapport et **sentir immédiatement l'effet de son pilotage sur le score**. Une meilleure voiture et une préparation mécanique plus poussée rendent l'exercice plus tolérant **sans supprimer l'importance de l'adresse**.

Il s'agit d'une **expérimentation A/B**, pas d'une décision de remplacer les règles officielles.

## 2. Fonctionnement du mini-jeu

- Afficher un **compte-tours / compteur à aiguille** clairement visible, avec une aiguille qui monte pendant l'accélération.
- Le joueur appuie au bon moment sur un **grand bouton tactile « Passer la vitesse »** (ou directement sur la zone de jeu, à tester) pour arrêter/valider le passage du rapport.
- Une fenêtre de timing est divisée visuellement, dans l'ordre, en **rouge → orange → vert → orange → rouge**. Le vert est l'objectif, les oranges sont acceptables mais moins rentables, les rouges sont des passages ratés.
- La **position de la fenêtre** sur le cadran n'est **pas fixe** : elle peut changer d'un passage ou secteur à l'autre. Toujours indiquer la cible assez tôt pour permettre l'anticipation ; pas de piège visuel imprévisible.
- La **vitesse de l'aiguille**, la largeur de la zone verte et la position de la fenêtre varient selon le type d'épreuve, le niveau du rival/boss et la difficulté.
- Chaque passage produit un retour immédiat : **Parfait / Bon / Moyen / Raté**, avec animation/son/vibration optionnels ; éviter les effets qui gênent la lecture du prochain passage.
- Tester **un passage par secteur** pour la V0, puis éventuellement plusieurs changements de rapport dans un même secteur si le rythme reste agréable. Ne pas imposer d'emblée 15 manipulations pour une course de cinq secteurs.

## 3. Influence du secteur et de la difficulté

Le jeu actuel propose les secteurs `depart`, `virage`, `ligne` et `endurance`, liés respectivement aux statistiques **ACC / MAN / VIT / END**.

- **Départ / drag :** montée rapide de l'aiguille, sensation de départ arrêté ; calibrer la fenêtre autour du bon régime.
- **Ligne droite / vitesse :** montée soutenue, passage précis à haut régime.
- **Virage / maniabilité :** conserver le timing de passage de vitesse, mais ajouter un **pilotage gauche/droite** pour négocier le sens du virage. La direction et le moment du braquage deviennent des gestes du joueur, distincts du régime moteur ; garder le dispositif simple et lisible sur téléphone.
- **Endurance :** davantage de constance et de maîtrise ; tester une vitesse moins agressive mais une fenêtre moins généreuse, ou des passages successifs.
- **Rivaux / boss :** difficulté progressivement plus exigeante (aiguille plus vive, fenêtre verte plus étroite ou déplacée), avec paramètres explicites et équilibrables. Les premiers adversaires servent d'apprentissage ; le dernier doit être exigeant mais lisible.

Les comportements ci-dessus sont des **pistes de réglage à tester**, pas des chiffres figés. La météo/terrain et les consignes déjà présents doivent conserver un sens dans la course.

## 3 bis. Pilotage gauche / droite dans les secteurs de virage

Dans une épreuve de type `virage`, le joueur doit aussi **gérer la direction** et pas uniquement passer un rapport : les virages peuvent être **à gauche ou à droite**.

- Montrer **le sens du prochain virage** suffisamment tôt (flèche, tracé ou courbe visible) et proposer deux grandes commandes tactiles **« Gauche »** et **« Droite »**, placées dans des zones adaptées au smartphone. Ne pas faire dépendre le résultat uniquement de la couleur de l'indicateur.
- Le joueur choisit la **bonne direction au bon moment** pour prendre sa courbe. Un braquage correct et bien synchronisé récompense la maîtrise ; une mauvaise direction ou un braquage trop tôt/tard entraîne une perte de performance lisible. Le sens du virage ne doit pas être deviné.
- Tester une V0 **séquentielle et accessible** : anticiper le sens du virage, valider le braquage, puis passer la vitesse au compte-tours ; comparer avec une variante plus dynamique si le prototype séquentiel manque de tension. Ne pas imposer deux gestes simultanés qui rendent le jeu injouable à une main.
- Définir pour la direction une **fenêtre de braquage** (ou un indicateur de trajectoire) dont la précision dépend de la difficulté, de l'adversaire et de la statistique **MAN**. Une meilleure maniabilité et les pièces adaptées peuvent faciliter cette fenêtre, sans rendre le bon sens de direction automatique.
- Combiner le résultat du braquage et celui du passage de rapport dans un **modificateur plafonné**, documenté et déterministe : éviter de doubler systématiquement les pénalités de timing. Afficher les deux contributions dans le bilan du secteur (« trajectoire » + « passage de vitesse »).
- Pour les suites de virages, explorer plusieurs directions dans le même secteur seulement après validation de la V0 : **gauche → droite** ou **droite → gauche** peut créer de la variété, sans transformer cinq secteurs en une séquence trop longue.
- Prévoir un affichage et un contrôle équivalents au clavier pour ordinateur, une marge tactile suffisante, une signalisation non limitée aux couleurs et un comportement adapté au mouvement réduit.

**But du test :** vérifier que l'on ressent la conduite et la spécificité de la maniabilité, sans perdre l'accessibilité mobile-first ni les bénéfices de la collection et des améliorations automobiles.

## 4. Calcul du score : de l'aléatoire vers l'adresse

**Conserver le score technique calculé par les règles actuelles** : statistique de secteur après préparation, terrain/météo, capacité de la carte, pièces, consigne, nitro, surchauffe, etc. C'est le **score de référence**.

Aujourd'hui, `src/game/rules.ts` ajoute ensuite la « forme du jour » : **±12 % du score** (au moins ±1), avec parfois un « secteur parfait » ou un incident. Le prototype doit **remplacer cette variation de hasard pour le joueur** par un **modificateur lisible lié au timing**.

**Barème de départ suggéré, à équilibrer :**

| Zone de passage | Résultat proposé | Score avec une référence de 16 |
|---|---:|---:|
| Rouge (des deux côtés) | −2 | 14 |
| Orange (des deux côtés) | −1 | 15 |
| Vert | 0 | 16 |
| Centre du vert / passage parfait | +1 (ou bonus à calibrer) | 17 |

- Le **vert récompense au minimum le score théorique de la voiture** ; son centre peut donner un léger bonus.
- Le **rouge pénalise** le résultat, sans rendre inutiles les caractéristiques de la voiture.
- Garder les valeurs paramétrables pour tester si un barème fixe (−2/−1/0/+1) reste pertinent pour les petites et grosses statistiques. Ne **pas** remplacer les bonus mécaniques par le mini-jeu.
- Si plusieurs changements de rapport ont lieu dans un secteur, définir une **agrégation bornée** (moyenne, meilleur passage, etc.) ; éviter de cumuler les −2/+1 sans limite.
- Le résultat doit toujours afficher **le score de référence, la zone atteinte, son bonus/malus et le total**, afin que le joueur comprenne pourquoi il gagne ou perd.
- Le mode expérimental doit pouvoir être comparé au système de hasard existant, **sans changer les récompenses, les adversaires ou les règles de victoire** tant qu'il n'est pas validé.

## 5. Progression automobile = fenêtre de réussite élargie

La collection et la préparation doivent avoir un **effet tangible sur la maniabilité du timing** :

- **Meilleure voiture / statistique pertinente plus élevée :** possibilité d'une zone verte légèrement plus large ou d'une montée d'aiguille plus facile à lire.
- **Stages et améliorations d'atelier :** augmentation mesurée de la tolérance, liée à la préparation.
- **Pièces mécaniques pertinentes :** possibilité d'agrandir la fenêtre de réussite, de stabiliser l'aiguille ou d'atténuer une pénalité selon le type de pièce. Distinguer clairement les bonus déjà apportés au score de leur éventuel effet sur le mini-jeu.
- **Secteurs et boss difficiles :** fenêtre plus étroite et/ou aiguille plus rapide, mais **les améliorations restent utiles**.

Ne pas attribuer arbitrairement cet effet à toutes les pièces. Proposer un modèle de coefficients simple, configurable et plafonné ; documenter quels attributs et quelles pièces le pilotent. Éviter une progression où une voiture puissante rend le vert quasi automatique, ou une voiture courante rend la réussite impossible.

## 6. Prototypage technique et compatibilité

- Faire une **version de test activable/désactivable** (flag de fonctionnalité ou route de démonstration), afin de passer du modèle actuel au modèle « timing » à volonté.
- Garder les **cinq secteurs**, le choix des trois voitures, la consigne, la nitro, les pièces et les animations de course existants.
- **Ne pas casser le Versus V1 ni son moteur déterministe partagé avec Supabase** : limiter la V0 aux courses solo contre l'IA et aux démonstrations locales. Toute extension au PvP exige un design séparé avec validation serveur du timing et mesures anti-triche.
- Isoler le calcul du **modificateur de timing** dans une fonction testable indépendamment du composant de compteur ; pas de logique de score uniquement enfouie dans l'UI.
- Si la position des fenêtres varie, elle doit être **reproductible à partir des paramètres de course / d'une graine connue**, sans influer sur la réussite indépendamment du geste. Un tirage caché ne doit pas réintroduire la « chance » que cette expérimentation veut remplacer.
- Prévoir pause/reprise, changement d'onglet et rechargement : pas de score doublé, de rapport joué deux fois ou de sauvegarde corrompue.
- Sur mobile, priorité au **tactile à une main**, à la fluidité et à la visibilité du bouton ; prise en charge clavier sur ordinateur ; éviter la dépendance au taux de rafraîchissement (temps mesuré, pas « nombre de frames »).
- Accessibilité : distinguer les zones également par texte/motifs (pas seulement par couleur), retour lisible, option de réduction des animations et comportement alternatif à arbitrer si l'action rapide n'est pas accessible.

## 7. Plan de test / mesures

Comparer sur les **mêmes voitures et mêmes adversaires** une version actuelle (hasard) et le prototype (timing).

1. Vérifier le ressenti sur Android à **320 et 390 px**, puis sur ordinateur.
2. Tester les secteurs départ/drag, virage, ligne droite et endurance avec les mêmes configurations ; pour les virages, comparer **gauche/droite**, bonne/mauvaise direction, timing du braquage et enchaînement avec le changement de vitesse.
3. Tester plusieurs difficultés et au moins un boss.
4. Mesurer les taux de **rouge / orange / vert / parfait**, la courbe d'apprentissage, les ratés involontaires, la durée d'une course et la frustration éventuelle.
5. Comparer voiture de base, voiture haut de gamme et voiture améliorée avec pièces : progression perceptible, mais pas de victoire automatique.
6. Vérifier que le joueur continue de **réfléchir au choix des voitures**, au terrain, aux capacités, à la nitro et à la gestion d'endurance, plutôt que d'ignorer la méta.
7. Tester la répétitivité après plusieurs courses consécutives ; ajuster le nombre de passages et leur durée.

## Critères d'acceptation du prototype

- [ ] Un écran/contrôle de changement de rapport à aiguille fonctionne au doigt sur mobile.
- [ ] La fenêtre **rouge–orange–vert–orange–rouge** est lisible, et sa position peut varier d'une épreuve à l'autre.
- [ ] Les vitesses et largeurs de zones diffèrent selon secteur, difficulté et boss.
- [ ] Dans les épreuves **Virage**, les commandes **Gauche** et **Droite** permettent de choisir le bon sens et de gérer le braquage au bon moment ; leur résultat a un effet mesurable et compréhensible sur le score.
- [ ] Les virages gauche et droite, avec des difficultés variables, restent jouables sur **320 et 390 px** ; le joueur peut enchaîner braquage et changement de rapport sans geste simultané imposé.
- [ ] La statistique MAN et les pièces adaptées améliorent de façon bornée la tolérance du braquage ; une direction incorrecte reste pénalisée.
- [ ] Un appui produit un résultat immédiat déterministe : rouge −2, orange −1, vert score de base, centre vert bonus configurable (barème initial).
- [ ] Les statistiques de secteur, la météo, les pièces, les capacités, la consigne et la nitro continuent de déterminer le score de référence.
- [ ] Les meilleures voitures et les améliorations rendent la fenêtre de réussite plus accessible, dans des limites documentées.
- [ ] Le joueur voit le détail **base + timing = final**, sans confusion avec la chance de la version actuelle.
- [ ] La version de test est **réversible** ; aucune modification du Versus ni de son contrat serveur.
- [ ] Les courses, les sauvegardes et les tests existants restent fonctionnels.
- [ ] Un court bilan comparatif « hasard vs timing » (plaisir, lisibilité, stratégie, difficulté, rétention/rejouabilité) précède toute décision de généralisation.

## Décisions à prendre après playtest (non bloquantes pour la V0)

- Un seul passage par secteur ou plusieurs changements de vitesses ?
- Virage : braquage ponctuel avec deux boutons, appui maintenu, ou autre interaction tactile ? Faut-il des virages gauche/droite successifs dans un même secteur après validation de la V0 ?
- Bonus du centre vert : +1, +2 ou proportionnel au score ?
- Quelle part de la variation aléatoire conserver éventuellement (conditions météo, accidents), si l'on veut garder des imprévus sans pénaliser le bon timing ?
- Quelles pièces et caractéristiques étendent la fenêtre de réussite, et jusqu'à quel plafond ?
- Faut-il proposer durablement **deux modes de résolution** ou faire évoluer le mode principal ?

**Livrable attendu :** une branche de prototype jouable sur mobile, un réglage pour comparer les deux modes et des observations de playtest ; **ne pas remplacer le système actuellement publié sans décision explicite**.
