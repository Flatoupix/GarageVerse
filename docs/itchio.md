# Distribuer GarageVerse sur itch.io

Ce dépôt produit une variante HTML5 autonome pour itch.io tout en gardant le build GitHub Pages (`yarn build`, sortie `dist/`) séparé. Le package à téléverser est `artifacts/garageverse-itch.zip` ; il contient `index.html` à sa racine.

## Fabriquer et contrôler le ZIP

Depuis la racine du dépôt :

```sh
yarn install --immutable
yarn build:itch
```

La commande exécute le contrôle TypeScript, produit le build dans `dist-itch/`, vérifie le manifeste de Vite et les références locales d’images, de polices, de sons, de scripts et de styles, contrôle les limites de l’archive itch.io, puis écrit `artifacts/garageverse-itch.zip`. Elle affiche le nombre de fichiers et les tailles compressée et décompressée. Le build standard GitHub Pages reste dans `dist/` et n’est pas remplacé.

Le workflow **Package HTML5 itch.io** refait ces contrôles sur les pull requests vers `dev`, les changements poussés sur `dev` et à la demande. Il exécute aussi les vérifications de jeu existantes et le build GitHub Pages, puis conserve le ZIP comme artefact téléchargeable pendant 14 jours. Aucune clé itch.io n’est nécessaire pour générer le ZIP.

## Créer la page itch.io

1. Sur itch.io, créer un projet et choisir **HTML** comme type de projet (« Kind of project »). Le propriétaire de la page et son identifiant public restent à définir par le créateur.
2. Dans les options d’intégration, téléverser `garageverse-itch.zip` comme fichier à lancer dans le navigateur.
3. Choisir **Click to launch in fullscreen**. GarageVerse adapte sa mise en page à la fenêtre ; le mode mobile d’itch.io ouvre déjà le jeu en plein écran après le toucher du joueur.
4. Activer **Mobile friendly** après avoir essayé la page publiée sur un vrai téléphone Android et un vrai iPhone. Le projet est pensé en portrait. Garder les barres de défilement d’itch.io désactivées ; le défilement du jeu est interne à sa page.
5. Garder l’écran de lancement avec clic. Le son ne peut démarrer qu’après une interaction du joueur sur les navigateurs mobiles.
6. Publier la page seulement après revue du contenu, des divulgations IA et des droits décrits ci-dessous.

