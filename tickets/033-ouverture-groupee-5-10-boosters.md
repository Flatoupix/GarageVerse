# T-033 · Ouverture groupée : révéler 5 ou 10 boosters en une seule action

- **Type :** Fonctionnalité / ergonomie des boosters
- **Priorité :** P2
- **Statut :** À implémenter dans une prochaine version de test ; pas encore livré
- **Demande :** retour joueur du 18 novembre 2026 : « Pour l'ouverture des boosters, il faudrait pouvoir révéler les 5 ou 10 boosters en même temps. »
- **Fichiers à examiner :** [`src/views/ShopView.vue`](../src/views/ShopView.vue), [`src/views/BoosterView.vue`](../src/views/BoosterView.vue), [`src/components/RevealStack.vue`](../src/components/RevealStack.vue), [`src/game/save.ts`](../src/game/save.ts), [`src/game/booster.check.cjs`](../src/game/booster.check.cjs)
- **Ticket lié :** [T-030, position fixe du bouton d'ouverture](030-bouton-ouverture-booster-position-fixe.md)

## 1. Problème et objectif

L'achat groupé existe déjà : dans `ShopView.vue`, les boutons **×5** et **×10** appellent `buyBoosters`. Le joueur achète plusieurs sachets, mais **seul le premier est préparé pour l'ouverture** ; les suivants deviennent des tickets, et l'écran d'ouverture propose ensuite **« Ouvrir le suivant »**. Le bouton **« Tout révéler »** ne révèle actuellement que **les cinq cartes d'un seul booster**.

Pouvoir **ouvrir et révéler les cinq ou dix boosters d'un seul coup** : une action pour un lot complet, soit **25 cartes (×5)** ou **50 cartes (×10)**. On ne parle pas d'ouvrir cinq ou dix *cartes*, mais bien cinq ou dix *sachets*.

Le joueur doit conserver la possibilité d'ouvrir **un booster à la fois** pour profiter du rituel tactile, des effets de rareté et de la découverte. L'ouverture groupée est un **raccourci facultatif**, pas un remplacement.

## 2. Parcours utilisateur proposé (mobile-first)

1. Le joueur achète **×5** ou **×10** boosters dans la boutique, ou dispose déjà d'au moins autant de tickets de ce booster.
2. L'écran d'ouverture présente clairement **« Ouvrir 1 booster »**, **« Révéler 5 boosters »** et/ou **« Révéler 10 boosters »**, selon le stock réellement disponible.
3. Une seule validation déclenche le **tirage / la révélation de tous les sachets du lot**, sans répéter les déchirures ni exiger d'appuyer 25 ou 50 fois.
4. Le résultat apparaît dans un **récapitulatif groupé**, avec une célébration courte et proportionnée aux meilleures cartes tirées. Une transition groupée facultative peut préserver l'effet « ouverture de packs ».
5. L'écran présente : **nombre de boosters ouverts, cartes obtenues, nouveautés, doublons, pièces, raretés et éventuelles légendaires**.
6. Le joueur peut **parcourir les cartes**, les trier/filtrer par rareté ou nouveauté et toucher une carte pour consulter son détail. Prévoir un regroupement par booster ou un accès à « Booster 1 / 5 … Booster 5 / 5 ».
7. Après consultation, revenir à la boutique ou au garage ; les **25 ou 50 cartes sont déjà attribuées** de façon fiable, sans clic de collecte supplémentaire.

### Présentation

- Ne pas tenter d'afficher **50 grandes cartes simultanément sur 390 px**. Utiliser un récapitulatif mobile avec grille compacte, sections repliables ou pagination ; des fiches détaillées restent accessibles individuellement.
- La vue doit mettre en valeur les **Légendaires / Épiques et nouvelles voitures** sans masquer les résultats courants ni le total réel.
- La sélection du lot est claire : boutons visibles uniquement si le stock le permet, avec **confirmation explicite du nombre** avant consommation des tickets, pour éviter un appui accidentel.
- Sur écran réduit, garder les commandes au même endroit et respecter les zones sûres. Respecter mouvement réduit, son désactivé et accessibilité (annonce lisible des résultats).

## 3. Tirages, économie et sauvegarde : invariants

**Point critique : les règles des boosters ne doivent pas changer.**

- Chaque booster du lot doit correspondre à **un tirage indépendant de cinq cartes**, en appliquant exactement les probabilités, les quotas de pièces (`maxParts`), les éditions et les règles de la boutique.
- Les **×5/×10 sont des boosters complets** ; aucune chance de rareté ne doit être modifiée, améliorée ou diminuée par l'ouverture groupée.
- Une ouverture groupée doit être équivalente à **5 ou 10 ouvertures individuelles successives** pour les crédits/tickets dépensés, les cartes et pièces obtenues, et leur quantité. Les doublons **entre boosters du même lot** doivent rester possibles ; la contrainte de variété interne à un booster est inchangée.
- Respecter les **lots déjà scellés** : le premier tirage enregistré (`sealedPulls`) ne doit jamais être recalculé ou remplacé ; les suivants doivent être tirés une seule fois puis persistés.
- Éviter toute double dépense, double attribution ou perte lors d'un double tap, rechargement, fermeture de l'onglet ou interruption pendant l'animation. Concevoir une **transaction locale idempotente / un état de lot persistant et reprenable**, avec identifiant et état des boosters résolus, puis reprise sur le récapitulatif après rechargement.
- Calculer **« Nouveau » / « Doublon »** par rapport à l'inventaire et à tous les tirages précédents du lot, **dans l'ordre d'ouverture**, afin qu'une voiture tirée deux fois ne soit pas présentée deux fois comme nouvelle.
- Préserver le déblocage des **éditions artistiques** : en lot, appliquer par défaut l'apparence actuelle à une voiture déjà possédée, enregistrer toutes les éditions obtenues et offrir une action explicite pour choisir ultérieurement celle à afficher. Ne pas perdre les choix antérieurs ni afficher arbitrairement un nouveau style.
- Conserver le fonctionnement existant de l'ouverture individuelle, y compris « Tout révéler » pour les cinq cartes d'un seul booster, les légendaires, le geste de déchirure et les sauvegardes antérieures.

**Périmètre V1 :** lots homogènes d'un même type de booster (celui acheté en ×5/×10 ou obtenu par tickets). Mélanger plusieurs types de booster dans un même lot pourra faire l'objet d'une évolution ultérieure, pas d'une exigence pour cette version.

## 4. Pistes techniques

- Séparer la **résolution / attribution d'un lot** de la couche Vue et des animations, sous forme de fonctions réutilisables et testables dans `src/game/save.ts` ou un module de domaine dédié.
- Reprendre `drawPulls`, `buyBoosters`, `tear` et `collect` sans créer une seconde logique parallèle aux règles de tirage. Aujourd'hui `Save` stocke `sealed`, `sealedPulls` et une seule `opening` : déterminer la meilleure évolution rétrocompatible du schéma.
- **Ne pas attendre l'animation pour sauvegarder le résultat** ; les animations doivent lire un résultat déjà persistant, pas déclencher plusieurs collectes.
- Déterminer si la sélection de ×5/×10 au moment de l'achat peut proposer immédiatement « Ouvrir tout » ou si le choix est présenté depuis l'écran d'ouverture. Dans tous les cas, ne pas acheter à nouveau des boosters déjà payés.
- Vérifier les performances de rendu de 50 cartes, éventuellement avec pagination ; éviter de lancer simultanément des dizaines d'animations lourdes.

## 5. Tests et critères d'acceptation

- [ ] Après un achat **×5**, un seul geste permet de révéler et recevoir **exactement 25 cartes**.
- [ ] Après un achat **×10**, un seul geste permet de révéler et recevoir **exactement 50 cartes**.
- [ ] Le même choix fonctionne avec un stock suffisant de **tickets déjà possédés**, sans second débit de crédits.
- [ ] **Achat groupé + ouverture normale unitaire** restent possibles : le joueur choisit son rythme.
- [ ] Les probabilités, les familles, les quotas de pièces, les éditions et les bonus légendaires restent conformes aux cinq cartes par booster.
- [ ] Un lot où plusieurs sachets contiennent la même voiture attribue le **bon nombre d'exemplaires** et les bonnes éditions, avec les mentions « Nouveau » cohérentes.
- [ ] Le **premier booster déjà scellé** conserve exactement son tirage ; aucun reroll à l'ouverture du lot.
- [ ] Une fermeture ou un rechargement en cours d'ouverture permet de **retrouver toutes les cartes du lot, sans doublon supplémentaire ni perte de crédits/tickets**.
- [ ] Un double appui rapide ou une reprise de sauvegarde ne collecte le lot qu'une seule fois.
- [ ] Le récapitulatif est utilisable à **320 / 390 px**, avec 25 et 50 cartes, sans défilement bloqué, surcharge excessive ni navigation perdue.
- [ ] Les résultats remarquables (nouvelle voiture, Épique, Légendaire) restent identifiables, consultables et correctement célébrés, avec respect du mouvement réduit.
- [ ] Les tests de l'ouverture individuelle et `src/game/booster.check.cjs` restent verts ; ajouter des tests automatisés dédiés aux lots ×5/×10, à la reprise et à l'idempotence.

**Livrable :** ouverture multiple jouable dans une prochaine version de test, comparée à l'ouverture unitaire, sans impact sur les taux de tirage ou l'économie.
