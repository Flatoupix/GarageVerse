# GarageVerse · Méta « Neon Drive » v0.2.0

Ce document arbitre les questions laissées ouvertes par la bible (§3, §4 et §9) pour la version jouable. Les valeurs vivent dans `src/data/roster.json` et `src/data/garage.json`, les règles dans `src/game/rules.ts`. La simulation `node pipeline/balance.mjs` vérifie les ordres de grandeur.

## 1. Principe directeur

**Une voiture modeste se prépare, une légende se choisit.** Chaque voiture a un **coût d’écurie** de 1 à 10 et un **potentiel de préparation** qui vaut `12 − coût`, au minimum 2, plus 1 par Stage. Une Clio III coûte 2 et accepte 10 points de pièces. Une Venom F5 coûte 10 et n’en accepte que 2. Les ligues plafonnent le coût total des trois voitures engagées. L’hypercar domine les lignes droites, la citadine préparée tient les secteurs longs, la ville et la pluie.

## 2. Les quatre dimensions de la bible

| Dimension | Traduction en jeu |
| --- | --- |
| Rareté | Courante, Rare, Épique, Légendaire. Elle règle la fréquence en booster et le cadre de la carte (gris bleu, bleu, rose, or à reflet par paliers). |
| Puissance | Quatre scores de base sur 10 (ACC, VIT, MAN, END), plafonnés à 12 après préparation, et le coût d’écurie. |
| Aura | Les éditions culturelles portent leurs étiquettes (Cinéma, Série, Nostalgie, Tuning…). Elles gagnent +1 la Nuit. Certaines capacités comptent les alliés qui partagent une étiquette. |
| Édition artistique | Synthwave, photo, gouache et rallye argentique. Classic et Pixel Art pour certaines cartes. Les éditions d’une voiture partagent les mêmes statistiques. |

## 3. Cartes

**Voiture (100).** Numéro de collection, version, coût, quatre scores, transmission, motorisation, catégories, capacité signature et fiche réelle à vérifier. Les 32 cartes candidates de la bible sont reprises, avec 18 voitures de la liste des futures cartes : Abarth 500, Dacia Logan, Civic Type R EK9, MX-5 NA, M3 E46, Delta HF Integrale, Lancer Evo VIII, Alpine A110, NSX, Tesla Model S Plaid, Mustang Shelby GT500, Challenger Demon 170, RUF CTR Yellowbird, Carrera GT, Zonda R, Agera R, Veyron et Hummer H1.

**Mécanique (24).** Huit familles, une pièce par famille et par voiture : pneumatiques, suspension, freinage, transmission, suralimentation, gestion moteur, châssis et spécial. Chaque pièce a un coût de préparation de 1 à 3, des bonus de scores ou des effets conditionnels, et une compatibilité explicite. Exemples : *Kit angle drift* (propulsion uniquement), *Compresseur volumétrique* (V8, V10 ou V12), *Gros turbo hybride* (déjà turbo), *Pack batterie* (électrique), *Fiabilité K9K* (diesel) et *Éco-Croisière* (citadine, diesel ou berline). Les deux dernières reprennent les pistes de capacités de la bible.

**Évolution.** La chaîne Lotus `Elise S1 → 111S → Sport 190` se débloque au garage : la version de base au Stage 3, plus des crédits. Les éditions culturelles (Skyline de Brian, KITT, DeLorean temporelle, Choupette, Esprit de James Bond) sortent des boosters, surtout d’After Hours, et renvoient vers leur carte de base.

## 4. Garage et progression

