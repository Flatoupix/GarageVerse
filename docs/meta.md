# GarageVerse · Méta « Neon Drive » v0.13.1

Ce document arbitre les questions laissées ouvertes par la bible (§3, §4 et §9) pour la version jouable. Les valeurs vivent dans `src/data/roster.json` et `src/data/garage.json`, les règles dans `src/game/rules.ts`. La simulation `node pipeline/balance.mjs` vérifie les ordres de grandeur.

## 1. Principe directeur

**Une voiture modeste se prépare, une légende se choisit.** Chaque voiture a un **coût d’écurie** de 1 à 10 et un **potentiel de préparation** qui vaut `12 − coût`, au minimum 2, plus 1 par Stage. Une Clio III coûte 2 et accepte 10 points de pièces. Une Venom F5 coûte 10 et n’en accepte que 2. Les ligues plafonnent le coût total des trois voitures engagées. L’hypercar domine les lignes droites, la citadine préparée tient les secteurs longs, la ville et la pluie.

## 2. Les quatre dimensions de la bible

| Dimension | Traduction en jeu |
| --- | --- |
| Rareté | Courante, Rare, Épique, Légendaire. Elle règle la fréquence en booster et le cadre de la carte. La palette de référence est définie sur `:root` dans `src/themes/shared.css` : Courante gris-bleu (`--rarity-common`, `#aabbd0`), Rare bleu (`--rarity-rare`, `#4aa8ff`), Épique rose (`--rarity-epic`, `#ff5fd2`), Légendaire or (`--rarity-legendary`, `#ffc64a`). Les cartes de voiture et de pièces, les vignettes, les filtres et les halos du booster utilisent ces variables. Les effets de révélation lisent les mêmes variables et en dérivent les reflets. |
| Puissance | Quatre scores de base sur 10 (ACC, VIT, MAN, END), plafonnés à 12 après préparation, et le coût d’écurie. |
| Aura | Les éditions culturelles portent leurs étiquettes (Cinéma, Série, Nostalgie, Tuning…). Elles gagnent +1 la Nuit. Certaines capacités comptent les alliés qui partagent une étiquette. |
| Édition artistique | Synthwave, photo, gouache et rallye argentique. Classic et Pixel Art pour certaines cartes. Les éditions d’une voiture partagent les mêmes statistiques. |

## 3. Cartes

**Voiture (100).** Numéro de collection, version, coût, quatre scores, transmission, motorisation, catégories, capacité signature et fiche réelle à vérifier. Les 32 cartes candidates de la bible sont reprises, avec 18 voitures de la liste des futures cartes : Abarth 500, Dacia Logan, Civic Type R EK9, MX-5 NA, M3 E46, Delta HF Integrale, Lancer Evo VIII, Alpine A110, NSX, Tesla Model S Plaid, Mustang Shelby GT500, Challenger Demon 170, RUF CTR Yellowbird, Carrera GT, Zonda R, Agera R, Veyron et Hummer H1.

**Mécanique (24).** Huit familles, une pièce par famille et par voiture : pneumatiques, suspension, freinage, transmission, suralimentation, gestion moteur, châssis et spécial. Chaque pièce a un coût de préparation de 1 à 3, des bonus de scores ou des effets conditionnels, et une compatibilité explicite. Exemples : *Kit angle drift* (propulsion uniquement), *Compresseur volumétrique* (V8, V10 ou V12), *Gros turbo hybride* (déjà turbo), *Pack batterie* (électrique), *Fiabilité K9K* (diesel) et *Éco-Croisière* (citadine, diesel ou berline). Les deux dernières reprennent les pistes de capacités de la bible.

**Histoire.** Les 129 voitures ont une anecdote (champ `story` du roster, liste de travail dans `docs/anecdotes.md`), affichée dans une section « Histoire » de la fiche, sous les caractéristiques. Les faits sont à vérifier avant diffusion large.

**Évolution.** Une évolution se débloque à l’atelier depuis sa version de base préparée au Stage 3, contre des crédits ; la version de base reste au garage. Le prix suit l’écart de rareté : 200 crédits à rareté égale, puis 300 (Courante → Rare), 500 (Rare → Épique) et 800 (Épique → Légendaire) par palier franchi, cumulés (champ `craft` du roster). 43 évolutions : la chaîne Lotus `Elise S1 → 111S → Sport 190`, réservée à l’atelier ; 27 versions de base ajoutées le 16 novembre (cartes 103 à 129 : 205 GL → 205 GTI, Golf Mk1 1.1 → Golf GTI Mk1, 316i → M3 E30, 911 SC → 911 Turbo, Challenger SXT → Demon…) ; six lignées entre cartes existantes (MX-5 NA → NB, Civic EG → Type R EK9, Golf GTI Mk1 → Mk2, M3 E30 → E46, Skyline R32 → R34, Esprit → Esprit de James Bond) ; et les voitures de films depuis leur voiture de base (DeLorean → DeLorean temporelle, Firebird → KITT, Coccinelle → Choupette, R34 → Skyline de Brian, Mustang 67 → Eleanor, Charger R/T → Charger de Dom, Wrangler → Jeep Jurassic Park, Multipla → 1000tipla). Toutes sauf les Lotus sortent aussi des boosters (`craft.inBoosters`). Les éditions culturelles renvoient vers leur carte de base. Les 27 nouvelles cartes ont leur illustration Synthwave, leur pixel 16 bits, leur voiture de profil pour la mini-course ainsi que leurs éditions Solarpunk et Abandonnée.

## 4. Garage et progression

| Action | Effet |
| --- | --- |
| Amélioration automatique | Prépare la voiture en un toucher après avoir détaillé les étapes prévues (pièces libres compatibles en stock, niveaux d’atelier, passage de Stage) et l’aperçu des statistiques avant/après. |
| Atelier · niveau 1 puis niveau 2 | 10 puis 15 crédits par niveau. Chaque niveau ajoute 1 point à la statistique du groupe choisi, dans la limite de 12. |
| Monter une carte Mécanique | Le niveau 2 du groupe ouvre le montage. La pièce occupe un exemplaire en stock et le retrait le libère. |
| Stage 1 · 80 crédits | +1 potentiel |
| Stage 2 · 200 crédits et 1 doublon | +1 potentiel, +1 à la meilleure statistique d’origine |
| Stage 3 · 450 crédits et 2 doublons | +1 potentiel, débloque les évolutions |
| 3ᵉ emplacement de pièce · 250 crédits | Sur une voiture au Stage 3 dont les quatre ateliers sont au niveau 2 : +2 potentiel et une 2ᵉ pièce dans une seule famille, celle où en cumuler deux a du sens — Spécial (Transmission et nitro), Gestion moteur (Moteur et turbo) ou Châssis (Freins et châssis). Pas de 3ᵉ pièce en Pneus et suspension, jamais deux fois la même pièce. Le déplacer vers un autre atelier coûte de nouveau 250 crédits, après avoir retiré la 2ᵉ pièce. Un emplacement acheté sur Pneus et suspension avant cette règle est remboursé au chargement (`extraSlotFamily` dans `src/game/rules.ts`, `src/game/extraslot.check.cjs`). |
| Débloquer / changer un style | Un tirage débloque et affiche uniquement l’édition tirée. Le Pixel 16 bits ne s’ajoute pas en plus et se débloque comme les autres éditions. Bascule gratuitement entre les éditions déjà possédées ou débloque un style artistique disponible (Synthwave, Pixel 16 bits, Classic, Photo, Gouache, Rallye argentique, et Solarpunk et Abandonnée sur les 129 voitures du jeu, liste `editionCars` de `src/game/data.ts`…) contre 40, 75, 120 ou 200 crédits selon la rareté **et deux doublons de la carte** (`editionDuplicates` dans `src/game/save.ts` ; un exemplaire reste toujours). Quand il manque quelque chose, la fiche l’écrit : « Il te manque 1 doublon », « Il te manque 30 crédits ». Essaie gratuitement un style sur la carte, puis confirme avec « Débloquer ». Seul le dernier achat est annulable, pendant 30 secondes au maximum et tant que la fiche reste ouverte. La trace est gardée en mémoire pour la session. Une vente, un recyclage, une dépense de doublons, une mise en vitrine, une offre ou un échange invalide l’annulation. Le remboursement doit tenir dans les plafonds de la sauvegarde. Les images viennent de `node pipeline/art.mjs --set edition --only id,id` (fichiers `src/assets/cars/<id>-solarpunk.webp` et `<id>-abandonnee.webp`). |
| Vendre une voiture | Retire tous ses exemplaires de la collection et libère ses pièces. Prix : 2 × progression.scrap[rareté] + 10 × Stage + ⌊crédits d’atelier dépensés / 2⌋ + progression.scrap[rareté] × (exemplaires − 1). Refus si engagée dans une écurie (défi du jour compris), dans une course en cours, ou si le garage passerait sous trois voitures différentes. Les évolutions peuvent aussi être vendues. |
| Recycler un doublon | 10, 30, 80 ou 200 crédits selon la rareté. Moitié prix pour une pièce libre. |

