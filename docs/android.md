# APK Android personnel

L’APK debug de GarageVerse embarque le jeu et son roster complet. Tu peux jouer hors ligne dès l’installation. Les Échanges et le Versus nécessitent une connexion.

## Construire l’APK

Dans GitHub, ouvre **Actions → APK Android**, lance **Run workflow** sur la branche voulue, puis télécharge l’artefact `garageverse-apk-debug` depuis le résumé de l’exécution. Décompresse l’archive pour récupérer `garageverse-<version>-debug.apk`.

En local, installe le JDK 21 et le SDK Android (plateforme API 36), puis installe les dépendances du dépôt avec `yarn install --immutable`. Depuis la racine du dépôt, lance les commandes suivantes.

```sh
yarn build:android
cd android && ./gradlew assembleDebug
```

L’APK local se trouve dans `android/app/build/outputs/apk/debug/app-debug.apk`.

## Installer et conserver ta sauvegarde

Copie l’APK sur ton téléphone, ouvre-le dans ton gestionnaire de fichiers et, si Android te le demande, autorise temporairement cette application à installer des applications de sources inconnues.

La sauvegarde de l’APK est séparée de celle de ton navigateur. Utilise l’export et l’import dans les Réglages pour transférer ta partie. La désinstallation efface la sauvegarde locale de l’APK. Garde une copie de ton export avant de désinstaller ou de remplacer une installation dont la signature debug diffère.

## Limites et vérifications sur téléphone

Cette version est réservée à un usage personnel. L’édition publique et la signature release restent à faire.

Sur un appareil, vérifie les Échanges et le Versus via Supabase depuis l’origine `https://localhost` du WebView. Contrôle les réponses CORS, la conservation de la session anonyme après relance et le comportement de `navigator.onLine` en coupant puis en rétablissant la connexion.
