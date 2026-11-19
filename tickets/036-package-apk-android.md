# T-036 · Produire un package APK Android

- **Type :** Technique / distribution
- **Priorité :** P2
- **Statut :** À implémenter ; aucune diffusion publique sans accord
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
- [ ] Aucune diffusion (Play Store, itch.io Android, lien public) sans accord du propriétaire.

## À arbitrer

- Distribution visée : fichier transmis à la main, itch.io (canal Android), ou Play Store (compte développeur, fiche, politique de confidentialité, et questions de marques déjà notées dans T-022).
- Faut-il réduire le poids de l'APK (images WebP ou AVIF, tailles adaptées au téléphone) ?