**Échanges entre amis.** Active le réglage expérimental pour accéder à la vitrine, aux offres et à l’historique depuis le Garage. Une voiture marquée « En transit » reste visible dans le Garage pendant l’échange. Elle est indisponible pour la vente et pour les écuries, défi du jour et Nuit sans fin compris. Voir [Échange de cartes entre amis](echanges.md).

Les doublons alimentent la progression, comme le demande la bible. Le garage de départ contient la Clio III, la Twingo I et la Panda 4×4, trois pièces, 300 crédits et deux tickets Neon Drive.

**Écussons d’amélioration sur la carte.** Sur le flanc gauche de l’illustration, la carte d’une voiture possédée affiche quatre petits écussons en colonne (un par groupe d’atelier, dans l’ordre des statistiques) : éteint d’origine, à moitié allumé au niveau 1, pleinement allumé au niveau 2. Deux voyants signalent les pièces montées, colorés selon leur rareté. Les styles communs à tous les thèmes vivent dans `src/themes/shared.css`.

Le garage propose une recherche, des puces de rareté (Toutes, Courante, Rare, Épique, Légendaire) sous la recherche et un filtre par catégorie, un tri multi-critères (collection, rareté, puissance totale, niveau d’amélioration, coût d’écurie, statistiques, doublons, année, nom) et un sélecteur du nombre de voitures affichées par ligne (`Auto`, `1` à `6`). L’atelier associe les pneus et la suspension à la maniabilité, la transmission et le nitro à l’accélération, le moteur et le turbo à la vitesse, et les freins et le châssis à l’endurance.

## 5. Course en secteurs

C’est la piste « épreuve en secteurs » de la bible, enrichie de choix simultanés.

1. **Écurie.** Trois voitures dont le coût total respecte le plafond de la ligue : Néon 9, Chrome 15, Overdrive 22.
2. **Circuit.** Cinq secteurs connus d’avance : Départ (ACC), Virages (MAN), Ligne droite (VIT) et Endurance (END). La condition (Sec, Pluie, Nuit, Terre, Ville) n’est annoncée que pour le secteur en cours et le suivant.
3. **Engagement.** À chaque secteur, chaque pilote engage une voiture en secret et peut brûler une charge de **Nitro** (+2, deux charges par course). Une voiture court `1 + ⌊END/4⌋` secteurs, hors bonus. Au-delà, elle **surchauffe** (−3).
4. **Consigne de pilotage.** Avec la voiture, chaque pilote choisit une consigne (`stances`, `src/game/rules.ts`). **Attaque** : +2, deux secteurs d’endurance brûlés, risque d’incident doublé ; il faut au moins deux secteurs restants. **Normal** : un secteur brûlé. **Gestion** : −2, aucun secteur brûlé, risque d’incident divisé par deux. La Gestion vaut −2 et non −1 pour qu’une voiture à faible Endurance ne puisse pas courir toute la course presque sans malus.
5. **Résolution.** Score = statistique préparée + modificateurs de terrain + capacités et pièces + consigne + Nitro. En cas d’égalité, l’Endurance départage. La course se joue au meilleur des cinq secteurs.
6. **Part de hasard.** Comme les dégâts d’un jeu de combat au tour par tour, chaque voiture fait de 88 à 112 % de son score, au moins ±1 (« Forme du jour »). Une fois sur seize, elle signe un « Secteur parfait » (environ ×1,5, au moins +2). Une fois sur vingt-quatre, un incident lui coûte environ 40 % (au moins 2 points) : faux départ, tête-à-queue, aspiration ratée, crevaison ou aquaplaning. La pluie et la terre augmentent ce risque de moitié, la surchauffe le double. Le joueur voit la fourchette de score avant d’engager une voiture (`luckRange`, `src/game/rules.ts`).

**Mise en scène d’un secteur.** Une mini-course (`src/components/SectorRun.vue`) joue le détail de score ligne par ligne : chaque bonus fait avancer la voiture, chaque malus la freine, la nitro la pousse et un incident la fait partir en tête-à-queue. Un décor en pixel art défile au-dessus de la piste selon la condition (`trackBackdrop`, `src/game/art.ts`) : en attendant les cinq décors dédiés (`yarn art --set anim --kind tracks`, fichiers `track-<condition>-bg`), la course emprunte ceux des légendaires animées. Une voiture qui possède un détourage de profil (`carSprite`, fichiers `<id>-car`) roule sans cadre sur sa voie ; les autres montrent la vignette de leur carte en attendant `yarn art --set anim --kind sprites`. Un toucher passe l’animation, le mouvement réduit la saute. À scores égaux, le verdict indique l’Endurance des deux voitures qui a départagé. L’action principale existante reste toujours visible sur un léger dégradé en bas de la colonne, au-dessus des onglets et de la zone sûre : lancement de course, défi ou nuit, « Engager » avec nitro et posture, « Secteur suivant », « Voir le résultat », puis « Manche suivante » et « Rentrer au garage ». La hauteur réelle de la barre réserve assez de place pour lire le dernier élément, y compris pendant le tutoriel. Engager fait défiler doucement vers le début du résultat ; lancer la course ou passer au secteur ou à la manche suivante ramène au rappel du secteur et de la météo. Le mouvement réduit du jeu ou du système rend ce défilement instantané.

| Terrain | Modificateurs communs |
| --- | --- |
| Pluie | Intégrale +1, propulsion −1 |
| Terre | 4×4 et rallye +1, supercar et hypercar −2 |
| Ville | Citadine +1, hypercar et muscle −1 |
| Nuit | Éditions culturelles +1 |

**Lire le rival.** Chaque voiture adverse affiche sa fourchette de score sur le secteur en cours, hors nitro, comme le rival voit celles du joueur. L’arrivée résume les cinq secteurs : voitures engagées, scores et vainqueur.

Le joueur doit pouvoir expliquer son choix : le panneau de résultat détaille chaque bonus. **Aide rapide** (`src/game/help.ts`) : les termes soulignés en pointillé (statistiques, secteurs, météo, lignes du détail de score, nitro, Stage…) ouvrent une bulle d’explication ; l’onglet Aide des Réglages ouvre le lexique complet. Avant chaque secteur, une consigne rappelle le but et la statistique qui compte. Il peut se relancer après un mauvais départ grâce aux capacités « retour en force » et à la Nitro gardée pour la fin. Une carte commune garde un usage : une Twingo sous la pluie en ville vaut mieux qu’une hypercar.