| Action | Effet |
| --- | --- |
| Amélioration automatique | Prépare la voiture en un toucher après avoir détaillé les étapes prévues (pièces libres compatibles en stock, niveaux d’atelier, passage de Stage) et l’aperçu des statistiques avant/après. |
| Atelier · niveau 1 puis niveau 2 | 10 puis 15 crédits par niveau. Chaque niveau ajoute 1 point à la statistique du groupe choisi, dans la limite de 12. |
| Monter une carte Mécanique | Le niveau 2 du groupe ouvre le montage. La pièce occupe un exemplaire en stock et le retrait le libère. |
| Stage 1 · 80 crédits | +1 potentiel |
| Stage 2 · 200 crédits et 1 doublon | +1 potentiel, +1 à la meilleure statistique d’origine |
| Stage 3 · 450 crédits et 2 doublons | +1 potentiel, débloque les évolutions |
| Débloquer / changer un style | Bascule gratuitement entre les éditions déjà possédées ou débloque un style artistique disponible (Synthwave, Pixel 16 bits, Classic, Photo, Gouache, Rallye argentique…) contre 40, 75, 120 ou 200 crédits selon la rareté. |
| Vendre une voiture | Retire tous ses exemplaires de la collection et libère ses pièces. Prix : 2 × progression.scrap[rareté] + 10 × Stage + ⌊crédits d’atelier dépensés / 2⌋ + progression.scrap[rareté] × (exemplaires − 1). Refus si engagée dans une écurie (défi du jour compris), dans une course en cours, ou si le garage passerait sous trois voitures différentes. Les évolutions peuvent aussi être vendues. |
| Recycler un doublon | 10, 30, 80 ou 200 crédits selon la rareté. Moitié prix pour une pièce libre. |

Les doublons alimentent la progression, comme le demande la bible. Le garage de départ contient la Clio III, la Twingo I et la Panda 4×4, trois pièces, 300 crédits et deux tickets Neon Drive.

**Écussons d’amélioration sur la carte.** Sur le flanc gauche de l’illustration, la carte d’une voiture possédée affiche quatre petits écussons en colonne (un par groupe d’atelier, dans l’ordre des statistiques) : éteint d’origine, à moitié allumé au niveau 1, pleinement allumé au niveau 2. Deux voyants signalent les pièces montées, colorés selon leur rareté. Les styles communs à tous les thèmes vivent dans `src/themes/shared.css`.

Le garage propose une recherche, un filtre par rareté et par catégorie, un tri multi-critères (collection, rareté, puissance totale, niveau d’amélioration, coût d’écurie, statistiques, doublons, année, nom) et un sélecteur du nombre de voitures affichées par ligne (`Auto`, `1` à `6`). L’atelier associe les pneus et la suspension à la maniabilité, la transmission et le nitro à l’accélération, le moteur et le turbo à la vitesse, et les freins et le châssis à l’endurance.

## 5. Course en secteurs

C’est la piste « épreuve en secteurs » de la bible, enrichie de choix simultanés.

1. **Écurie.** Trois voitures dont le coût total respecte le plafond de la ligue : Néon 9, Chrome 15, Overdrive 22.
2. **Circuit.** Cinq secteurs connus d’avance : Départ (ACC), Virages (MAN), Ligne droite (VIT) et Endurance (END). La condition (Sec, Pluie, Nuit, Terre, Ville) n’est annoncée que pour le secteur en cours et le suivant.
3. **Engagement.** À chaque secteur, chaque pilote engage une voiture en secret et peut brûler une charge de **Nitro** (+2, deux charges par course). Une voiture court `1 + ⌊END/4⌋` secteurs, hors bonus. Au-delà, elle **surchauffe** (−3).
4. **Consigne de pilotage.** Avec la voiture, chaque pilote choisit une consigne (`stances`, `src/game/rules.ts`). **Attaque** : +2, deux secteurs d’endurance brûlés, risque d’incident doublé ; il faut au moins deux secteurs restants. **Normal** : un secteur brûlé. **Gestion** : −2, aucun secteur brûlé, risque d’incident divisé par deux. La Gestion vaut −2 et non −1 pour qu’une voiture à faible Endurance ne puisse pas courir toute la course presque sans malus.
5. **Résolution.** Score = statistique préparée + modificateurs de terrain + capacités et pièces + consigne + Nitro. En cas d’égalité, l’Endurance départage. La course se joue au meilleur des cinq secteurs.
6. **Part de hasard.** Comme les dégâts d’un jeu de combat au tour par tour, chaque voiture fait de 88 à 112 % de son score, au moins ±1 (« Forme du jour »). Une fois sur seize, elle signe un « Secteur parfait » (environ ×1,5, au moins +2). Une fois sur vingt-quatre, un incident lui coûte environ 40 % (au moins 2 points) : faux départ, tête-à-queue, aspiration ratée, crevaison ou aquaplaning. La pluie et la terre augmentent ce risque de moitié, la surchauffe le double. Le joueur voit la fourchette de score avant d’engager une voiture (`luckRange`, `src/game/rules.ts`).

