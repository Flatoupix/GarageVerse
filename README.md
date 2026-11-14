# GarageVerse

## Bible de conception · v0.1

GarageVerse est un jeu mobile de cartes automobiles à collectionner, avec une progression RPG et des duels tactiques. Une Clio III diesel peut devenir la voiture à laquelle on tient le plus dans un garage qui contient aussi une Venom F5. On la collectionne pour ce qu’elle représente, on la prépare pour le rôle qu’on veut lui donner et on la joue quand ses qualités font la différence.

Le projet démarre comme un prototype personnel, privé et non commercial. La première étape est la conception. Le prototype jouable vient après validation.

### 1. L’expérience recherchée

| Pilier | Ce que le joueur doit ressentir |
| --- | --- |
| Collection | La curiosité de découvrir une voiture du quotidien, un modèle de légende, une édition culturelle ou une illustration alternative. |
| Attachement | L’envie de garder et de préparer ses voitures préférées, et de retrouver leurs différentes versions dans son garage. |
| Stratégie | La satisfaction d’avoir préparé la bonne voiture pour la situation, y compris quand elle part avec moins de puissance brute. |
| Spectacle | Le plaisir de déchirer un booster, de retourner chaque carte et de sentir qu’une découverte exceptionnelle mérite sa propre mise en scène. |

Pokémon TCG Pocket est une référence pour la collection et le rituel d’ouverture, Gran Turismo 2 pour la progression automobile, Need for Speed Underground pour la personnalisation et Auto Modellista pour l’énergie du cel-shading. Les voitures de cinéma, de séries et de jeux vidéo alimentent la dimension culturelle. L’identité du jeu tient au lien entre voiture, préparation et collection.

**Boucle cible.** Obtenir un booster, découvrir les cartes, les retrouver dans le garage, choisir une voiture à préparer, la jouer, puis réinvestir les ressources et pièces gagnées. Le prototype vertical doit déjà donner envie de rouvrir un booster et de retourner au garage. Les duels viendront enrichir cette boucle.

### 2. Voitures, cartes et éditions

Une même voiture peut exister sous plusieurs cartes jouables et plusieurs illustrations. Les identifiants, fiches techniques et visuels doivent pouvoir évoluer à leur propre rythme. Le tableau donne une proposition de modèle de données à valider avant le prototype.

| Entité | Informations à conserver |
| --- | --- |
| Véhicule ou version | Constructeur, modèle, génération, année ou période, finition, origine, fiche technique et références. Une fiction peut avoir des champs techniques inconnus. |
| Carte | Identifiant de collection, véhicule associé, rôle en jeu, capacités éventuelles, potentiel d’évolution, rareté de collection et aura éventuelle. |
| Édition culturelle | Œuvre, véhicule ou carte de base si applicable, affinités, provenance et statut des droits. Un véhicule fictif peut exister sans carte de base. |
| Édition artistique | Carte associée, style, illustration, traitement visuel et animation éventuelle. |
| Possession | Carte et édition obtenues, nombre d’exemplaires, préparations débloquées et progression sauvegardée. |
| Pièce ou évolution | Type, compatibilités, effets ludiques et conditions de déblocage dans le garage ou d’activation en duel. |
| Booster | Qualité, habillage, composition, table de distribution versionnée et règle de révélation. |

**Quatre dimensions indépendantes.** La rareté décrit la disponibilité dans la collection. La puissance en jeu dépend des règles et du contexte. L’aura traduit l’identité culturelle. L’édition artistique porte le style et le soin de la présentation. Une illustration alternative conserve les statistiques de la carte qu’elle représente. Une carte animée peut recevoir un traitement exceptionnel sans avantage mécanique automatique.

**Catégories cumulables.** Type de voiture (citadine, coupé, hypercar), mécanique (diesel, turbo, traction, propulsion), origine (pays et constructeur), époque, compétition (rallye, endurance, drift), culture (cinéma, série, jeu vidéo, tuning, fiction, nostalgie) et histoire (innovation, record, série limitée, modèle culte). Ces étiquettes servent au classement et à la recherche dans le garage. Les règles peuvent mobiliser une sélection d’entre elles pour les synergies.

