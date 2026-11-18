# Passation GarageVerse (18 novembre 2026)

Suite de [`passation.md`](passation.md) (16 novembre, en partie datée : elle parle encore de la version 0.5.0). À lire avec [`meta.md`](meta.md), [`i18n.md`](i18n.md), [`echanges.md`](echanges.md) et [`../orchestrator/README.md`](../orchestrator/README.md).

## 1. État du dépôt

- **Deux branches seulement** : `master` (publiée, déploie le site à chaque push) et `dev` (travail en cours, jamais déployée). Aucune autre branche ni PR ouverte au moment de cette note.
- **`master` = version 0.14.0** (publiée le 18 novembre) : jeu **bilingue français / anglais** avec sélecteur de langue, et couleur de rareté identique dans le garage et la fiche agrandie (T-025).
- **`dev` a de l'avance sur `master`** (non publié, à publier ensemble avec une version et des notes FR **et** EN, probablement 0.15.0) :
  - prototypes de course, **désactivés par défaut** : compteur de vitesses (T-026), virages en jeu de rythme (T-027), choix automatique / manuel (T-028), réglage « Mode timing (expérimental) » dans Réglages › Paramètres ;
  - T-029 (boutons du choix automatique / manuel), T-030 (bouton de l'ouverture d'un booster à place fixe), T-031 (une seule tuile par tirage) ;
  - règles pures des échanges de cartes `src/game/trade.ts` (**non branchées** : ni serveur, ni interface) ;
  - aperçu itch.io, correctifs de CI et de l'orchestrateur, tickets et documents.
- **Tags** : `v0.1.0` à `v0.14.0` (un tag annoté par version, sur le commit qui change la version), `v0.14.0-dev.1`, et `deploy/AAAA-MM-JJ-HHMM` pour chaque déploiement de `master`.
- **Versus V1 : en pause** (depuis la 0.13.1). Le serveur est déployé, le mode est fermé côté joueur. La graine secrète est en place.

## 2. Ce qui a été fait (17-18 novembre)

- **i18n** : le français du code est la clé (`t('…')`, `tp(…)`, contexte `tc`, silencieux `tq`) ; dictionnaire `src/i18n/en/` (~1 720 phrases) ; langue fixée au chargement, un joueur qui a déjà une partie reste en français ; contrôle `node src/i18n/i18n.check.cjs`. Les noms, versions et titres d'œuvres des voitures sont traduits au démarrage par `src/i18n/localize-data.ts` (`data.ts` ne change pas : il est recopié pour le serveur).
- **itch.io** : page en brouillon, canal `html5-dev` alimenté à chaque push sur `dev` (tâche `publish-dev`, environnement GitHub `itchio-dev` limité à `dev`) ; publication du canal `html5` réservée à `master` (environnement `itchio-release`). Premier envoi réussi le 18 novembre.
- **Orchestrateur** : chaînes de modèles par phase (`config.json`, `agents.ts`), profil de tâche (`light`, `standard`, `heavy`), **tronc d'intégration** à la place du clone `.orchestrator/source` (voir §3), Chrome en `fr-FR`.
- **Tickets** : T-025 corrigé, T-026 à T-028 prototypés, T-029 à T-031 traités, T-008 réécrit (échanges dissociés du Versus), T-007 recentré sur le palmarès.

## 3. Orchestrateur : mode d'emploi à jour

```sh
node orchestrator/cycle.ts doctor
node orchestrator/cycle.ts queue <tâche> [<tâche>…] --integrate --dry-run   # toujours valider d'abord
node orchestrator/cycle.ts queue <tâche> [<tâche>…] --integrate             # long : à lancer en arrière-plan
node orchestrator/cycle.ts land                                              # reprend le tronc dans dev
```