**Mise en scène d’un secteur.** Une mini-course (`src/components/SectorRun.vue`) joue le détail de score ligne par ligne : chaque bonus fait avancer la voiture, chaque malus la freine, la nitro la pousse et un incident la fait partir en tête-à-queue. Un décor en pixel art défile au-dessus de la piste selon la condition (`trackBackdrop`, `src/game/art.ts`) : en attendant les cinq décors dédiés (`yarn art --set anim --kind tracks`, fichiers `track-<condition>-bg`), la course emprunte ceux des légendaires animées. Une voiture qui possède un détourage de profil (`carSprite`, fichiers `<id>-car`) roule sans cadre sur sa voie ; les autres montrent la vignette de leur carte en attendant `yarn art --set anim --kind sprites`. Un toucher passe l’animation, le mouvement réduit la saute. À scores égaux, le verdict indique l’Endurance des deux voitures qui a départagé. La nitro et le bouton « Engager » restent collés au bas de l’écran.

| Terrain | Modificateurs communs |
| --- | --- |
| Pluie | Intégrale +1, propulsion −1 |
| Terre | 4×4 et rallye +1, supercar et hypercar −2 |
| Ville | Citadine +1, hypercar et muscle −1 |
| Nuit | Éditions culturelles +1 |

**Lire le rival.** Chaque voiture adverse affiche sa fourchette de score sur le secteur en cours, hors nitro, comme le rival voit celles du joueur. L’arrivée résume les cinq secteurs : voitures engagées, scores et vainqueur.

Le joueur doit pouvoir expliquer son choix : le panneau de résultat détaille chaque bonus. **Aide rapide** (`src/game/help.ts`) : les termes soulignés en pointillé (statistiques, secteurs, météo, lignes du détail de score, nitro, Stage…) ouvrent une bulle d’explication ; le bouton « ? » de l’en-tête ouvre le lexique complet. Avant chaque secteur, une consigne rappelle le but et la statistique qui compte. Il peut se relancer après un mauvais départ grâce aux capacités « retour en force » et à la Nitro gardée pour la fin. Une carte commune garde un usage : une Twingo sous la pluie en ville vaut mieux qu’une hypercar.

**Rivaux.** Six rivaux en trois ligues, chacun avec un circuit et une météo typés : Lola Minitel, DJ Cassette, Kenji Vapor, Roxy Turbo, Le Baron Chrome et Nyx. La première victoire contre un rival rapporte un ticket du booster de sa ligue. Une victoire parfaite signifie que tu as gagné tous les secteurs : les crédits de la ligue sont doublés et tu reçois un ticket supplémentaire (neon → neon, chrome → night, overdrive → overdrive), cumulable avec celui de première victoire. Le record conserve cet exploit et une étoile ★ apparaît sur le rival, nommée « Victoire parfaite obtenue » pour les lecteurs d’écran. L’arrivée célèbre « Victoire parfaite » avec le son legend et des effets renforcés, désactivés en mouvement réduit. L’IA voit les mêmes informations que le joueur.

