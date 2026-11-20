# T-043 · Bouton « Mettre à jour » quand une nouvelle version est publiée

- **Type :** Fonctionnalité / distribution
- **Priorité :** P2
- **Statut :** Livré en v0.21.0 ; à valider sur téléphone
- **Signalement :** demande du joueur du 19 novembre 2026 : « ajouter un bouton de mise à jour quand une mise à jour est disponible »
- **Tickets liés :** [T-040 · APK Android](040-package-apk-android.md), [T-022 · PWA](022-android-pwa-premier-lancement.md)
- **Fichiers à examiner :** [`public/sw.js`](../public/sw.js), [`src/game/offline.ts`](../src/game/offline.ts), [`src/main.ts`](../src/main.ts), [`vite.config.ts`](../vite.config.ts) (`__APP_VERSION__`), [`src/game/releases.ts`](../src/game/releases.ts) (notes de version affichées au premier lancement), [`src/App.vue`](../src/App.vue), [`scripts/package-itch.mjs`](../scripts/package-itch.mjs)

## Constat

- **Rien ne prévient le joueur qu'une nouvelle version est en ligne.** Sur GitHub Pages, le service worker charge la page depuis le réseau à chaque ouverture : une version publiée n'est donc prise en compte qu'au **prochain lancement complet**.
- Une application installée sur l'écran d'accueil, ou un onglet laissé ouvert, peut rester **des heures ou des jours sur l'ancienne version**, sans le savoir. Le nouveau service worker attend (« Le worker en attente prendra la main au prochain lancement »).
- Sur **itch.io**, il n'y a pas de service worker : la version change seulement quand la page est rechargée.
- Les notes de version (`releases.ts`) s'affichent déjà au premier lancement d'une nouvelle version : c'est le bon moment pour expliquer ce qui a changé après la mise à jour.

## Comportement attendu

1. **Détection.** Le jeu vérifie s'il existe une version plus récente que celle en cours (`__APP_VERSION__`) :
   - au lancement, au retour dans l'application (`visibilitychange`), puis toutes les 30 minutes environ tant qu'il est ouvert ;
   - seulement en ligne et onglet visible, sans requête inutile.

   **Piste :** générer au build un petit `version.json` (version de `package.json`) servi à côté du jeu, lu sans cache (`cache: 'no-store'`) et exclu du cache du service worker. Il fonctionne aussi sur itch.io. Sur GitHub Pages, on peut aussi s'appuyer sur `registration.update()` et le worker en attente (`registration.waiting`).
2. **Bouton.** Quand une nouvelle version est détectée, un bandeau discret ou une pastille propose **« Mise à jour disponible · Mettre à jour »**, visible depuis l'accueil et le garage sans gêner le jeu. Il apparaît une fois par version et peut être fermé (« Plus tard »).
3. **Mise à jour.** Le bouton :
   - enregistre la sauvegarde ;
   - active le nouveau service worker s'il y en a un (`skipWaiting` à la demande, déclenché par le bouton et non automatiquement) ;
   - recharge la page.

   Au redémarrage, les notes de la nouvelle version s'affichent comme aujourd'hui.
4. **Sécurité de la partie.**
   - Pas de rechargement pendant une course, une ouverture de booster, une Nuit sans fin en cours de manche ou un échange en cours de synchronisation.
   - Dans ces cas, le bouton attend la fin de l'action ou précise « Termine d'abord ta course ».
   - Jamais de rechargement automatique sans action du joueur.
5. **Hors ligne :** aucun message d'erreur, la vérification reprend au retour du réseau.
6. **APK** ([T-040](040-package-apk-android.md)), plus tard : le même mécanisme peut pointer vers le téléchargement du nouvel APK. Ce n'est pas exigé ici.

## Contraintes

- Ne pas casser le mode hors ligne ni le cache existant. Le changement de `CACHE_NAME` ou le nettoyage des anciens caches reste cohérent.
- Ne pas modifier `rules.ts`, `data.ts` ni `supabase/`.
- Textes en français et en anglais. Mouvement réduit respecté.
- GitHub Pages et itch.io fonctionnent tous les deux.

## Critères de validation

- [ ] Avec la version N ouverte, la publication de N+1 fait apparaître le bouton en 30 minutes au plus, ou dès le retour dans l'application.
- [ ] Toucher « Mettre à jour » recharge sur N+1 sans perte de sauvegarde, puis les notes de N+1 s'affichent.
- [ ] Le bouton n'apparaît pas si la version est déjà à jour, ni hors ligne, ni deux fois pour la même version après « Plus tard ».
- [ ] Aucun rechargement pendant une course, un booster ou un échange en cours.
- [ ] Fonctionne sur GitHub Pages (avec service worker) et sur itch.io (sans service worker).
- [ ] vue-tsc, i18n, `src/game/*.check.cjs` et le build passent.