**Rivaux.** Six rivaux en trois ligues, chacun avec un circuit et une météo typés : Lola Minitel, DJ Cassette, Kenji Vapor, Roxy Turbo, Le Baron Chrome et Nyx. La première victoire contre un rival rapporte un ticket du booster de sa ligue. Une victoire parfaite signifie que tu as gagné tous les secteurs : les crédits de la ligue sont doublés et tu reçois un ticket supplémentaire (neon → neon, chrome → night, overdrive → overdrive), cumulable avec celui de première victoire. L’arrivée célèbre « Victoire parfaite » avec le son legend et des effets renforcés, désactivés en mouvement réduit. L’IA voit les mêmes informations que le joueur.

Le palmarès des victoires parfaites lit le champ `perfect` dans les entrées `<rival>:1` (Essais), `<rival>:2` (Qualifs) et `<rival>` (Finale). Chaque étape gagnée parfaitement affiche une étoile ★ à côté de ✓ dans son onglet. La liste affiche l’avancement sur trois avec des étoiles pleines et vides (par exemple ★★☆ pour deux victoires parfaites sur trois).

Le briefing affiche les statistiques mobilisées et la meilleure voiture de l’écurie pour chaque secteur selon un score moyen estimé. Lola roule d’origine et en pilotage simple (champ `simple` : toujours en Normal), pour que le joueur découvre les consignes avec un avantage ; les rivaux suivants attaquent et gèrent, et montent aussi leurs groupes de statistiques à l’atelier (champ `upgrades` des écuries). Mesures de la simulation (`node pipeline/balance.mjs`) depuis l’ajout des consignes : garage de départ d’origine 78 % contre Lola et 64 % contre Cassette, 87 % et 69 % avec une amélioration par voiture ; contre des écuries Stage 1 de leur ligue, Kenji 77 %, Roxy 69 %, le Baron 62 % et Nyx 61 %. Les cibles d’avant les consignes étaient 70 et 57 %, 83 et 72 %, puis 75, 71, 56 et 55 %.

## 6. Boosters et économie

| Booster | Prix | Spécificité |
| --- | --- | --- |
| Neon Drive | 150 | Majorité de voitures courantes, dernière voiture au moins Rare |
| After Hours | 250 | Pondération ×4 sur Cinéma, Série, Tuning et Drift, dernière voiture au moins Rare |
| Overdrive | 400 | Pondération ×3 sur hypercars, supercars et records |

Chaque booster contient cinq cartes, dont au plus `maxParts` pièces mécaniques (2 pour les trois boosters actuels, 1 par défaut si le champ est absent). Le jeu détermine le type puis la rareté de chaque carte et choisit des pièces et des voitures différentes dans un même pack quand le tirage le permet. Les taux vivent dans `garage.json`. Le lot est tiré et sauvegardé dès que le sachet est scellé, à l’achat ou avec un ticket. L’ouverture réutilise exactement ce tirage ; les anciens sachets sans tirage enregistré tirent encore à la déchirure. Une couverture légendaire (illustration dédiée, cadre et halo dorés, étincelles et ruban « Édition légendaire ») signale la présence d’au moins une Légendaire ; la boutique garde la couverture normale. Le sachet métallisé porte le logo néon et les couleurs de sa collection. Son reflet et son frémissement légendaire sont immobiles en mouvement réduit. Un rechargement retrouve le même lot sans retirage, et les cartes rejoignent le garage dès le récapitulatif, une seule fois.

Avec assez de tickets d’un même booster, tu peux confirmer l’ouverture groupée de 5 ou 10 sachets,
en comptant le sachet déjà préparé. Son tirage scellé est repris, puis chaque sachet suivant
est tiré indépendamment avec les règles habituelles. La collection, le solde de tickets et le récapitulatif
sont sauvegardés ensemble avant la célébration. Le rechargement retrouve les résultats et le même
identifiant de lot ne peut pas les attribuer une deuxième fois. Les mentions Nouveau et Doublon suivent
l’ordre des tirages. Les éditions obtenues s’ajoutent à la collection et tu peux choisir de les afficher
depuis le détail, en gardant par défaut l’apparence déjà affichée au garage.

Pendant l’ouverture, la grille de la scène réserve deux rangées d’actions en
bas, au-dessus des onglets et de la zone sûre. Leur hauteur reste la même avec
un seul bouton, avec les choix d’édition et au récapitulatif. Les libellés
peuvent revenir à la ligne. Les messages occupent une zone de hauteur fixe qui
défile si le texte déborde. La carte s’ajuste à la hauteur restante, et la
grille du récapitulatif défile au-dessus des actions. Sur les écrans compacts,
le guide du mécano s’affiche à côté du sachet dans la zone défilante.

## 7. Direction artistique et thèmes d’interface

- **Thèmes au choix.** Réglages › Thèmes, enregistré dans la sauvegarde (`preferences.theme`). Les huit thèmes sont conservés et rangés en trois groupes (`themeGroups` dans `src/game/theme.ts`) : Ambiances (Synthwave, Rétro pixel, Sobre), Univers (Sport auto, Carnet de garage) et À gagner (Borne d’arcade, Console 16 bits, Atelier PC 1991, grisés avec leur objectif tant qu’ils sont fermés). Synthwave (style d’origine, par défaut, `src/themes/neon.css`), Rétro pixel (`src/themes/base.css`), puis Sobre, Sport auto et Carnet de garage, qui ajoutent leurs variables et ornements à la base (`src/themes/<id>.css`). Trois thèmes se débloquent en jouant (`unlock` dans `src/game/theme.ts`, conditions qui ne régressent pas, annonce par notification) : Borne d’arcade après 10 victoires, Console 16 bits à 25 voitures, Atelier PC 1991 avec une Légendaire. La base règle rayon (`--radius`), relief (`--lift`), rythme des animations (`--ease`) et échelle des titres (`--dz`) par variables. Seuls les menus changent : les cartes gardent leurs éditions. En Synthwave, l’accueil, les sachets, les rivaux et les pièces reprennent leurs illustrations d’origine ; les autres thèmes montrent le pixel art. Les effets (`src/game/fx.ts`) suivent le thème : couleurs propres, particules carrées en Rétro pixel, traits lumineux ailleurs.

Le thème Rétro pixel suit les règles ci-dessous.