- Une tâche = `orchestrator/backlog/<id>.json` (brief, exigences, `paths`, `browser`, `flow`). **Une seule file à la fois** (chaque cycle s'appuie sur le tronc).
- Avec `--integrate`, chaque cycle validé empile ses commits sur `refs/orchestrator/dev` (référence cachée) sans toucher à `dev` ni au dossier de travail. Les cycles suivants partent du tronc. **`land`** (sur `dev`, arbre propre) reprend les commits : avance rapide, ou reprise commit par commit si `dev` a avancé.
- **Après chaque cycle** : lire `state.json` (statut, constats de la revue), puis `land`, puis **vérifier soi-même** : `node node_modules/.bin/vue-tsc --noEmit`, `node src/i18n/i18n.check.cjs`, toutes les `src/game/*.check.cjs` et `pipeline/check-daily.cjs`, `corepack yarn build`, `npm --prefix orchestrator test`, et la différence sur `src/game/rules.ts`, `src/game/data.ts` et `supabase/` doit être **vide** (sauf tâche serveur). Puis push.
- Un cycle consomme environ 0,4 à 1,7 million de jetons et 5 à 9 appels ; **un rapport « bloqué » de l'implémenteur coupe la file**. Si Codex ou Antigravity manque de quota, le relais de modèle est automatique (journal `relais par …`).
- Le parcours Chrome de l'orchestrateur ne joue que la boutique, l'ouverture, le garage, la fiche et **une** course standard, plus le `flow` de la tâche (démo des prototypes). Les intégrations en course ne sont pas couvertes : les jouer à la main (script Playwright, 390 px) avant de conclure.
- `browser.ts` reçoit un chemin **absolu** pour `dist` (un chemin relatif donne une page blanche).
- Tout nouveau texte visible d'une tâche passe par `t()` avec sa traduction dans `src/i18n/en/` : l'écrire dans le brief (cf. les tâches existantes).

## 4. Échanges de cartes (chantier en cours, avant le Versus)

Spécification : [`echanges.md`](echanges.md) ; ticket : `tickets/008-echanges-de-cartes.md`. Dissocié du Versus (décision du 18 novembre), **liste d'amis avec demande acceptée par l'autre** retenue.

| Étape | Contenu | État |
| --- | --- | --- |
| `echange-regles` | `src/game/trade.ts` + `trade.check.cjs` : validation, transit, réception unique, retour, doublons, quarantaine, conservation (1 200 opérations) | **Fait**, dans `dev` (+ corrections) |
| `echange-amis` | Migration `gv_friendships`, `request-friend`, `answer-friend`, écran Amis | À faire |
| `echange-serveur` | `gv_showcase`, `gv_trades`, `gv_trade_items`, `gv_trade_claims`, RLS, `set-showcase`, `propose-trade`, `answer-trade`, `claim-trade`, expiration par `resolve-due` | À faire |
| `echange-client` | Client réseau, transit et réception dans la sauvegarde | À faire |
| `echange-interface` | Vitrine, offres, contre-offres, historique, entrée « Échanges » du Garage | À faire |

- **Chaque migration SQL est relue par le propriétaire avant fusion dans `master`** (la fusion déclenche le déploiement Supabase). Les présenter avant tout push, ne jamais les fusionner sans accord.
- Choix de l'agent laissés ouverts : l'historique des échanges terminés garde un marqueur par échange sans limite (≈40 octets chacun) ; les pièces montées sur une voiture réacquise sont démontées au retour sans avertissement (à traiter avec l'interface).
- Le serveur garantit l'échange et son unicité, **pas l'honnêteté des garages** (sauvegardes locales).

## 5. Actions en attente du propriétaire

1. **itch.io** : après le premier envoi, cocher « This file will be played in the browser » pour le fichier du canal `html5-dev`. Régénérer la clé d'API (elle est apparue en clair dans une conversation).
2. **Ancien clone** `.orchestrator/source` (159 Mo, ignoré par Git, plus utilisé) : `rm -rf .orchestrator/source`. Un agent n'a pas pu le supprimer (refus du système de permissions).
3. **Publication de `dev`** : décider quand publier, puis version + notes joueur FR et EN (`CHANGELOG.md` et `CHANGELOG.en.md`, même version, même date).
4. **Playtest des prototypes de course** sur téléphone : barème (−2/−1/0/+1), un ou plusieurs passages par secteur, difficulté par rival (aujourd'hui un hachage de son identifiant, pas son niveau), mode manuel plus ou moins payant que l'automatique, garder ou non deux modes.
5. **Versus** : décider de sa reprise (les échanges ne l'attendent plus).

## 6. Pièges connus (appris cette session)

- **Vérifier la branche cible d'une PR avant de la fusionner.** Une PR « ci(deploy) » visait `master` : sa fusion a déclenché un redéploiement du site (sans changement de contenu).
- **D'autres sessions Claude ouvrent des PR** (branches `claude/project-thread-…`). Les comparer à `dev` avant de les fusionner ; une PR a fait doublon avec le correctif T-025 et a été fermée.
- **`rules.ts` et `data.ts` sont recopiés tels quels côté serveur** (`supabase/sync-rules.mjs`, contrôlé par `src/game/supabase.check.cjs`) : ne pas y importer `t` ni de module du client. Toute traduction passe par l'affichage ou par `src/i18n/localize-data.ts`.
- **Une valeur de logique reste française** (`Légendaire`, tags, identifiants, clés de `localStorage`) : on traduit à l'affichage, jamais la donnée.
- Un même mot français à deux sens a deux entrées : `tc('contexte', 'mot')` avec la clé `contexte|mot` (ex. « Série » collection / série télé, « Annuler » / « Undo »).
- **Pas de `git stash` ni de suppression de dossier « pour essayer »** : une suppression de dossier et l'enregistrement d'un secret ont été refusés par le système de permissions ; laisser le propriétaire les faire (`! commande`).
- Le propriétaire utilise surtout **le mobile** (application GitHub mobile sans réglages d'environnement ni de secrets : passer par le navigateur en « version pour ordinateur » ou par `! gh …`).
- **Tags** : un tag annoté par version, sur le commit qui change `version` dans `package.json` ; un tag `deploy/…` par déploiement de `master`.
- Notes de version : français **et** anglais (le build refuse une version sans entrée dans les deux), jamais de gras ou d'italique imbriqués.

## 7. Où regarder

| Sujet | Fichier |
| --- | --- |
| Règles du jeu, thèmes, aide, économie | `docs/meta.md` |
| Traduction | `docs/i18n.md`, `src/i18n/` |
| Échanges | `docs/echanges.md`, `tickets/008-echanges-de-cartes.md`, `src/game/trade.ts` |
| Versus (en pause) | `docs/versus.md`, `docs/supabase.md`, `supabase/` |
| Itch.io | `docs/itchio.md`, `.github/workflows/itchio.yml` |
| Orchestrateur | `orchestrator/README.md`, `orchestrator/backlog/` |
| Tickets | `tickets/README.md` |
