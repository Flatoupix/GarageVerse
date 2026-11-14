Voici l'analyse des **8 déséquilibres majeurs** identifiés à travers les règles, les données et le rapport de simulation, accompagnés de leurs correctifs chiffrés.

---

### 1. Hennessey Venom F5 (`venom`) : L'hypercar légendaire injouable
* **Problème :** Pire taux de victoire du jeu (**33,8 %**), indigne d'une carte légendaire à coût 10. Son coût maximal ne lui laisse que 2 points de préparation (`12 − coût`), et ses 4 points d'Endurance la condamnent à perdre tous les départages en cas d'égalité tout en la rendant très vulnérable à la surchauffe dès son second engagement.
* **Fichier :** `src/data/roster.json`
* **Cible :** `id: "venom"`
* **Champ :** `stats.end`
* **Modification :** Passer de `4` à `6` *(lui assure une meilleure autonomie et la fiabilise sur les égalités de score sans trahir son profil de monstre de vitesse)*.

---

### 2. Skyline de Brian (`brian`) : Surpuissance écrasante et sous-évaluée
* **Problème :** Taux de victoire le plus élevé du méta (**66,2 %**). Pour seulement 7 points de coût, elle combine 30 points de statistiques cumulées, 4 roues motrices (+1 Pluie), une aura culturelle (+1 la Nuit) et une signature dévastatrice (+2 Virage, +1 Nuit). Elle s'insère trop facilement en Ligue Chrome (plafond 15) et surclasse les supercars à coût 8 ou 9.
* **Fichier :** `src/data/roster.json`
* **Cible :** `id: "brian"`
* **Champ :** `cost`
* **Modification :** Passer de `7` à `8` *(resserre drastiquement la construction d'écurie en Ligue Chrome et aligne son coût sur sa rentabilité réelle)*.

---

### 3. Nissan Silvia S15 (`s15`) : Signature trop restrictive
* **Problème :** Deuxième pire taux de victoire du jeu (**34,4 %**). En propulsion (pénalisée sous la pluie), sa signature *Contrebraquage* exige une double condition stricte (Virage **ET** Nuit). Dès que la météo ou le secteur change, elle devient une carte sans capacité active, incapable de rentabiliser ses 4 points de coût.
* **Fichier :** `src/data/roster.json`
* **Cible :** `id: "s15"`
* **Champ :** `signature.effects[0].condition`
* **Modification :** Remplacer `"nuit"` par `null` (suppression de la condition météo) et ajuster la valeur `signature.effects[0].value` de `3` à `2` *(bonus inconditionnel de +2 en Virage, valorisant son ADN drift sans la paralyser hors des courses nocturnes)*.

---

### 4. Hummer H1 (`h1`) : Pic de puissance toxique et non interactif
* **Problème :** Avec un taux de victoire de **58,1 %** pour un coût de 4, sa signature octroie un disproportionné +4 sur Terre, qui se cumule avec le passif 4×4 (+1) pour un total de **+5 automatique**. Combiné à ses 10 en Endurance (3 utilisations sans surchauffe), il verrouille arbitrairement n'importe quelle manche sur terre.
* **Fichier :** `src/data/roster.json`
* **Cible :** `id: "h1"`
* **Champ :** `signature.effects[0].value`
* **Modification :** Passer de `4` à `2` *(garde son identité tout-terrain forte avec +3 effectif sur Terre, sans écraser les duels d'office)*.

---

### 5. Pièce « Fiabilité K9K » (`k9k`) : Rentabilité disproportionnée pour 1 point
* **Problème :** Pour seulement 1 point de préparation, cette pièce donne +2 en Endurance **ET** +1 secteur supplémentaire. C'est l'amélioration la plus rentable du garage : elle dope artificiellement les diesels (Clio et Logan trustent le haut du classement) et rend le moteur diesel strictement supérieur aux motorisations essence modestes.
* **Fichier :** `src/data/garage.json`
* **Cible :** `id: "k9k"`
* **Champ :** `cost`
* **Modification :** Passer de `1` à `2` *(équilibre le coût de potentiel par rapport à la puissance de l'effet d'endurance et de stamina)*.

---

### 6. Pièce « Gros turbo hybride » (`turbo-hybride`) : Malus trop punitif
* **Problème :** Pièce épique sous-exploitée car elle monopolise 3 points de potentiel (sur les 4 à 6 disponibles des sportives turbo) tout en infligeant un malus d'Endurance (`-1`). Ce malus peut faire chuter le nombre d'engagements (`1 + floor(END/4)`) et fait perdre systématiquement les égalités de points.
* **Fichier :** `src/data/garage.json`
* **Cible :** `id: "turbo-hybride"`
* **Champ :** `stats.end`
* **Modification :** Passer de `-1` à `0` *(retrait du malus d'endurance pour justifier son coût élevé de 3 de préparation)*.

---

### 7. Rivale Lola Minitel (`lola`) : Absence totale de défi (100 % de victoires joueur)
* **Problème :** Le joueur gagne à **100 %** contre Lola, y compris à **95,8 %** avec un deck de départ basique. Sa 2CV est laissée au Stage 0 sans aucune pièce équipée (`parts: []`), offrant un secteur gratuit à chaque course et rendant l'introduction du jeu plate et dénuée d'enjeu tactique.
* **Fichier :** `src/data/garage.json`
* **Cible :** `id: "lola"`
* **Champ :** `lineup[1].parts` (index de la 2CV `deuch`)
* **Modification :** Remplacer `[]` par `["pneus-route"]` *(avec un passage au Stage 1 de son véhicule pour l'amener à un taux de victoire joueur cible de ~85 %)*.

---

### 8. Rivale Roxy Turbo (`roxy`) : Rupture brutale de la courbe de progression
* **Problème :** Mur de difficulté incohérent en Ligue Chrome : le taux de victoire joueur s'effondre à **37,0 %** (alors que Kenji avant elle est à 77,7 % et Le Baron Chrome après elle est à 49,3 %). Son circuit force la condition Terre avec un poids de 4, favorisant de manière écrasante son trio rallye/4×4 ultra optimisé (Delta Stage 2, A110 Stage 2, H1).
* **Fichier :** `src/data/garage.json`
* **Cible :** `id: "roxy"`
* **Champ :** `circuit.conditions.terre`
* **Modification :** Passer de `4` à `2` *(lisse la rotation météo du circuit et rétablit une progression équilibrée au sein de la Ligue Chrome)*.