- **Palette Endesga 32.** Variables de `:root` : nuit `--night` #181425, fond `--background` #262b44, panneau `--panel` #3a4466, gris bleu `--slate` #5a6988, crème `--text` #ead4aa, sable `--sand` #e4a672, brun `--brown` #b86f50, rouge `--red` #e43b44, orange `--orange` #f77622, jaune `--yellow` #feae34, vert `--green` #63c74d, bleu `--blue` #0099db, bleu clair `--light-blue` #2ce8f5, prune `--plum` #68386c, rose `--rose` #b55088, contour `--outline` #0b0a12. Texte crème sur les surfaces sombres ; texte contour sur les boutons jaunes.
- **Typographies.** Press Start 2P pour les titres, chiffres et étiquettes courtes, à taille modeste ; Pixelify Sans pour le texte courant, au moins 15 px.
- **Menus de console et borne de course.** Damier discret immobile, contours pleins de 2 à 4 px, coins carrés, ombres pleines décalées sans flou. Les boutons descendent au toucher, avec une ombre réduite et un contour de focus clavier jaune.
- **Cartes de voiture.** Le cadre et le libellé de rareté gardent la même teinte dans le garage et la fiche agrandie, dans les huit thèmes. Les cartes suivent la palette commune décrite en section 2. Coût en pièce pixel et statistiques en blocs segmentés.
- **Illustrations.** Chaque carte a une édition par défaut en pixel art 16 bits, générée en basse définition (`node pipeline/art.mjs --set pixel`, fichiers `src/assets/pixel/<type>/<id>.px.webp`) et agrandie sans lissage. Les illustrations précédentes restent des éditions à collectionner : synthwave pour les cartes 1 à 50, photo, gouache et rallye argentique pour les voitures de départ, et un style propre à chaque carte 51 à 102 (champ `look` du roster : affiche, rallye argentique, bande dessinée, anime, magazine, aquarelle, pulp ou synthwave, avec son décor dans `setting`). Une voiture déjà possédée reçoit l’édition pixel au chargement sans perdre son apparence choisie.
- **Légendaires : image fixe.** Les 14 cartes avec un champ `anim` ne s’animent plus sur la carte. Elles montrent par défaut une grande image fixe (`defaultStyle` dans `src/game/data.ts`) : pour les onze cartes d’origine en Synthwave, une illustration volontairement stylisée et irréaliste (style `LEGEND_STYLE` de `pipeline/art.mjs`, fichiers `src/assets/cars/<id>.webp`) ; pour Jeep Jurassic Park, Interceptor et 1000tipla, leur illustration de style propre (affiche, pulp, magazine). Le pixel 16 bits reste une édition possédée et à choisir. Une partie existante dont une légendaire affichait l’ancien pixel par défaut passe à l’image fixe au chargement (`readSave`), un autre choix du joueur est gardé (`src/game/legend.check.cjs`). Les calques animés (`node pipeline/art.mjs --set anim` : décor qui défile et voiture détourée de profil) ne servent plus qu’à la mini-course des secteurs. Le CSS de scène (`.pixel-scene`, `.scene-*`) n’est plus utilisé.
- **Retours de jeu.** Sons et logique inchangés ; étincelles et confettis carrés à coordonnées entières, traits de vitesse pixel et carrés qui s’agrandissent à la place des anneaux. Flash et secousse conservés dans `src/game/fx.ts`. Animations d’entrée et de révélation par paliers.
- **Mouvement réduit.** La préférence du jeu et celle du système coupent animations, reflet, particules, flash et secousse sans perte d’information.
- **Nom et stage sur la carte.** Le nom d’une voiture tient toujours sur deux lignes au plus et n’est jamais coupé au milieu d’un mot : `CarCard` réduit sa taille jusqu’à ce qu’il rentre (recalcul au redimensionnement, au changement de thème et après le chargement des polices). Vérifié sur les 129 voitures, en quatre tailles de carte (346, 150, 110 et 95 px) et dans les huit thèmes. Le stage d’une voiture préparée s’affiche dans un badge jaune en haut à gauche de la carte, « Stage N » et trois crans ; sur les petites cartes, le chiffre et les crans seulement. Dans les thèmes dérivés de Rétro pixel, la case Coût des petites cartes suit la largeur de la carte pour laisser la place au nom.
- **Ordinateur (1024 px et plus).** Le téléphone et la tablette ne changent pas. Sur ordinateur (règles en fin de `src/themes/shared.css`, valables pour les huit thèmes) : les quatre onglets quittent le bas de l’écran et se placent au centre de la barre du haut, entre le logo et les crédits ; l’action principale d’une course se colle alors au bas de la fenêtre (`measureActions` dans `RaceView.vue` détecte que les onglets sont en haut) ; la préparation d’une course passe en deux colonnes, briefing à gauche (circuit, rival, écurie adverse) et écurie puis garage à droite (`.race-prep`, `.race-prep-brief`, `.race-prep-pick`, sans effet sur téléphone grâce à `display: contents`) ; la barre de filtres garde des commandes à leur taille au lieu de les étirer ; les voitures du duel sont centrées en colonnes de la taille des cartes. Borne d’arcade agrandit ses libellés d’onglets et Console 16 bits garde son curseur « ▶ » à gauche de l’onglet actif.

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

## Nuit sans fin

Accessible dès le garage de départ dans Course, ce mode enchaîne des courses de cinq secteurs contre trois voitures générées. L’écurie dédiée contient trois voitures différentes, pour un plafond de coût de **9** ; elle est préremplie et se modifie comme celle d’une course. La résolution conserve la mini-course, la consigne, les fourchettes de score et la course miroir.

Le tirage est reproductible à partir de la graine de la nuit. Les trois voitures adverses sont les plus coûteuses admissibles (départ : coût individuel maximal 2), avec tirage entre voitures de même coût. Ce maximum augmente de 1 par manche jusqu’au coût maximal du catalogue ; le coût total ne diminue donc jamais. Ensuite, le Stage augmente tous les deux tours, jusqu’à 3, avec jusqu’à autant de pièces compatibles de familles différentes, dans la limite du potentiel. Le tirage entre voitures de même coût est renouvelé à chaque manche. Après le Stage et les pièces, les quatre groupes de statistiques montent tous les deux tours jusqu’au niveau maximal de l’atelier ; la difficulté atteint alors les limites du moteur existant. Le briefing de préparation et la première manche partagent la même graine. Le tutoriel des rivaux reste masqué pendant ce mode et ne progresse pas. Circuit et météo tournent à chaque manche ; la météo alterne entre sec, pluie, nuit, terre et ville, avec un décalage après chaque tour des circuits pour varier leurs associations.

Chaque manche gagnée ajoute **60 + 20 × numéro de manche** crédits aux gains accumulés (80 pour la première, 100 pour la deuxième…). Entre deux manches, tu peux continuer ou rentrer au garage pour les encaisser. La première défaite, une égalité ou un abandon termine la nuit et verse uniquement les gains des manches déjà gagnées. L’encaissement a lieu une seule fois. Le record compte les manches gagnées consécutivement et se met à jour dès qu’il est battu, avec célébration sonore et visuelle existante ; en mouvement réduit, l’annonce textuelle reste et les effets visuels sont coupés.

La clé existante `garageverse:v2` contient `nightRecord` (0 par défaut), `nightLineup` (écurie dédiée) et `night` (ou `null`). La nuit conserve `seed`, `round`, `wins`, `gains`, `lineup`, `resting` (écran intermédiaire), `newRecord`, `pilotMode` et `lastPilot`. Le champ `duel` existant conserve toute la course, ses secteurs joués, ses points, utilisations et charges de nitro. Après rechargement, l’accueil propose de reprendre la nuit au bon écran. Les anciennes sauvegardes v2 et la migration v1 restent acceptées. Une nuit empêche de lancer une autre course et protège ses voitures de la vente jusqu’à sa fin.

## Mode hors ligne et sauvegarde exportable

En production, `src/main.ts` enregistre `./sw.js`. Le service worker sans dépendance prépare la page et ses ressources locales dès la première visite connectée, puis met en cache les requêtes du même domaine. La navigation privilégie le réseau avec repli sur la page en cache ; les fichiers hachés privilégient le cache. Les URL se résolvent relativement au worker, y compris sous un sous-chemin GitHub Pages. Les images consultées restent disponibles hors ligne. Les domaines externes, notamment Google Fonts, sont ignorés : les polices système de repli permettent de continuer à jouer.

Le cache versionné est déclaré en tête de `public/sw.js` : changer son nom à chaque publication. Une version en attente s’active quand les anciennes fenêtres du jeu sont fermées, au prochain lancement ; l’activation supprime les anciens caches. Les réglages affichent « Disponible hors ligne » quand le worker contrôle la page. En développement ou sans service worker, le jeu fonctionne comme avant.

