# Notes de version

Le jeu suit [SemVer](https://semver.org/lang/fr/) : `MAJEUR.MINEUR.CORRECTIF`. Tant que la version commence par 0, un changement de **mineur** apporte des nouveautés et un changement de **correctif** ne corrige que des défauts. La version affichée en bas des Réglages vient de `package.json`.

À chaque publication : changer `version` dans `package.json`, ajouter une entrée ici en tête, puis publier. Le build refuse une version sans entrée. Ces notes s’affichent dans le jeu, au premier lancement de chaque nouvelle version : elles s’adressent au joueur, en français et en le tutoyant. Seules les entrées numérotées sont montrées.

## [0.15.0] — 2026-11-18

### Ajouté

- **Pilotage manuel (expérimental).** Dans les Réglages, onglet Paramètres, active « Mode timing (expérimental) » et « Direction dans les virages (expérimental) », puis choisis **Manuel** dans « Pilotage » sur l’onglet Course. Pendant la course, passe les rapports au bon moment sur le compte-tours et prends les virages en rythme avec les flèches gauche et droite : ton adresse remplace le hasard. Le mode **Automatique** reste comme avant, et tu peux y repasser en pleine course.
- **Échanges entre amis (en test).** Une première version des échanges de voitures et de crédits entre amis arrive derrière le réglage « Échanges entre amis (expérimental) ». Elle est encore en essai : il est possible qu’elle ne fonctionne pas tout à fait.

### Modifié

- **Ouverture des boosters.** Le bouton pour retourner les cartes reste toujours à la même place, quels que soient les messages affichés autour de la carte.

### Corrigé

- **Un tirage, une tuile.** Une carte tirée dans une édition spéciale n’ajoute plus en plus l’édition Pixel 16 bits de base : tu n’as plus deux tuiles pour un seul tirage.

## [0.14.0] — 2026-11-18

### Ajouté

- **GarageVerse parle anglais.** Dans les Réglages, onglet Paramètres, choisis **Français** ou **English** : les menus, les cartes, les histoires de voitures, l’aide, le tutoriel et ces notes de version changent de langue. Ta partie est conservée. Par défaut, le jeu suit la langue de ton navigateur ; si tu as déjà une partie, il reste en français tant que tu ne changes rien.

### Corrigé

- **Couleur de rareté.** Une même voiture porte maintenant la même couleur de rareté dans le garage et dans sa fiche agrandie, quel que soit le thème.

## [0.13.1] — 2026-11-18

### Modifié

- **Le mode Versus fait une pause.** On ne peut plus lancer de nouveau défi pour l’instant ; il reviendra bientôt. Si tu as déjà un duel en cours, tu peux le terminer depuis l’accueil et récupérer ta mise ou ton gain normalement.

## [0.13.0] — 2026-11-17

### Ajouté

- **Vue planche au garage.** Sur téléphone, choisis 4 ou 5 voitures par ligne dans « Par ligne » : ton garage s’affiche comme une page de classeur, avec l’illustration, le numéro et la couleur de rareté de chaque voiture. Touche une vignette pour ouvrir sa fiche. Les voitures qui te manquent apparaissent en pointillés.

### Corrigé

- **Boutons après l’ouverture d’un booster.** Après un achat groupé, « Ouvrir le suivant » était écrasé à côté des autres boutons. Il occupe maintenant toute la largeur, au-dessus de « Voir le garage » et « Autre booster ».
- **Ordre de la collection.** Les voitures n° 100 et plus se rangeaient entre la n° 10 et la n° 11. Elles suivent maintenant la n° 99.

## [0.12.0] — 2026-11-17

### Ajouté

- **Achat de plusieurs boosters à la fois.** Dans la boutique, achète 5 ou 10 boosters d’un coup, au même prix unitaire. Le premier s’ouvre aussitôt, et le récapitulatif de chaque ouverture te propose d’ouvrir le suivant sans repasser par la boutique.

## [0.11.0] — 2026-11-17

### Ajouté

- **Édition Anime pour les voitures japonaises.** Quinze japonaises (Supra, Skyline R34, NSX, Silvia S15, MX-5, Impreza, Lancer, Celica…) ont une nouvelle illustration façon anime de course des années 90, sur une route de col au crépuscule. Elle sort des boosters ou se débloque dans la fiche, comme les autres éditions. Les japonaises déjà dessinées en anime gardent leur illustration.

### Modifié

- **Spéciales plus lisibles.** Les récompenses des paliers s’affichent avec le symbole ₡, comme ton porte-monnaie.

### Corrigé

- **Montants qui restaient à l’écran.** Sur certains téléphones, le montant dépensé (par exemple « −80 » après une amélioration) restait affiché par-dessus la fiche de la voiture. Il disparaît désormais à la fin de son animation.

## [0.10.0] — 2026-11-17

### Ajouté

- **Une surprise se cache dans les Réglages.** Les collectionneurs les plus curieux sauront la trouver… Indice : il faut parfois insister.

## [0.9.0] — 2026-11-17

### Ajouté

- **Renault Clio II 1.2** (n° 131). Une petite citadine increvable, +2 en Endurance.
- **Clio 2 Ceramicool** (n° 130), son évolution. Rose de la tête aux pieds avec le toit noir, enjoliveurs BMW, caches roses à la place des antibrouillards et caisson de basse : plus de 300 000 km au compteur, 100 % éthanol, un échappement qui fait beaucoup de bruit… pour une voiture qui reste lente. Prépare ta Clio II au Stage 3, puis débloque-la à l’atelier pour 800 crédits. Elle sort aussi des boosters, avec une édition Photo de la vraie voiture.

## [0.8.0] — 2026-11-17

### Ajouté

- **Écran de lancement GAMEDAVE.** Au démarrage, le logo GAMEDAVE apparaît en fondu sur fond noir, puis le jeu s’ouvre au bout de cinq secondes. Touche l’écran pour passer directement au jeu.

## [0.7.0] — 2026-11-17

### Modifié

- **Nouvelles illustrations pour l’édition Abandonnée.** Les 129 voitures ont chacune une histoire d’abandon qui leur ressemble : oubliée à la ferme sous le hangar à foin, cachée dans une planque après un casse, remisée au fond d’un studio de cinéma, au bout d’un chemin forestier, dans le stand d’un circuit fermé, près d’une station-service du désert ou au dernier sous-sol d’un parking, et parfois là où on ne l’attend pas, comme un roller disco ou un centre commercial désert. Les voitures restent intactes, juste couvertes de poussière.

## [0.6.0] — 2026-11-16

### Ajouté

- **Notes de version dans le jeu.** À chaque mise à jour, le jeu te présente ses nouveautés dès l’ouverture. Tu peux les relire à tout moment depuis les Réglages, sous le numéro de version.

### Modifié

- **Les caisses deviennent des boosters** : Booster Bricole et Booster Mécanique.
- **Booster Bricole à 60 crédits** au lieu de 75, avec le même contenu.
- **Booster Mécanique à 240 crédits** au lieu de 180. Il se place entre Neon Drive (150) et After Hours (250).

## [0.5.0] — 2026-11-16

### Ajouté

- **Éditions Solarpunk et Abandonnée complètes.** Les 129 voitures du jeu disposent désormais toutes de leurs deux illustrations alternatives *Solarpunk* et *Abandonnée*.
- **Parcours des rivaux en trois étapes.** Chaque rival se joue en trois courses progressives (*Étape 1 · Essais*, *Étape 2 · Qualifs*, *Étape 3 · Finale*). Les étapes d’approche offrent des tickets de caisse et le duel final offre la voiture signature du rival à la première victoire.
- **Deux nouvelles caisses en boutique** : la **Caisse Bricole** (75 crédits, voitures courantes et jusqu’à trois pièces du quotidien) et la **Caisse Mécanique** (180 crédits, cinq pièces mécaniques garanties).
- **Sept nouvelles séries de collection** (14 séries au total) : *Bombinettes GTI*, *Fourgons & Familiales cultes*, *Baroudeurs tout-terrain*, *Du quotidien au circuit*, *Courses-poursuites à l’écran*, *Icônes d’outre-Rhin* et *Dolce Vita & V12*.
- **Démontage rapide des pièces.** Un bouton « Tout démonter » dans l’onglet Mécaniques du garage et « Retirer de toutes les voitures » sur la fiche d’une pièce rendent instantanément tes pièces au stock pour équiper ton écurie.
- **Troisième emplacement de pièce sur voiture maxée.** Une voiture au Stage 3 avec ses quatre ateliers au niveau 2 peut débloquer un 3ᵉ emplacement de pièce (+2 potentiel) dans l’atelier de son choix.

### Modifié

- **Courbe de difficulté de la Nuit sans fin** plus progressive sur les quinze premières manches, avec des compositions adverses spécialisées par secteur au-delà.
- **Évolutions toujours visibles** sur les onglets Performances et Atelier de la fiche voiture, avec un badge « Évolution » au garage dès qu’une voiture au Stage 3 peut débloquer son évolution.
- **Boutons de fin de duel** collés au-dessus de la barre d’onglets sur petit écran (320 px).

## [0.4.0] — 2026-11-16

### Ajouté

- **Version ordinateur.** Sur un grand écran, les onglets passent dans la barre du haut, la préparation d’une course s’affiche sur deux colonnes (le briefing à gauche, ton écurie et ton garage à droite), la barre de filtres reste compacte et les voitures du duel sont centrées. Rien ne change sur téléphone ni sur tablette.
- **Personnalités des rivaux.** Les six rivaux ont un caractère, un style et des goûts. Leur portrait et leur réplique d’accueil apparaissent sur l’écran de préparation, et ils te répondent à la fin du duel, que tu gagnes, perdes ou réussisses une victoire parfaite.
- **Tri « Adaptée au circuit »** pour choisir les voitures d’une course.

### Modifié

- **Un seul sélecteur de voitures.** Le garage et la préparation d’une course utilisent les mêmes filtres : rareté, tri, recherche, catégorie et nombre de voitures par ligne. Tes réglages sont gardés d’un écran à l’autre.
- **Courses plus fluides.** Le bouton pour avancer (« Lancer la course », « Engager », « Secteur suivant », « Voir le résultat », « Manche suivante ») reste toujours visible en bas de l’écran, et la page suit l’étape en cours : plus besoin de faire défiler pour le retrouver.
- **Nouveau style des boutons**, plus anguleux et en relief, pour les filtres du garage, les spéciales et les rivaux.
- **Réglages en trois onglets** : Paramètres, Thèmes (groupes repliables) et Aide (tout le lexique). Le bouton « ? » de l’en-tête est retiré.
- **Pièces mécaniques.** Un booster contient au plus deux pièces. Environ 48 % des sachets Neon Drive, 55 % des After Hours et 63 % des Overdrive en contiennent au moins une.
- **Récompenses détaillées** sur les rivaux, la boutique et la fin de duel : crédits, ticket de booster nommé et bonus de victoire parfaite.

## [0.3.2] — 2026-11-15

### Ajouté

- **Dos des cartes au choix.** Dans les Réglages, quatre dos illustrés : Blason, Carbone, Autoroute et Motif. Le nom du jeu y est écrit en petit sur deux lignes, GARAGE puis VERSE, en chrome stylisé aux couleurs du dos choisi. Il remplace le monogramme « GV ». L’Autoroute est le dos par défaut, et ton choix est gardé.

## [0.3.1] — 2026-11-15

### Modifié

- **Choix des voitures d’une course.** Le coût de chaque voiture a sa propre couleur, du vert (1) au jaune (10). Une voiture qui ferait dépasser le plafond de coût de l’écurie est grisée et indique de combien elle le dépasse.

## [0.3.0] — 2026-11-15

### Ajouté

- **Spéciales de courses.** Quatre séries, une par secteur : Départ, Virages, Ligne droite et Endurance. Chacune a cinq paliers de difficulté croissante : Bronze, Argent, Or, Platine, Légende. Elles s’ouvrent quand tu as battu toute la Ligue Néon. La première victoire d’un palier rapporte 50, 100, 160, 250 puis 400 crédits, et le rejouer rapporte environ 20 %. Battre le palier Légende d’une spéciale donne un ticket de booster, une seule fois.
- **Nouvelles éditions à l’essai.** Solarpunk (ville verte, éoliennes, panneaux solaires) et Abandonnée (la voiture dans une grange en ruine) sur Clio III, Peugeot 205 GTI, Supra, MX-5 NB et F40.
- **Garage.** Un appui sur une voiture ouvre sa carte. La carte se zoome (pincement, double appui, molette) et se déplace au doigt, avec l’inclinaison holographique. Les cartes ont la couleur de leur rareté. La rareté et le tri se règlent avec des puces.
- **Badge « Nouveau »** sur les voitures que tu viens de tirer.
- **Annulation du recyclage.** Après avoir recyclé un doublon, tu as six secondes pour annuler.
- **Réglage « Aide en touchant les mots soulignés »** pour ne plus ouvrir l’aide par erreur.
- **Mode Nuit sans fin**, **mode hors ligne**, et **export et import de ta sauvegarde**.
- **Nouveau logo néon**, nouvelles icônes et **sachets métallisés** avec une couverture dorée quand ils contiennent une Légendaire.
- **Bande-son synthwave et bruitages**, **postures de conduite** (attaque, normal, gestion), fourchettes de score des rivaux et récapitulatif par secteur.
- **102 voitures vues de côté** pour la mini-course des secteurs.
- **Version du jeu** affichée en bas des Réglages, et ces notes de version.

### Modifié

- **Débloquer une édition** coûte maintenant les crédits et **deux doublons** de la carte. Il manque quelque chose ? La fiche te dit exactement quoi : « Il te manque 1 doublon », « Il te manque 30 crédits ». Les éditions déjà débloquées sont gardées.
- **Les 14 légendaires** montrent une grande image fixe au lieu d’une scène animée. Onze sont en Synthwave stylisé, la Jeep, l’Interceptor et la 1000tipla gardent leur style. Le pixel 16 bits reste une édition à choisir.
- **Les thèmes** sont rangés en trois groupes dans les Réglages : Ambiances, Univers et À gagner (les trois thèmes à débloquer restent grisés avec leur objectif).
- **Recycler un doublon** demande confirmation.

### Corrigé

- Les boutons indisponibles sont vraiment grisés dans tous les thèmes et disent pourquoi.
- Le liseré violet autour de plusieurs voitures vues de côté, et le décor animé de l’Agera qui n’avait pas de route.
- L’onglet « Performances » de la fiche était coupé sur un petit écran.

## [0.2.0] — 2026-11-15

### Ajouté

- Amélioration automatique d’une voiture.
- Déblocage d’éditions artistiques avec des crédits.
- Écussons latéraux sur les cartes.
- Filtres du garage et mise en page pour ordinateur.