**Fiche automobile.** Distinguer la donnée réelle du score de jeu. Pour une valeur technique, relever la version, l’unité et la source. Préciser les conditions lorsqu’elles comptent, par exemple vitesse mesurée ou annoncée et masse à sec ou en ordre de marche. Les textes et valeurs des maquettes sont des éléments de présentation à vérifier avant intégration.

### 3. Garage, pièces et aura

**Progression permanente.** Le joueur gagne des ressources et collecte des pièces au fil des parties. Il les dépense pour préparer ses voitures et débloquer de nouvelles versions. La fusion de cartes fait partie des pistes envisagées. Son coût, les cartes éligibles et le traitement des doublons restent à arbitrer.

**Évolution en duel.** Posséder une évolution dans le garage donne accès à une option de deck. La jouer en duel dépend de conditions encore à définir, comme une carte de base en jeu, un emplacement ou un coût. Le chemin `Lotus Elise S1 → Elise 111S → Elise Sport 190` sert à étudier des paliers et des branches inspirés de versions réelles. Le graphe représente des déblocages ludiques.

**Compatibilité mécanique.** Pneumatiques, suspensions, freinage, transmission, admission et suralimentation, gestion moteur et préparations spécifiques. Chaque pièce s’applique à un ensemble explicite de véhicules ou de préparations. Une incompatibilité peut devenir une branche dédiée si la conversion correspondante est représentée et justifiée.

**Aura culturelle.** Une édition de cinéma peut avoir une aura permanente et des affinités propres. La Skyline de Brian dans *2 Fast 2 Furious* illustre une combinaison Cinéma, Nostalgie et Tuning. Même principe pour la Firebird et KITT, la DeLorean et sa version temporelle, la Coccinelle et Choupette, ou l’Esprit S1 et sa version James Bond. Première piste à tester, des synergies conditionnelles qui ouvrent une option tactique. Les valeurs, seuils, plafonds et conditions restent ouverts.

**Équilibrage.** La Clio III et la Venom F5 forment un premier cas d’essai. L’hypercar doit exprimer son potentiel dans les situations où la puissance compte. Une Clio bien préparée doit pouvoir apporter autre chose, par exemple un coût de préparation contenu, de la régularité ou un avantage sur une épreuve adaptée. Les concepts « Éco-Croisière », « Couple Diesel » et « Fiabilité K9K » des maquettes sont des pistes de capacités.

### 4. Trois pistes de duel à comparer

Ces modèles sont des hypothèses de conception. Le premier test peut utiliser les mêmes voitures, pièces et profils d’épreuve dans les trois modèles pour comparer les décisions qu’ils font émerger.

| Modèle | Décision centrale | Intérêt | Point à tester |
| --- | --- | --- | --- |
| Épreuve en secteurs | Préparer une voiture pour des segments successifs tels que départ, virages et ligne droite, puis choisir quand dépenser ses cartes et ressources. | Traduit les qualités automobiles en situations lisibles et valorise les préparations spécialisées. | Le résultat reste-t-il incertain après le choix initial de la voiture ? |
| Défis simultanés | Engager une voiture et une préparation face cachée, puis révéler les deux choix sur un défi connu ou partiellement annoncé. | Favorise la lecture de l’adversaire, les prises de risque et les retournements. | Le joueur dispose-t-il d’indices suffisants pour faire un choix éclairé ? |
| Duel d’endurance | Garder une voiture en piste et gérer les ressources, les changements de configuration et le moment des arrêts. | Donne une place à la régularité, aux économies de ressources et aux évolutions en cours de partie. | La gestion reste-t-elle lisible et rapide sur smartphone ? |

Pour construire le deck, comparer un format centré sur une voiture et ses pièces à un format qui permet d’engager plusieurs voitures selon l’épreuve. Vérifier que le joueur peut expliquer son choix, récupérer d’un mauvais départ et trouver un usage à une carte commune. Le format du deck, le nombre de tours, les conditions de victoire et les statistiques seront définis après les premiers essais.