Dans les réglages, « Exporter la sauvegarde » télécharge la partie courante au format JSON dans un fichier daté. « Importer une sauvegarde » vérifie le format GarageVerse v2 puis utilise `readSave` pour normaliser les données. Une confirmation précède le remplacement et la persistance ; annuler ou choisir un fichier invalide conserve la partie actuelle. Exporte ta partie avant de la remplacer pour en garder une copie. « Réinitialiser la partie », sous l’import, remet tout à zéro après confirmation : nouvelle partie de `newSave` (300 crédits, Clio, Twingo et Panda, tutoriel relancé), réglages et thèmes compris, puis rechargement de la page.


### Actions du garage et aide

- Pour recycler un doublon, touche « Recycler un doublon », puis confirme le montant. Tu peux ensuite toucher « Annuler » dans le bandeau pendant environ 6 secondes : tu retrouves ton exemplaire et les crédits du recyclage sont repris. Une nouvelle opération remplace le bandeau précédent. Cette possibilité reste en mémoire uniquement : elle disparaît si tu changes de voiture ou recharges la page.
- Un bouton grisé indique une action indisponible. Sous les boutons de Stage, tu retrouves les crédits et les doublons exacts qui te manquent ; l’atelier et les évolutions indiquent leurs conditions.
- Le badge « Nouveau » signale une voiture reçue dont tu n’as jamais ouvert la fiche. Le champ optionnel `seenCars` garde les fiches déjà ouvertes. Les voitures de départ et celles de tes anciennes sauvegardes sont considérées comme déjà vues.
- Dans les Réglages, tu peux activer « Aide en touchant les mots soulignés ». Cette préférence optionnelle `touchHelp` est désactivée pour une partie neuve pour éviter les touchers involontaires. Une ancienne sauvegarde sans cette préférence garde l’aide activée pour conserver ton comportement habituel. Tu peux toujours ouvrir le lexique dans les Réglages, onglet Aide, même si l’aide tactile est désactivée.


### Carte et commandes du garage

Un appui sur une voiture possédée ou manquante du garage ouvre l’onglet Carte. Performances et Atelier restent accessibles pour les voitures possédées ; les ouvertures depuis un circuit gardent leur onglet habituel. Sur téléphone, la fiche s’étend presque bord à bord (6 px de marge) et la carte en occupe toute la largeur (jusqu’à 520 px) et une colonne de 360 px sur ordinateur, sans cadre qui la rogne. Le zoom (pincement, molette, double appui) a été retiré le 16 novembre à la demande du joueur ; l’inclinaison holographique reste active.

Dans les huit thèmes, les cartes possédées et manquantes portent un cadre ou liseré de rareté : gris bleu, bleu, rose, or. L’étiquette garde le nom complet de la rareté et les badges Nouveau, Écurie et ×N restent contrastés. Les puces de tri Collection, Rareté, Puissance, Nom et Doublons sont visibles ; « Autres tris » conserve tous les critères, dont coût croissant/décroissant, accélération, vitesse, maniabilité, endurance, année et niveau. Le compteur de voitures reste affiché. Tri et rareté sont enregistrés dans les préférences optionnelles `garageSort` et `garageRarity`, avec Collection et Toutes par défaut pour les anciennes sauvegardes et les parties neuves. Les rangées de puces passent à la ligne sur mobile.

## Spéciales

Bats tous les rivaux de la Ligue Néon au moins une fois pour ouvrir Départ, Virages, Ligne droite et Endurance. Chacune propose Bronze, Argent, Or, Platine et Légende, ouverts successivement par une victoire. Les anciennes sauvegardes utilisent directement leurs victoires existantes. Chaque duel utilise le moteur et le record des rivaux, avec quatre secteurs spécialisés sur cinq, au sec.

| Palier | Plafond | Première victoire | Rejeu |
|---|---:|---:|---:|
| Bronze | 12 | 50 | 10 |
| Argent | 15 | 100 | 20 |
| Or | 18 | 160 | 32 |
| Platine | 21 | 250 | 50 |
| Légende | 24 | 400 | 80 |

Une défaite ou une égalité ne paie rien. La victoire parfaite double seulement le premier gain, sans ticket parfait de ligue. Le rejeu reste à 20 %, même parfait. La première victoire en Légende donne un ticket Overdrive, une seule fois par spéciale, y compris après rechargement.

### Équilibrage des paliers

Les écuries adverses (`specials[].tiers[].lineup` dans `src/data/garage.json`) ont été choisies par recherche : pour chaque palier, des centaines d’écuries candidates sous le plafond, au stage du palier (0, 1, 2, 3, 3) avec leurs meilleures pièces, mesurées contre 150 écuries de joueurs préparées au stage attendu. On garde celle qui donne la courbe visée pour un joueur « prêt » (écurie aléatoire sous le plafond, stage 1, 1, 2, 3, 3) : environ **88 %, 72 %, 60 %, 50 % puis 40 %** de victoires. Trois règles tiennent : la **puissance totale** (somme des statistiques préparées) augmente strictement à chaque palier (`src/game/specials.check.cjs`) ; une écurie **spécialiste** de la statistique du secteur bat au moins aussi souvent qu’une écurie généraliste ; une écurie de départ sans préparation ne gagne presque jamais (0 % presque partout, 27 % au mieux au premier palier d’Endurance).

Taux de victoire du joueur mesurés par `node pipeline/balance.mjs` (prêt / spécialiste, en %, 200 parties par case) :

| Spéciale | Bronze | Argent | Or | Platine | Légende |
|---|---:|---:|---:|---:|---:|
| Départ | 81 / 97 | 83 / 90 | 61 / 72 | 42 / 56 | 41 / 47 |
| Virages | 83 / 89 | 67 / 71 | 60 / 64 | 55 / 70 | 37 / 41 |
| Ligne droite | 91 / 96 | 70 / 94 | 55 / 82 | 51 / 66 | 30 / 54 |
| Endurance | 86 / 100 | 71 / 94 | 63 / 85 | 56 / 72 | 48 / 68 |

Les écarts de quelques points d’une case à l’autre (Départ Bronze et Argent, Virages Platine) sont dans le bruit de la simulation. Pour régler à nouveau : modifier les écuries, relancer `node pipeline/balance.mjs`, et garder la puissance croissante.

## Dos des cartes

Le dos d’une carte (visible à l’ouverture d’un booster avant de la retourner) se choisit dans **Réglages › Thèmes › Dos des cartes** parmi quatre illustrations, sans texte : **Blason** (art déco violet et or, volant ailé chromé), **Carbone** (fibre de carbone, bandes magenta et cyan, plaque métal), **Autoroute** (route néon vers un soleil rayé, choisi par défaut) et **Motif** (pistons, roues et éclairs autour d’un médaillon). Le choix est mémorisé dans la sauvegarde (`preferences.cardBack`, `a` à `d`, champ optionnel : une valeur inconnue est ignorée et les anciennes parties ont l’Autoroute) et vaut pour tous les thèmes, chacun gardant son cadre. La liste est dans `src/game/cardback.ts` ; le dos est dessiné par `src/components/CardBackFace.vue` : l’illustration plein cadre et, au centre sur une petite plaque, le nom du jeu sur deux lignes, **GARAGE** puis **VERSE**, en chrome biseauté avec contour, lueur et liserés aux couleurs du fond choisi. Le nom est un dessin SVG avec la police Orbitron du logo. Les images viennent de `node pipeline/art.mjs --set cardback` (ids `cardback-a` à `cardback-d`, `src/assets/ui/`). Les anciens styles `.back-sun`, `.back-monogram`, `.back-caption` et `.back-inset` des feuilles de thème ne sont plus utilisés. `src/game/cardback.check.cjs` vérifie la liste, le défaut et la sauvegarde du choix.

