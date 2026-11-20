# T-040 · Produire un package APK Android

- **Type :** Technique / distribution
- **Priorité :** P2
- **Statut :** APK personnel debug implémenté dans `dev` (Capacitor, workflow « APK Android ») ; à installer et valider sur téléphone. Édition publique, signature release et diffusion : à faire, sur accord
- **Signalement :** demande du joueur du 19 novembre 2026 : « réaliser un package apk »
- **Tickets liés :** [T-022 · Android, PWA et premier lancement](022-android-pwa-premier-lancement.md) (étude plus large, dont ce ticket réalise la partie APK)
- **Fichiers à examiner :** [`vite.config.ts`](../vite.config.ts), [`package.json`](../package.json), [`public/manifest.webmanifest`](../public/manifest.webmanifest), [`src/main.ts`](../src/main.ts), [`src/game/offline.ts`](../src/game/offline.ts), [`src/game/asset-loading.ts`](../src/game/asset-loading.ts), [`src/game/save.ts`](../src/game/save.ts), [`src/game/versus.ts`](../src/game/versus.ts), [`.github/workflows/itchio.yml`](../.github/workflows/itchio.yml)

## Objectif

Obtenir un fichier **`.apk` installable sur un téléphone Android**, construit à partir du même code que GitHub Pages et itch.io, jouable **hors ligne** dès l'installation, avec l'icône et le nom GarageVerse.

## Constat dans le code actuel

- Le build Vite utilise `base: './'` : il fonctionne déjà depuis un dossier local, ce qu'il faut pour un WebView.
- Le service worker (`offline.ts`) n'est enregistré qu'en production web hors itch ; dans un APK, tous les fichiers seront déjà sur l'appareil, il ne sert à rien.
- Le chargement en arrière-plan (`asset-loading.ts`, v0.18.0) télécharge environ 70 Mo d'illustrations. Dans un APK, il doit lire les fichiers **embarqués** et ne rien télécharger.
- La sauvegarde est dans `localStorage`. Dans un WebView, elle reste sur l'appareil, mais elle est **effacée à la désinstallation** et séparée de celle du navigateur. L'export/import de sauvegarde existant permet le transfert.
- Les Échanges et le Versus utilisent Supabase avec une connexion anonyme (`signInAnonymously`). Il faut vérifier que l'origine de l'APK (`https://localhost` ou `capacitor://`) est acceptée par Supabase.
- Le `dist/` pèse environ 71 Mo : l'APK fera un peu plus, sans compter un éventuel tri des images.

## Approche proposée (à valider)

1. **Capacitor** (recommandé) : enveloppe le `dist/` dans un projet Android natif, maintenu et compatible Vite. Cordova ou une TWA Play Store sont des alternatives. Une TWA demande un domaine vérifié et ne fonctionne pas hors ligne sans service worker.
2. Ajouter un mode de build `android` (comme `itch`) : pas de service worker, pas de téléchargement en arrière-plan.
3. Prendre le **numéro de version** dans `package.json` (versionName ; versionCode calculé, par exemple 0.18.0 → 1800).
4. Prévoir l'icône adaptative et le splash Android à partir des icônes existantes, sans remplacer le **splash GAMEDAVE** joué au lancement du jeu.
5. Gérer le **bouton Retour Android** : revenir à l'écran précédent du jeu (garage, accueil) au lieu de fermer l'application d'un coup.
6. Bloquer l'écran en **portrait**, respecter les zones sûres (encoche, barre de navigation) et utiliser le plein écran.
7. Ajouter un workflow GitHub qui construit l'APK **sur demande uniquement** (comme la publication itch), et le met à disposition en artefact.

## Signature

- Une première étape peut produire un APK **debug**, installable en mode « sources inconnues ».
- Une version **release** demande une clé de signature. Elle doit être créée par le propriétaire et rangée dans les **secrets GitHub**, jamais dans le dépôt ni dans une conversation. Si elle est perdue, plus aucune mise à jour n'est possible pour les joueurs qui ont déjà l'application installée.

## Édition publique sans licences

Analyse des droits du 19 novembre 2026, qui n'est pas un avis juridique. Avant une diffusion publique, en particulier sur le Play Store, les **13 véhicules de films, de séries et de vidéastes** sont le risque principal. Ils appartiennent à des studios qui défendent leurs licences, et la Batmobile est même reconnue comme « personnage » protégé (*DC Comics v. Towle*, 2015) :