### 5. Collection 001

**32 cartes candidates.** Les noms ci-dessous viennent du brief. Les versions précises, dénominations et caractéristiques techniques restent à vérifier. Les éditions artistiques s’ajoutent à la collection comme variantes visuelles et ne comptent pas comme modèles techniques supplémentaires.

| Famille | Cartes candidates |
| --- | --- |
| Populaires · 6 | 01 Renault Clio III 1.5 dCi · 02 Renault Twingo I · 03 Peugeot 205 GTI · 04 Citroën 2CV · 05 Volkswagen Golf GTI Mk1 · 06 Fiat Panda 4×4 |
| Sportives et légendes · 12 | 07 Chevrolet Corvette C4 ZR-1 · 08 Ferrari F40 · 09 Porsche 911 Turbo · 10 Toyota Supra Mk4 · 11 Nissan Skyline GT-R R34 · 12 Hennessey Venom F5 Revolution Evolution · 13 Mazda MX-5 NB · 14 Volkswagen Scirocco 24H · 15 Nissan Silvia S15 Spec-S · 16 Lotus Elise S1 · 17 McLaren F1 · 18 Lancia Stratos |
| Bases culturelles · 4 | 19 DeLorean DMC-12 · 20 Pontiac Firebird Trans Am · 21 Volkswagen Coccinelle · 22 Lotus Esprit S1 |
| Évolutions Lotus · 2 | 23 Lotus Elise 111S · 24 Lotus Elise Sport 190 |
| Éditions spéciales et fiction · 8 | 25 DeLorean temporelle (*Retour vers le futur*) · 26 KITT (*K2000*) · 27 Nissan Skyline de Brian (*2 Fast 2 Furious*) · 28 Choupette, Coccinelle nº 53 · 29 Lotus Esprit de James Bond · 30 Taxi de Korben Dallas (*Le Cinquième Élément*) · 31 Ecto-1 (*Ghostbusters*) · 32 Batmobile du film de 1989 |

### 6. Direction artistique et design des cartes

**Direction établie.** Rétro premium en 2D et 2.5D. Des silhouettes fidèles, des cadrages d’illustration automobile et une énergie de jeu rétro. Les aplats, les contours, les reflets et les éléments de décor donnent du volume. La lisibilité des cartes à l’écran prime sur la quantité d’effets. Le rendu low-poly générique est écarté.

| Édition | Traitement visuel |
| --- | --- |
| Classic | Illustration automobile fidèle, composition soignée et mise en valeur de la ligne et des détails d’origine. |
| Pixel Art | Pixel art détaillé inspiré du 16 et du 32 bits, pixels nets et palette maîtrisée. |
| Cel-Shading | Contours noirs affirmés, aplats saturés et effets de mouvement dessinés dans l’esprit d’Auto Modellista. |
| Abandoned | Peinture détériorée, rouille, poussière et végétation, dans une atmosphère mélancolique. |
| Solarpunk | Futur écologique, lumière naturelle, végétation abondante et technologies énergétiques intégrées au décor. |

**Gabarit proposé.** En vue compacte, rendre immédiatement lisibles le nom, l’illustration et un repère de rareté. En détail, afficher version, caractéristiques, affinités et capacités quand elles existent. Réserver le cadre et la finition aux signaux de collection. Identifier l’édition artistique et l’aura par des repères distincts. Associer un libellé ou un symbole à la couleur pour les informations importantes.

**Cartes animées.** Donner un mouvement propre à la voiture ou une interaction avec le décor. La Skyline peut entrer en drift et laisser ses traces, la DeLorean apparaître dans un flash électrique, le taxi du *Cinquième Élément* arriver en vol, et l’Elise suivre une trajectoire avec un mouvement de caméra stylisé. En Abandoned, pluie, poussière et feuilles animent la scène. En Solarpunk, les reflets et la lumière solaire évoluent. Combiner calques, sprites, masques, parallaxe et effets légers. Prévoir un visuel fixe lisible pour la vue compacte et le mode mouvement réduit.