## Choix des voitures d’une course

Le terrain et l’écurie adverse précèdent les trois emplacements. Chaque voiture choisie s’affiche dans sa carte de collection avec son édition actuelle. Comme avant T-038, toucher la carte de l’écurie ouvre sa fiche. Les boutons sous la carte permettent de la retirer ou d’ouvrir directement son atelier.

« + Choisir » mène à « Ton garage », une grille de cartes à défilement vertical. Touche une carte pour choisir la voiture ou la retirer de l’écurie. Les cartes choisies apparaissent en tête, avec une coche et un contour distinct. Les autres sont triées selon les scores sur le terrain, avec les favoris en premier à score égal. Chaque carte indique le coût, les secteurs avant surchauffe, les points estimés et, le cas échéant, la raison du blocage.

La barre de lancement reste au-dessus des onglets et rappelle le coût total, le plafond et la raison éventuelle de désactivation. La course contre un rival, le défi du jour et la Nuit sans fin gardent chacun leur écurie.

## Composer une offre d’échange

Choisis d’abord les voitures et les crédits que tu donnes, puis ceux que tu demandes. Les vignettes se sélectionnent directement, avec un accès au détail. Le tri, la recherche et l’affichage à la demande des voitures indisponibles aident à parcourir le garage. Vérifie les deux lots dans le récapitulatif avant l’envoi. La vitrine indique les modifications locales jusqu’à leur enregistrement, et la synchronisation périodique conserve le brouillon et la vitrine en cours d’édition.

## Version et notes de version

Le jeu suit SemVer. La version vient de `package.json` (champ `version`), injectée au build par `vite.config.ts` (constante `__APP_VERSION__`, déclarée dans `src/version.d.ts`) et affichée en bas des Réglages (« GarageVerse v0.3.0 »). Les notes de version sont dans `CHANGELOG.md`, à la racine, en français. À chaque publication : changer la version, ajouter une entrée en tête du fichier, puis publier. Le build échoue si la version de `package.json` n’a pas son entrée `## [x.y.z] — AAAA-MM-JJ`. Le jeu lit ce fichier au build (`src/game/releases.ts`, `src/components/ReleaseNotes.vue`) : au premier lancement d’une nouvelle version, une fenêtre « Nouveautés » présente les entrées publiées depuis la dernière version vue (trois au plus), et le lien « Notes de version » des Réglages les montre toutes. La dernière version vue est gardée dans `localStorage` (clé `garageverse-notes-vues`), hors de la sauvegarde. Un nouveau joueur ne voit pas la fenêtre : le tutoriel l’accueille. Les entrées sans numéro (« Non publié ») restent invisibles.

**Écran de lancement.** À chaque lancement, le splash GAMEDAVE repris de Crazy Popping Catz (`src/components/GameDaveSplash.vue`, logo `src/assets/ui/gamedave-logo.png`) recouvre le jeu : fond noir, logo centré dans un cadre 720 × 1550 en « scale-outer » et ancré en bas, fondu linéaire de 3 s, fin à 5 s. Un toucher, Entrée, Espace ou Échap le passent, et le toucher n'active pas le bouton situé dessous. En mouvement réduit, le logo s'affiche sans fondu. La fenêtre « Nouveautés » attend sa fin. Les navigateurs pilotés par un outil de test (`navigator.webdriver`, orchestrateur compris) ne l'affichent pas.