Le briefing affiche les statistiques mobilisées et la meilleure voiture de l’écurie pour chaque secteur selon un score moyen estimé. Lola roule d’origine et en pilotage simple (champ `simple` : toujours en Normal), pour que le joueur découvre les consignes avec un avantage ; les rivaux suivants attaquent et gèrent, et montent aussi leurs groupes de statistiques à l’atelier (champ `upgrades` des écuries). Mesures de la simulation (`node pipeline/balance.mjs`) depuis l’ajout des consignes : garage de départ d’origine 78 % contre Lola et 64 % contre Cassette, 87 % et 69 % avec une amélioration par voiture ; contre des écuries Stage 1 de leur ligue, Kenji 77 %, Roxy 69 %, le Baron 62 % et Nyx 61 %. Les cibles d’avant les consignes étaient 70 et 57 %, 83 et 72 %, puis 75, 71, 56 et 55 %.

## 6. Boosters et économie

| Booster | Prix | Spécificité |
| --- | --- | --- |
| Neon Drive | 150 | Majorité de voitures courantes, dernière voiture au moins Rare |
| After Hours | 250 | Pondération ×4 sur Cinéma, Série, Tuning et Drift, dernière voiture au moins Rare |
| Overdrive | 400 | Pondération ×3 sur hypercars, supercars et records |

Chaque booster contient cinq cartes, dont au plus une pièce. Le jeu détermine le type puis la rareté de chaque carte et choisit des voitures différentes dans un même pack quand le tirage le permet. Les taux vivent dans `garage.json`. Le lot est tiré et sauvegardé au moment de la déchirure. Un rechargement retrouve le même lot, et les cartes rejoignent le garage dès le récapitulatif, une seule fois.

## 7. Direction artistique et thèmes d’interface

- **Thèmes au choix.** Réglages › Thème, enregistré dans la sauvegarde (`preferences.theme`). Synthwave (style d’origine, par défaut, `src/themes/neon.css`), Rétro pixel (`src/themes/base.css`), puis Sobre, Sport auto et Carnet de garage, qui ajoutent leurs variables et ornements à la base (`src/themes/<id>.css`). Trois thèmes se débloquent en jouant (`unlock` dans `src/game/theme.ts`, conditions qui ne régressent pas, annonce par notification) : Borne d’arcade après 10 victoires, Console 16 bits à 25 voitures, Atelier PC 1991 avec une Légendaire. La base règle rayon (`--radius`), relief (`--lift`), rythme des animations (`--ease`) et échelle des titres (`--dz`) par variables. Seuls les menus changent : les cartes gardent leurs éditions. En Synthwave, l’accueil, les sachets, les rivaux et les pièces reprennent leurs illustrations d’origine ; les autres thèmes montrent le pixel art. Les effets (`src/game/fx.ts`) suivent le thème : couleurs propres, particules carrées en Rétro pixel, traits lumineux ailleurs.

Le thème Rétro pixel suit les règles ci-dessous.