**Références visuelles du projet**

| Référence | Usage |
| --- | --- |
| [Carte néon du Renault Clio III.png](https://chatgpt.com/library?file_id=libfile_92b1e307eaec8191add586207c3cafda&account_id=personal) | Traitement collector d’une citadine et hiérarchie entre illustration, fiche et capacités. |
| [Carte holographique Venom F5 Révolution.png](https://chatgpt.com/library?file_id=libfile_1089c66398f4819188a3b0650e6394a3&account_id=personal) | Traitement holographique et intensité visuelle d’une découverte exceptionnelle. |
| [Renault Clio III au coucher du soleil.png](https://chatgpt.com/library?file_id=libfile_c3c32243b1348191aa4356e602bc84cc&account_id=personal) | Mise en scène d’une voiture du quotidien dans un décor illustré. |
| [Affiche pixel art de la Venom F5.png](https://chatgpt.com/library?file_id=libfile_02c9541a6b9481919077ca98fef49c64&account_id=personal) | Référence pour l’édition Pixel Art et la présentation d’une hypercar. |
| [Infographie rétro : comparatif de voitures.png](https://chatgpt.com/library?file_id=libfile_0d8d3f0f48c8819193630297ff36ea75&account_id=personal) | Point de départ du contraste entre les deux véhicules. |

### 7. Ouverture des boosters

C’est la première interaction à prototyper. Chaque qualité de booster doit se reconnaître à son sachet. L’habillage, le geste, le son et la révélation doivent fonctionner ensemble. Le nombre de qualités, leurs noms et leurs probabilités restent à définir.

| Temps | Interaction et retour attendu |
| --- | --- |
| Prise en main | Le sachet réagit dès le contact. Il se plie légèrement sous le doigt, avec un début de mouvement le long de la zone de déchirure. |
| Déchirure | Le geste entraîne la ligne d’ouverture. La tension monte jusqu’à la rupture, puis les deux bords se détachent avec un rebond, un son bref et un retour haptique si disponible. |
| Sortie du paquet | La pile apparaît dans un mouvement court et se stabilise, prête à être manipulée. |
| Révélation | Le joueur découvre cinq cartes une à une, à son rythme. Les retours varient en intensité selon la rareté. |
| Carte exceptionnelle | Une courte anticipation précède un impact synchronisé. L’illustration animée, si elle existe, prend le relais. Le nom et la voiture restent lisibles. |
| Récapitulatif | Les cinq cartes sont consultables ensemble. Une action ramène au garage où elles sont visibles immédiatement. |

**Accès direct.** Prévoir un bouton d’ouverture pour remplacer le geste, une commande pour révéler rapidement les cinq cartes, une option de mouvement réduit et des réglages pour le son et les vibrations. Un abandon avant ouverture doit permettre de retrouver le sachet. Après ouverture, une interruption ou un rechargement doit retrouver le même lot et l’attribuer une seule fois. Ce comportement est à vérifier sur le prototype.

**Économie à étudier.** La qualité du booster peut modifier la distribution des raretés. Définir d’abord ce qui rend chaque qualité intéressante, comment le joueur obtient les sachets et comment les doublons alimentent la progression. Le prototype utilise des données locales de démonstration et des tirages contrôlables pour tester une ouverture ordinaire et une révélation exceptionnelle.

### 8. Architecture proposée

Application web responsive, conçue d’abord pour les smartphones Android et iOS, avec installation PWA à étudier. Vue 3 et TypeScript sont des candidats pour les écrans, les données et les interactions. L’intérêt de Nuxt dépendra des besoins de navigation, de distribution et d’installation. Le choix sera confirmé à partir d’un essai du geste de déchirure et d’une carte animée sur appareils réels.

Séparer le catalogue, la progression et les règles de jeu du rendu. Garder les menus et les informations de carte accessibles dans l’interface web. Essayer le rendu 2D natif pour les transitions courtes, puis évaluer PixiJS ou un moteur équivalent si le masquage, le compositing et les particules gagnent à utiliser un rendu dédié. Les animations et visuels doivent être remplaçables par carte. La sauvegarde locale est une piste pour conserver le garage et reprendre une ouverture.

### 9. Feuille de route et critères de validation

**Phase 1 · Conception.** Stabiliser le catalogue et son modèle de données, dessiner le gabarit de carte, comparer les trois pistes de duel, préciser la progression, l’aura et les compatibilités, puis scénariser l’ouverture du booster. Le brief prévoit trois regards spécialisés pour les ateliers de conception, game design, systèmes et économie, direction artistique et UX. L’orchestration assure la cohérence technique et la synthèse. Les propositions sont à confronter avant arbitrage.

**Phase 2 · Prototype vertical, après validation.** Prioriser un accueil et un garage mobile, puis un booster déchirable et la révélation de cinq cartes. Intégrer plusieurs styles graphiques et au moins une carte animée, puis ajuster les sons, l’haptique et le rythme sur appareil. Le périmètre du prototype exclut paiement et multijoueur.

Le prototype est prêt à être évalué quand on peut, sur smartphone, ouvrir un sachet au doigt ou via un bouton, révéler cinq cartes, distinguer une révélation ordinaire d’une exceptionnelle, passer les animations, utiliser le mode mouvement réduit et retrouver ses cartes dans le garage après rechargement. La question du test joueur est simple. Aurait-il envie d’ouvrir un autre booster même sans lancer de partie ?

**Arbitrages avant développement.** Retenir le format de duel à tester, préciser la structure du deck et les conditions d’évolution, décider du rôle de l’aura, sélectionner les voitures et éditions de la première démo, choisir les qualités de boosters à représenter et valider le rendu de la déchirure. Les tables de probabilités, l’équilibrage et l’économie complète peuvent attendre les essais.

**Droits et provenance.** Tenir un registre des marques, véhicules, livrées, logos, œuvres et visuels de référence, avec une option de remplacement pour chaque contenu concerné. Avant toute diffusion publique, faire vérifier les droits applicables aux contenus retenus, y compris pour une diffusion gratuite.

---

Document de départ · [Master Prompt GarageVerse](https://chatgpt.com/library?file_id=libfile_f9e9b0c4a8a88191a3bb500cf26bf419&account_id=personal)

## Lancer le prototype mobile

Prérequis local : Node.js 22 ou plus récent et Yarn 4.5.3 via Corepack. Si Corepack est absent, l’installer avec `npm install --global corepack`.

```sh
corepack yarn install --immutable
corepack yarn dev
```

Ouvrir l’adresse affichée par Vite. Sur un téléphone connecté au même Wi-Fi privé, lancer `corepack yarn dev --host 0.0.0.0` et ouvrir l’adresse **Network** affichée par Vite. Pour vérifier le typage et produire le build, lancer `corepack yarn build`.

Le premier sachet est **Collection 001**. Le deuxième, **After Hours**, est aussi accessible depuis l’accueil. Pour rejouer l’essai à zéro, utiliser une nouvelle fenêtre de navigation privée ou effacer les données du site. La sauvegarde est propre au navigateur et à l’adresse utilisée.

### Premier essai joueur

1. Ouvrir l’accueil et laisser la personne découvrir seule le sachet. Observer où elle pose le doigt, si elle trouve le bon geste et à quel moment elle passe au bouton.
2. La laisser retourner les cartes à son rythme, consulter le récapitulatif et rejoindre le garage. Observer si elle lance spontanément un deuxième booster et à quel moment elle en a eu envie.
3. Après le deuxième lot, lui demander quelle révélation lui est restée en tête et si elle retrouve les deux éditions de la Venom et l’aura de la Skyline de Brian dans le garage.

### Visuels de démonstration

Les illustrations WebP dans `src/assets/` sont remplaçables. L’affiche Pixel Art fournie sert d’illustration à l’édition alternative de la Venom. Les illustrations Classic, le décor de nuit et le calque de la Skyline sont générés pour le prototype privé. Le catalogue relie les visuels aux cartes dans `src/catalog.ts`.