**Showroom caché.** Sept appuis rapides (moins de 1,5 s d'écart) sur « GarageVerse vX » en bas des Réglages ouvrent l'écran `showroom` (`src/views/ShowroomView.vue`, compteur `debugTap(…, 7)` de `src/game/debug.ts`). Il montre les 131 cartes, possédées ou non, avec recherche et filtre par rareté ; une carte touchée ouvre ses éditions possédées en défilement horizontal, ou celles du catalogue si la voiture est absente du garage. Vitrine en lecture seule : rien n'est écrit dans la sauvegarde. La note de version 0.10.0 l'annonce sans le dévoiler. Le Showroom a son propre choix « Par ligne » (Auto, 1 à 5), initialisé depuis celui du garage et jamais enregistré.

**Vue planche.** Sur téléphone (moins de 650 px), 4 et 5 voitures par ligne affichent des vignettes (`src/components/CarThumb.vue`) au lieu des cartes complètes, illisibles à cette taille : illustration de l'édition affichée, numéro et cadre de rareté, voitures manquantes en pointillés. 6 par ligne reste réservé aux grands écrans. Sur tablette et ordinateur, les cartes complètes restent. Tant que la version commence par 0 : le mineur apporte des nouveautés, le correctif ne corrige que des défauts.

### Onglets des Réglages et raccourci de développement

Les Réglages s’ouvrent sur **Paramètres** : tutoriel, transfert de sauvegarde et état hors ligne, musique, bruitages, mouvement réduit, aide tactile, vibrations, plein écran et version. **Thèmes** regroupe les huit thèmes et les quatre dos des cartes. Les en-têtes Ambiances, Univers et À gagner replient ou déplient leur liste ; au premier affichage, seul le groupe du thème actif est ouvert. Les lignes compactes gardent l’objectif et la progression des thèmes verrouillés. **Aide** contient tout le lexique avec son introduction ; les liens des bulles y conduisent aussi. Le bouton « ? » de l’en-tête est retiré. Ces états d’interface ne sont pas sauvegardés. Les trois onglets restent sur une ligne sur mobile et leur contenu défile dans la boîte.

En développement comme dans le jeu publié (à la demande du joueur, depuis le 16 novembre), touche 14 fois de suite le logo GarageVerse de l’en-tête pour recevoir 1 000 crédits et la notification « Debug : +1 000 crédits », avec le son `src/assets/audio/debugCredits.mp3` (effet `debugCredits`, qui baisse la musique pendant 2,3 s ; si les bruitages sont coupés, il ne joue pas). Plus de 1,5 seconde entre deux appuis remet le compteur à zéro ; après un gain, une nouvelle série commence. Chaque appui revient à l’accueil. La fonction pure de comptage est vérifiée par `src/game/debug.check.cjs`.

Les quatre premiers emplacements donnent chacun 15 % (Neon Drive), 18 % (After Hours) ou 22 % (Overdrive) de chance de pièce ; le cinquième reste à 0 %. Avec le plafond à deux, l’espérance est respectivement de 0,59, 0,70 et 0,84 pièce par sachet. La boutique calcule la chance d’au moins une pièce : `1 − ∏(1 − partChance)` si `maxParts > 0`, soit environ 48 %, 55 % et 63 %. Les anciens lots scellés sont conservés.

Les lignes des rivaux affichent les crédits de ligue et le ticket de première victoire (`leagues[].ticket`, également utilisé pour attribuer le gain). La fin du duel détaille les crédits totaux, le ticket de booster nommé et le bonus de victoire parfaite, avec sa part de crédits. Les séries séparent crédits et ticket de booster ; leurs gains sont inchangés.


### Commandes anguleuses et courses

`src/components/GvButton.vue` fournit les variantes `primary`, `secondary`, `tab`,
`filter` et `icon`. `tone` accepte une couleur CSS et alimente `--gv-tone` ;
`active` pilote le relief actif, `disabled` désactive le bouton natif. Les attributs
`aria-pressed`, `aria-selected`, `aria-label`, les événements et les classes sont
transmis au bouton. Fournis toujours un nom accessible aux commandes à icône.
Le contour métallique, les deux biseaux de 10 px et le relief utilisent les
variables du thème dans `shared.css`, commun aux huit thèmes. Le focus est
intérieur pour rester visible malgré le découpage. Le balayage et les entrées
sont supprimés par `.motion-reduced` et par la préférence système.

Le garage propose quatre vues anguleuses, cinq filtres (Toutes et les quatre
raretés existantes), avec gemmes, nombres de modèles et noms accessibles complets.
Les nombres suivent la vue choisie. Les cinq tris rapides utilisent des icônes ;
Autres tris conserve les treize critères. Les sept densités (Auto, 1 à 6) restent
accessibles sur mobile. Rareté, catégorie, tri et densité sont mémorisés dans
Preferences. Recherche et catégories gardent leurs contrôles natifs.

Les quatre spéciales affichent le glyphe de secteur et cinq segments Bronze,
Argent, Or, Platine et Légende : couleur de médaille, cadenas, victoire, palier
courant (`aria-current="step"`) et gain en crédits (première victoire ou rejeu).
Le déverrouillage et l'ouverture de la fiche de duel réutilisent les règles
existantes. Les rivaux gardent portrait, ligue, plafond, récompenses, victoires et
étoile de victoire parfaite. Les entrées sont courtes et décalées, sans mouvement
si demandé. Les captures à 320/390 px sont vérifiées par l'orchestrateur.


### Personnalité des rivaux

Les six rivaux de ligue portent sept champs optionnels de type texte dans `garage.json` et `Rival` : `bio` (histoire), `style` (étiquette de personnalité), `likes` (groupe nominal, par exemple « les roadsters »), `intro` (avant le duel), `win` (victoire du joueur), `lose` (défaite du joueur) et `perfect` (victoire parfaite du joueur, prioritaire sur `win`).

La préparation affiche une carte compacte avec le portrait existant de `art.rival`, le titre, le style, « Aime … », la biographie et l’introduction entre guillemets. Le résultat affiche une seule réplique au-dessus des gains. La liste des rivaux ajoute le style au titre. Ces informations n’ajoutent aucun contrôle et ne modifient ni les écuries ni les récompenses. Chaque texte absent est masqué ; sans personnalité, l’affichage reste celui d’origine. Les spéciales, la Nuit sans fin et le défi du jour n’affichent aucune carte ni réplique de personnage.

Vérification des données hors réseau : `node src/game/personnages.check.cjs`.

## Pilotage des courses contre les rivaux (T-028)

Active **Mode timing (expérimental)** dans **Réglages › Paramètres** pour afficher le choix
**Pilotage** en haut de l’onglet **Course**. **Automatique**, le mode par défaut, conserve la
forme du jour, les secteurs parfaits et les incidents. En **Manuel**, ton passage de vitesse
ou ta direction en rythme, si tu as activé cette option, remplace ces tirages pour ta voiture.
Le rival conserve ses tirages habituels.

Ton choix est mémorisé pour les prochaines courses. Si tu désactives le mode timing, les nouvelles
courses se jouent en automatique. En course manuelle, **Passer en automatique pour la suite**
rétablit le hasard dès le premier secteur encore à résoudre. Tu continues à choisir tes voitures
et la bascule reste acquise pour cette course, même après rechargement. Le bilan précise le mode
de chaque secteur et celui de la course. Le Défi du jour et le Versus gardent leur fonctionnement
habituel.

**Nuit sans fin (T-035).** Avec le mode timing activé, le même choix **Automatique / Manuel** apparaît
dans la préparation de la nuit (avant « Commencer la nuit ») et sur l’écran **Manche suivante**.
L’automatique est la valeur par défaut. Le choix de la série est enregistré dans `night.pilotMode`
(et `preferences.nightPilotMode` pour la prochaine nuit, indépendant du choix des rivaux) ; chaque
manche fige le sien dans `duel.pilot` à sa création (`createNightRound`), donc changer de réglage
pendant une manche ne la modifie pas. **Passer en automatique pour la suite** agit sur la manche en
cours seulement : la série garde son choix pour la manche suivante, modifiable à chaque intermanche.
Ni la graine, ni les victoires, gains, record, écurie ou nitro ne changent. L’écran intermédiaire et
le bilan de fin de nuit indiquent le pilotage de la dernière manche (`night.lastPilot` : Automatique,
Manuel ou Manuel puis automatique). Sans mode timing, la nuit reste automatique et aucun sélecteur
n’est affiché. Les nuits enregistrées avant ce choix reprennent en automatique.

## Passage de vitesses expérimental (T-026)

Dans **Réglages › Paramètres**, active **Mode timing (expérimental)** pour jouer le passage de vitesses
en pilotage manuel contre les rivaux, ainsi que dans le Défi du jour et la Nuit sans fin.
Le réglage est désactivé par défaut.
**Démo du passage de vitesses** ouvre le compteur sans lancer de course ni changer le réglage.

Au signal **Partez !**, les deux voitures démarrent dans la scène du duel. Touche la scène
ou **Passer la vitesse**, ou appuie sur **Espace** ou sur **Entrée** si le bouton a le focus, quand
l’aiguille atteint la cible. À chaque passage, la voiture réagit, le jugement s’affiche près d’elle et le rapport avance.
Le décompte joue un bip sur chaque chiffre, puis un bruit de moteur au départ. La traînée de
l’aiguille et l’éclat de la zone verte annoncent le bon moment. Le passage parfait déclenche
des étincelles dorées, un claquement de rapport et une courte vibration. Le bond et la flamme
de la voiture marquent l’accélération. Un raté donne un léger à-coup et un bruit d’échappement.

En virage, la piste réagit sur la cible et la note ratée s’efface dans une teinte rose du thème.
Après deux gestes parfaits de suite, **Série ×n** compte les Parfait consécutifs, vitesses et
virages confondus. Tout autre jugement remet la série à zéro. Un secteur entièrement parfait
affiche brièvement **Sans faute !** sur la piste.

Après les gestes, le bilan manuel affiche sous la piste le verdict et les scores face au rival,
avec le bonus ou le malus du geste s’il est non nul. La surchauffe, l’incident et la nitro restent
signalés près du score concerné. **Détails du secteur**, replié par défaut, rassemble les jugements,
l’équation du score et les sous-scores des deux voitures.
Les deux démos reprennent ces retours de jugement. Les réglages **Son** et **Vibration**
s’appliquent. Le mouvement réduit conserve les textes et les sons et coupe les effets animés.

| Secteur | Passages | Montée de base | Largeur verte de base |
| --- | ---: | ---: | ---: |
| Départ | 2 | 900 ms | 15 % |
| Ligne droite | 3 | 1 000 ms | 13 %, puis 9,36 % au dernier passage |
| Endurance | 2 | 1 200 ms | 19 % |
| Virage | 2 si le rythme est désactivé | 1 050 ms | 14 % |

La difficulté du rival raccourcit la montée jusqu’à 12 %, avec un plancher de 800 ms, et réduit
la largeur verte jusqu’à 20 %. La préparation de la voiture peut élargir les zones de réussite.
La graine de la course et les index du secteur et du passage déterminent la fenêtre sans tirer dans
le générateur du duel. La cible est visible dès le départ de l’aiguille, qui redescend en 220 ms.
Un passage sans appui est raté. Un raté laisse la fenêtre et la vitesse du passage suivant intactes.

Chaque passage rapporte −2 (Raté), −1 (Moyen), 0 (Bon) ou +1 (Parfait). La ligne **Timing du passage**
dans le détail affiche la moyenne arrondie à l’entier le plus proche, avec les demis vers zéro.
Le détail indique aussi le nombre de jugements de chaque type. Ce modificateur remplace
les tirages de forme du jour, de secteur parfait et d’incident du joueur. Le rival conserve ses tirages habituels.

Le chrono se suspend quand l’onglet est masqué. En mouvement réduit, l’aiguille avance par paliers
et les voitures restent fixes pendant les gestes. Un secteur validé revient à son bilan.

Chaque mini-jeu manuel, vitesses ou virages, est précédé de **3, 2, 1, Partez !**, à raison de
0,6 s par étape. Le geste commence à **Partez !**. Les secteurs automatiques se jouent sans
décompte, y compris après une bascule en cours de course. Si tu recharges ou reviens dans la
course avant la résolution d’un secteur engagé, le décompte reprend à **3** avant le geste.
Quand l’onglet est masqué, le décompte se suspend comme le chrono du geste. En mouvement
réduit, il garde le même rythme et s’affiche sans animation ni particules.

Au clavier, appuie sur **Espace** pour passer la vitesse et sur **←** ou **→** pour prendre un
virage. Tu peux utiliser ces touches sans donner le focus aux boutons. Le jeu ignore les appuis
avant **Partez !** et les répétitions de touche. Les raccourcis laissent la main aux champs de
saisie et aux fenêtres d’aide ou de réglages.

La première fois que tu engages chaque type de geste, le mécano explique les commandes.
**C’est parti** valide la bulle dans ta sauvegarde et lance le décompte. Le tutoriel principal
reprend après le geste. Les démos des réglages se lancent directement et laissent les bulles
disponibles pour la première course.

## Direction expérimentale dans les virages (T-027)

Dans **Réglages › Paramètres**, active **Mode timing (expérimental)** puis **Direction dans les
virages (expérimental)**. Ce deuxième réglage est désactivé par défaut. **Démo des virages**
permet de jouer et de rejouer une séquence qui alterne gauche et droite.

En solo, un secteur de type virage propose trois notes par défaut. Le circuit, l’index du secteur
et l’identifiant du rival fixent les sens et les instants par un hachage stable. Les notes
descendent en diagonale sur deux pistes sous la scène du duel. Appuie sur le bouton du bon côté
quand la flèche atteint la cible accentuée. Les commandes ignorent les répétitions de touche.
Le mouvement réduit fait avancer les notes par paliers. Le chrono se suspend si tu changes
d’onglet. Si tu recharges avant la résolution, tu reviens à la sélection du même secteur.

| Geste | Résultat | Direction |
| --- | --- | ---: |
| Bon côté, jusqu’au seuil Parfait inclus | Parfait | +2 |
| Bon côté, entre le seuil Parfait exclu et le seuil Bien inclus | Bien | +1 |
| Bon côté, avant la fenêtre Bien et dans la fenêtre d’appui | Trop tôt | 0 |
| Bon côté, après la fenêtre Bien et dans la fenêtre d’appui | Trop tard | −1 |
| Mauvais côté dans la fenêtre d’appui | Mauvais côté | −1 |
| Fenêtre d’appui expirée sans appui accepté | Raté | −1 |

Les notes apparaissent jusqu’à 1,6 s à l’avance. Le profil du rival règle les fenêtres
symétriques autour de l’instant cible. Par défaut, le seuil Parfait va de
65 à 100 ms, le seuil Bien de 155 à 230 ms et la limite d’appui de 330 à 410 ms, de chaque côté
de la cible. Les paramètres du module permettent d’ajuster ces seuils, l’avance, le nombre de
notes, leur espacement, le barème et les bornes du total. Les fenêtres d’appui sont disjointes.
La statistique MAN et les pièces agissent sur le score de base selon les règles habituelles.

La direction apporte un modificateur compris entre **−2 et +2** par secteur. Le détail
affiche les nombres de Parfaits, de Bien et de Ratés, ainsi que le calcul
**score de base + trajectoire = score du secteur**. Le rival garde sa résolution habituelle.
Le départ, la ligne droite et l’endurance gardent le passage de vitesses, comme les virages
quand l’option de direction est inactive.

## Chargement des illustrations et des sons

L’écran de démarrage attend les URL de l’interface (`ui` et `pixel/ui`, accueil inclus), les sachets du thème actif (ordinaires et légendaires), les cinq décors de course et les sons. Les thèmes dessinent leurs fonds en CSS. Sur une sauvegarde avec une collection déjà développée, la file ajoute les portraits du thème actif, le sprite de profil et l’édition affichée de chaque voiture possédée, avec ses calques de drift si elle en a. Les trois voitures offertes d’une sauvegarde neuve rejoignent la file de fond.

Mesure sur les fichiers sources avec le thème Synthwave, dédoublonnés par URL, en Mo décimaux. La sauvegarde type possède la Clio, la Twingo et la Panda de départ, plus la R34, l’Elise, la Venom, l’AE86 et la McLaren F1 dans leurs éditions par défaut.

| Ressources | Sauvegarde neuve | Sauvegarde type |
| --- | ---: | ---: |
| Interface et accueil | 6 fichiers · 0,678 Mo | 6 fichiers · 0,678 Mo |
| Sachets | 6 fichiers · 0,562 Mo | 6 fichiers · 0,562 Mo |
| Décors de course | 5 fichiers · 0,523 Mo | 5 fichiers · 0,523 Mo |
| Portraits de rivaux | 0 | 6 fichiers · 0,324 Mo |
| Sprites de profil | 0 | 8 fichiers · 0,083 Mo |
| Éditions affichées | 0 | 8 fichiers · 0,596 Mo |
| **Sous-total images** | **17 fichiers · 1,763 Mo** | **39 fichiers · 2,766 Mo** |
| Sons et musiques | 19 fichiers · 0,790 Mo | 19 fichiers · 0,790 Mo |
| **Total** | **36 fichiers · 2,553 Mo** | **58 fichiers · 3,556 Mo** |

La sauvegarde type ne contient pas la Skyline de Brian. Si son édition affichée comporte les calques de drift, ceux-ci ajoutent deux fichiers pour 0,150 Mo, en plus de son illustration et de son sprite.

Le logo s’affiche dès le premier rendu. La progression apparaît si l’essentiel est encore en cours après 150 ms. L’ensemble des images référencées représente 780 fichiers, soit 69,373 Mo. L’application ouvre le garage dès que l’essentiel est prêt, après 8 secondes au maximum, ou dès que le joueur utilise « Passer ». Les chargements en attente cèdent la priorité au booster tiré, au duel constitué et aux éditions de la fiche demandée. Aucune nouvelle demande de fond ne démarre lorsque l’onglet est masqué ou qu’une action attend ses images. Les téléchargements déjà lancés se terminent pour éviter de les recommencer. Le catalogue est écarté si le navigateur signale un mode économie de données. Sur GitHub Pages, le service worker gère séparément son cache hors ligne.

## Hiérarchie des boutons

- `primary` met en avant l’action principale de chaque zone, par exemple « Lancer la course ».
- `filled` donne un fond plein et sobre aux actions secondaires positives et au retour « Rivaux ».
- `ghost` sert aux annulations, aux retours ordinaires et à la vente avant confirmation.
- `quiet` garde les actions de retrait et les commandes moins prioritaires discrètes.

### Mise à jour du jeu

En production, le jeu relit `index.html` au lancement, au retour dans l’onglet, au retour du réseau et toutes les 30 minutes si l’onglet est visible et en ligne. La requête porte un marqueur unique, utilise `cache: 'no-store'` et le service worker laisse passer ce marqueur. Le nom haché du script d’entrée identifie le déploiement et « Plus tard » mémorise la version masquée.

Sur GitHub Pages, le jeu vérifie aussi le service worker. « Mettre à jour » écrit la sauvegarde, active le worker en attente et recharge dès que la partie le permet. Sur itch.io, la vérification relit l’index à l’adresse du jeu ouvert. Si une publication change l’adresse de l’iframe, l’onglet itch.io doit être rouvert pour rejoindre cette adresse.
