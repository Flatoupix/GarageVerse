# Notes de version

Le jeu suit [SemVer](https://semver.org/lang/fr/) : `MAJEUR.MINEUR.CORRECTIF`. Tant que la version commence par 0, un changement de **mineur** apporte des nouveautés et un changement de **correctif** ne corrige que des défauts. La version affichée en bas des Réglages vient de `package.json`.

À chaque publication : changer `version` dans `package.json`, ajouter une entrée ici en tête, puis publier.

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