- **Palette Endesga 32.** Variables de `:root` : nuit `--night` #181425, fond `--background` #262b44, panneau `--panel` #3a4466, gris bleu `--slate` #5a6988, crème `--text` #ead4aa, sable `--sand` #e4a672, brun `--brown` #b86f50, rouge `--red` #e43b44, orange `--orange` #f77622, jaune `--yellow` #feae34, vert `--green` #63c74d, bleu `--blue` #0099db, bleu clair `--light-blue` #2ce8f5, prune `--plum` #68386c, rose `--rose` #b55088, contour `--outline` #0b0a12. Texte crème sur les surfaces sombres ; texte contour sur les boutons jaunes.
- **Typographies.** Press Start 2P pour les titres, chiffres et étiquettes courtes, à taille modeste ; Pixelify Sans pour le texte courant, au moins 15 px.
- **Menus de console et borne de course.** Damier discret immobile, contours pleins de 2 à 4 px, coins carrés, ombres pleines décalées sans flou. Les boutons descendent au toucher, avec une ombre réduite et un contour de focus clavier jaune.
- **Cartes.** Cadres Courante gris bleu, Rare bleu, Épique rose, Légendaire or avec reflet animé par `steps()`. Coût en pièce pixel et statistiques en blocs segmentés.
- **Illustrations.** Chaque carte a une édition par défaut en pixel art 16 bits, générée en basse définition (`node pipeline/art.mjs --set pixel`, fichiers `src/assets/pixel/<type>/<id>.px.webp`) et agrandie sans lissage. Les illustrations précédentes restent des éditions à collectionner : synthwave pour les cartes 1 à 50, photo, gouache et rallye argentique pour les voitures de départ, et un style propre à chaque carte 51 à 102 (champ `look` du roster : affiche, rallye argentique, bande dessinée, anime, magazine, aquarelle, pulp ou synthwave, avec son décor dans `setting`). Une voiture déjà possédée reçoit l’édition pixel au chargement sans perdre son apparence choisie.
- **Légendaires animées.** En pixel art, une légendaire roule : un décor généré qui boucle (dupliqué en miroir) défile par paliers derrière la voiture vue de profil, détourée d’un fond magenta, avec des effets en blocs propres à la carte (champ `anim` du roster : vitesse, flammes, phares, scanner de KITT, étincelles, poussière, fumée, turbine, T-rex poursuivant). Les calques sortent de `node pipeline/art.mjs --set anim`. Tant qu’un calque manque, la carte garde son illustration fixe.
- **Retours de jeu.** Sons et logique inchangés ; étincelles et confettis carrés à coordonnées entières, traits de vitesse pixel et carrés qui s’agrandissent à la place des anneaux. Flash et secousse conservés dans `src/game/fx.ts`. Animations d’entrée et de révélation par paliers.
- **Mouvement réduit.** La préférence du jeu et celle du système coupent animations, reflet, particules, flash et secousse sans perte d’information.

## 8. Production automatisée

| Commande | Rôle |
| --- | --- |
| `node pipeline/art.mjs` | Génère les illustrations manquantes. Codex d’abord, Antigravity en relais si Codex atteint sa limite. Recadrage et conversion WebP. |
| `node pipeline/art.mjs --review` | Antigravity relit chaque image (fidélité du modèle, absence de texte, cohérence de style) dans `pipeline/art-review.json`. |
| `node pipeline/art.mjs --redo` | Régénère les images refusées, avec la correction demandée ajoutée au prompt. |
| `node pipeline/balance.mjs [--review]` | Simulation d’équilibrage, puis avis chiffré d’Antigravity dans `pipeline/balance-review.md`. |

Ajouter une voiture consiste à ajouter une entrée dans `roster.json` puis à lancer `node pipeline/art.mjs`. La carte, le garage, les boosters et la course la prennent en compte sans autre modification.

## 9. Ouvert après les premiers essais

Le multijoueur, le paiement et la PWA restent hors périmètre. Les valeurs réelles des fiches et les droits (marques, œuvres) doivent être vérifiés avant toute diffusion. Il reste aussi à tester l’équilibrage de la Ligue Overdrive avec de vraies collections plutôt qu’avec la simulation.

## Boucle quotidienne

L’accueil propose un défi du jour et un ticket Neon Drive gratuit. Le tirage utilise
la date locale AAAA-MM-JJ et un générateur déterministe indépendant : circuit de
cinq secteurs, météo et adversaire généré restent identiques pour tous ce jour-là.
Les six rivaux et leur progression restent inchangés.

La contrainte choisit un plafond de coût réduit, au moins une voiture d’une
catégorie donnée ou au moins une voiture d’une rareté donnée. Si aucun trio du
garage du joueur ne peut la respecter, un plafond de coût de 6 la remplace pour lui. Une écurie valide
est préremplie depuis les voitures possédées ; toute sélection invalide indique
la raison sur le bouton désactivé. Le défi réutilise les duels de secteur et
l’arrivée des courses habituelles.