`bttf`, `kitt`, `brian`, `herbie`, `bond`, `taxi`, `ecto1`, `batmobile`, `eleanor`, `domcharger`, `jpjeep`, `interceptor`, `1000tipla`.

**Cacher ces cartes ne suffit pas.** Une carte masquée ou déblocable reste dans le paquet : images, noms et textes peuvent en être extraits, et le Play Store analyse aussi ces fichiers. C'est la diffusion qui compte, pas l'affichage. Un déblocage secret montrerait en plus que le contenu a été caché volontairement.

**Approche retenue : deux versions issues du même code.**

1. Un mode de build **public** (sur le modèle du mode `itch`) retire ces cartes du roster avant le build. Leurs illustrations, éditions, pixel art et animations ne sont plus importées, donc absentes du `dist/`. La liste des cartes exclues vit dans un seul fichier, facile à compléter.
2. Le build **privé** (GitHub Pages, APK personnel) garde le roster complet.
3. **Sauvegardes :** un joueur qui ouvre la version publique avec une carte exclue reçoit une compensation définie à l'avance (crédits ou carte équivalente), une seule fois, sans plantage ni perte d'apparence sur ses autres cartes.
4. **Échanges et Versus :** une carte exclue ne peut ni être proposée ni arriver par échange dans la version publique. Le serveur doit refuser l'échange vers un joueur qui ne peut pas la recevoir, ou les deux versions restent séparées.
5. **Séries de collection, rivaux, défi du jour, Nuit sans fin :** ils restent complets et jouables sans ces cartes. Une série qui en dépend est adaptée ou masquée.
6. **Plus tard, seulement si le Play Store l'exige :** la même mécanique peut produire une **édition sans marques**, avec des modèles renommés et des formes modifiées (voir T-022 et T-024).

Autres points relevés par l'analyse :
- Vérifier avec quel forfait Suno les musiques et bruitages ont été créés. Ceux créés avec le forfait gratuit sont réservés à un usage non commercial et restent la propriété de Suno.
- Embarquer les polices Google Fonts (licence OFL) dans le paquet, avec le texte de leur licence.
- Ajouter un écran de crédits avec les licences MIT (Vue, Supabase, qrcode, Capacitor) et la mention « non affilié aux constructeurs ni aux studios cités ».
- Vérifier que le nom « GarageVerse » n'est pas déjà déposé avant une fiche Play Store.

## Critères de validation

- [ ] L'APK s'installe sur un Android récent, et sur un plus ancien à choisir (par exemple Android 8).
- [ ] Le jeu démarre en mode avion, sans écran blanc ; le splash GAMEDAVE et l'écran de chargement s'affichent correctement.
- [ ] Toutes les illustrations s'affichent sans réseau, et aucun téléchargement de 70 Mo n'a lieu.
- [ ] La sauvegarde survit à la fermeture de l'application et au redémarrage du téléphone ; l'export/import fonctionne.
- [ ] Le son, la vibration, le pilotage manuel tactile et les virages répondent sans latence perceptible.
- [ ] Le bouton Retour Android a un comportement prévisible.
- [ ] Les Échanges et le Versus fonctionnent depuis l'APK, ou sont masqués proprement s'ils ne fonctionnent pas.
- [ ] La version affichée dans les Réglages correspond à celle de l'APK.
- [ ] `rules.ts`, `data.ts` et `supabase/` sont inchangés, sauf accord explicite.
- [ ] Le build public ne contient aucun fichier, nom ni texte des 13 cartes exclues (vérifié par une recherche dans le `dist/` et l'APK).
- [ ] Une ancienne sauvegarde qui contient une carte exclue s'ouvre dans la version publique avec la compensation prévue.
- [ ] Aucun échange ne peut faire arriver une carte exclue dans la version publique.
- [ ] Aucune diffusion (Play Store, itch.io Android, lien public) sans accord du propriétaire.

## À arbitrer

- Distribution visée : fichier transmis à la main, itch.io (canal Android), ou Play Store (compte développeur, fiche, politique de confidentialité, et questions de marques déjà notées dans T-022).
- Faut-il réduire le poids de l'APK (images WebP ou AVIF, tailles adaptées au téléphone) ?