La documentation itch.io indique que le ZIP doit présenter `index.html` à sa racine, employer des chemins relatifs et rester sous 1 000 fichiers, 500 Mo décompressés, 200 Mo par fichier et 240 caractères par chemin. Le packaging vérifie ces limites. [Exigences HTML5 officielles](https://itch.io/docs/creators/html5)

## Mise à jour et retour arrière

Pour une mise à jour, reconstruire le ZIP avec `yarn build:itch`, le télécharger depuis l’onglet **Actions** du dépôt, puis le téléverser comme nouvelle version du même projet itch.io. Vérifier la version de jeu et les principales pages sur téléphone avant de remplacer le fichier visible. Garder le ZIP précédent comme retour arrière.

Si le ZIP a déjà été envoyé par butler, pousser les fichiers de la version précédente dans le même canal après avoir vérifié le nom du compte et le slug du projet :

```sh
butler push dist-itch compte/slug:html5
```

Butler exige une page de projet itch.io existante et une clé API dédiée. Le workflow peut le lancer manuellement, mais seulement après fusion vers `master` : dans **Actions → Package HTML5 itch.io → Run workflow**, choisir `master` et cocher `publish`. Le défaut est décoché et les pushes/PR ne publient jamais.

Pour activer cette option après création de la page : dans **Settings → Environments**, créer `itchio-release`, y ajouter les secrets `ITCHIO_API_KEY` (clé Butler dédiée, champ API `wharf`) et `ITCHIO_TARGET` (`compte/slug`, sans suffixe de canal), puis exiger un approbateur pour cet environnement. La première livraison fonctionne sans ces secrets tant que `publish` reste décoché. Le job publie alors le contenu du ZIP dans le canal `html5` avec butler officiel et n’envoie une mise à jour que si le contenu a changé. Le téléversement manuel du ZIP reste possible. [Authentification de butler en CI](https://itch.io/docs/butler/login.html) · [Envoi d’un build](https://itch.io/docs/butler/pushing.html)

Pour revenir en arrière côté dépôt, restaurer la version précédente par un commit de revert vers `dev`, puis refaire la revue et la fusion normale. Sur itch.io, téléverser le ZIP précédent comme nouvelle version permet de conserver un historique de livraison clair.

## Compatibilité et limites connues

- **Chemins et ressources :** le build utilise `base: './'`, adapté à GitHub Pages sous `/GarageVerse/` et à l’extraction du ZIP sur itch.io. Les images de cartes, les sons et les ressources compilées sont inclus localement ; les polices Google restent une ressource HTTPS externe et peuvent être remplacées par les polices système si le réseau les bloque.
- **Sauvegarde :** GarageVerse enregistre dans `localStorage`. La sauvegarde itch.io est distincte de celle de GitHub Pages, car les origines diffèrent. Dans l’iframe, le navigateur peut partitionner ou refuser le stockage tiers, et les modes privés ou les outils de nettoyage peuvent effacer les données. Le jeu signale une indisponibilité du stockage ; l’export/import JSON reste la voie de transfert et de sauvegarde. Ne pas promettre une persistance permanente.
- **Service worker et mode hors ligne :** le build itch.io ne tente pas d’enregistrer le service worker. Les règles de stockage et d’exécution dans une iframe hébergée sur un autre domaine varient entre navigateurs ; une exécution hors ligne n’est donc pas garantie. Les fichiers du jeu restent inclus dans le ZIP.
- **Plein écran et gestes :** itch.io gère le plein écran de sa propre iframe. Le bouton interne de plein écran n’apparaît que si le navigateur expose l’API et peut refuser l’appel sans geste utilisateur ; le jeu reste utilisable dans la fenêtre fournie. Sur iOS, le plein écran du navigateur est limité ; l’ouverture par itch.io et l’ajout à l’écran d’accueil sont des comportements distincts.
- **Réseau et multijoueur :** les pages HTML5 itch.io s’exécutent dans une iframe. Les appels HTTPS vers des services externes sont possibles si leur politique CORS les autorise ; une connexion Supabase Realtime requiert aussi `wss://` et doit être validée dans la page itch.io elle-même.
- **Versus et invitations :** sur la branche `dev` auditée pour cette livraison, le code contient des courses locales contre l’IA et la spécification `docs/versus.md`, mais aucun client Supabase, salle multijoueur, QR code ou traitement de lien d’invitation. Le multijoueur et son parcours d’invitation ne sont donc pas annoncés comme disponibles ni comme testés dans cette variante. Une invitation future devra proposer une URL partageable, une copie explicite, puis un chemin de repli ouvrant le jeu hors de l’iframe si le navigateur bloque la navigation intégrée ; cette intégration devra être testée après création de la page itch.io.
- **Fonctions de jeu :** les vues Boosters, Garage, Atelier et Courses locales restent celles du même jeu et partagent le modèle de sauvegarde ; le build de packaging ne réécrit pas leurs règles.

La page itch.io lance le projet dans une iframe, avec option de lancement en plein écran et configuration mobile. La documentation signale aussi la nécessité de chemins relatifs et les limites de taille ci-dessus. [Documentation d’intégration HTML5 itch.io](https://itch.io/docs/creators/html5)

## Vérifications mobiles à faire avant d’activer « Mobile friendly »

Tester au minimum les largeurs 320, 390, 768 et 1280 px, puis refaire les gestes clés sur les navigateurs natifs Android et iOS. Vérifier l’accueil, les quatre onglets, l’ouverture complète d’un booster, une fiche carte, Garage/Atelier, une course complète, les paramètres, le son, l’export/import de sauvegarde, le défilement et l’absence de débordement horizontal. La simulation navigateur ne remplace pas les téléphones réels ni l’iframe itch.io. Le Versus/invitation ne peut pas être testé avant son implémentation.

## Texte de page proposé

### Description courte

Collectionne des cartes automobiles, prépare tes voitures à l’atelier et compose une écurie pour des courses tactiques en cinq secteurs.

### Description longue

**GarageVerse** est un jeu de collection de cartes automobiles où chaque voiture peut devenir un projet de garage. Ouvre des boosters, découvre des modèles et leurs éditions, complète des séries, puis équipe tes voitures avec les bonnes pièces.

À l’atelier, améliore les caractéristiques de ton écurie et choisis une préparation adaptée à son potentiel. En course, compose une équipe de trois voitures et prends tes décisions secteur par secteur : accélération, virages, ligne droite et endurance. Les conditions et les choix tactiques comptent autant que la puissance brute.

Joue à ton rythme, collectionne, règle ton garage et relève les défis dans une interface conçue d’abord pour le téléphone. GarageVerse est un jeu de cartes et de préparation mécanique avec des courses tactiques, pas un simulateur de conduite arcade.

**À vérifier avant publication :** cette proposition ne mentionne ni multijoueur ni invitations, car ces fonctions ne figurent pas dans le code de `dev` audité ici.

## Divulgations et droits à vérifier avant publication

itch.io demande de déclarer les contenus issus d’IA générative dans la section dédiée de la page, avec les catégories pertinentes (graphismes, son, texte/dialogues, code). Les règles indiquent que cette déclaration s’applique aussi aux contenus retouchés manuellement et que les pages de jeux doivent être renseignées. Faire l’inventaire réel des ressources avant de sélectionner les catégories ; les éléments générés par procédure classique ne relèvent pas de cette définition. [Règles officielles sur la divulgation IA](https://itch.io/docs/creators/quality-guidelines#ai-disclosure)

Le dépôt contient des noms de modèles et des références visuelles/culturelles qui peuvent évoquer des marques, des designs protégés ou des franchises. Le créateur doit vérifier les licences et autorisations nécessaires pour les illustrations, les noms, les marques, les sons, les polices et les références à des œuvres (par exemple Bond, KITT ou Retour vers le futur) avant la publication. La page ne doit pas laisser entendre une affiliation ou une approbation officielle. itch.io place la responsabilité des droits sur la personne qui publie ; cette documentation ne vaut pas avis juridique. [Conditions itch.io sur les droits du contenu publié](https://itch.io/docs/legal/terms)