La première victoire rapporte 180 crédits, ou 360 crédits si tu gagnes tous les secteurs (victoire parfaite). Le défi ne donne pas de ticket de ligue. Rejouer reste possible sans nouveau
gain. La série augmente après une victoire le lendemain de la précédente ; un
jour manqué l’interrompt. Le booster quotidien ajoute exactement un ticket, puis
l’accueil affiche « Reviens demain ». La date, la réussite, la récupération, la
série et la dernière victoire sont conservées dans garageverse:v2, avec des valeurs
par défaut pour les anciennes sauvegardes. Au changement de date, réussite et
récupération sont réinitialisées ; une course de la veille ne donne plus de gain.

Les contraintes de catégorie et de rareté conservent le plafond Néon de 9 ;
le plafond réduit est tiré entre 7 et 8. La jauge indique toujours le plafond
réel du défi. L’écurie quotidienne est indépendante de l’écurie des rivaux et
est préremplie à chaque ouverture. Si aucun trio possédé n’est admissible, le
lancement reste désactivé avec sa raison, sans effacer l’écurie habituelle.
La météo affichée sur l’accueil correspond aux conditions des cinq secteurs.
Rejouer le défi reproduit ces conditions, tandis que les choix de l’adversaire
pendant les secteurs continuent d’utiliser le hasard habituel du moteur.

`node pipeline/check-daily.cjs` vérifie le tirage sur 365 dates, les plafonds, l’écurie indépendante et le booster unique.

### Apparence des éditions au tirage

La fiche voiture liste les éditions possédées en lecture seule. Au tirage d’une voiture déjà possédée dans une autre édition, tu peux garder l’apparence actuelle (choix par défaut) ou afficher cette édition. Ce choix est sauvegardé immédiatement, repris au récapitulatif, dans le garage et en course, et conservé au rechargement. Une nouvelle voiture prend l’édition tirée. Un doublon de l’édition affichée indique « Doublon : +1 exemplaire » sans choix. Chaque tirage ajoute son édition et son exemplaire au récapitulatif, une seule fois ; les choix n’empêchent ni la carte suivante ni « Tout révéler ». Les cinq cartes sont toujours attribuées, et les apparences suivent l’ordre des choix si une voiture revient dans le même sachet.

### Le mécano
Une sauvegarde neuve reçoit un tutoriel en 12 étapes, dans l’interface existante. Les actions font aussi avancer les bulles, sans les valider. « Passer le tutoriel » ferme le parcours ; « Revoir le tutoriel » dans les Réglages le relance sans changer la partie. La progression est sauvegardée. Après le parcours, des bulles uniques expliquent la nitro, la surchauffe, le défi du jour et la victoire parfaite.


## Séries de collection

L’onglet Garage propose Voitures, Mécaniques et Séries. Sept ensembles définis dans
`src/data/garage.json` donnent des objectifs de trois à six voitures. « Premiers tours
de roue » réunit exactement la Clio III, la Twingo I et la Panda 4×4 du départ.
Chaque série montre sa progression, ses voitures possédées dans leur édition affichée
et les silhouettes nommées des voitures manquantes. Toutes ouvrent leur fiche.

Posséder toutes les voitures permet de récupérer une seule fois les crédits indiqués,
et parfois un ticket de booster. Les identifiants récupérés sont conservés dans
`series` dans la sauvegarde `garageverse:v2`, même après une vente. Les anciennes
sauvegardes initialisent cette liste vide. L’accueil compte les séries complètes et
une pastille Garage signale les récompenses disponibles. La première complétion
est annoncée par le mécano après le tutoriel. La récupération utilise les confettis
et le son existants ; les confettis respectent le mouvement réduit. Les composants
communs utilisent les variables des huit thèmes dans `shared.css`.
