# T-032 · Étoiles de victoire parfaite : conserver les trois emplacements des étapes

- **Type :** Correction de présentation / lisibilité de la progression
- **Priorité :** P2
- **Statut :** Partiellement livré, **affichage de la liste des rivaux à corriger** ; à valider sur téléphone
- **Signalement initial :** 18 novembre 2026 ; **précision du joueur :** 19 novembre 2026, exemple concret avec DJ Cassette
- **Fichiers :** [`src/views/RaceView.vue`](../src/views/RaceView.vue) (liste des rivaux et onglets Essais / Qualifs / Finale), [`src/game/save.ts`](../src/game/save.ts) (`perfectSteps` et `save.record`), [`src/game/data.ts`](../src/game/data.ts) (`rivalSteps`)
- **À ne pas confondre avec :** le nombre total d'étoiles, déjà calculé correctement.

## Problème confirmé

Chaque rival propose **trois étapes fixes**, dans cet ordre : **1. Essais, 2. Qualifs, 3. Finale**. La liste affiche bien trois symboles, mais elle les construit actuellement avec `'★'.repeat(perfectCount) + '☆'.repeat(3 - perfectCount)` : **les étoiles acquises se tassent toujours à gauche**.

Ainsi, si le joueur a réalisé une victoire parfaite à **Essais** et en **Finale**, mais **pas à Qualifs**, la liste montre à tort `★★☆`. Cela suggère que la Finale n'a pas été réussie et ne dit pas quelle course rejouer.

Le stockage des victoires parfaites est pourtant déjà **distinct pour chaque étape**. Les onglets ouverts sur un rival indiquent également la perfection par étape. Il s'agit d'une **correction d'affichage**, pas d'un nouveau système de récompense.

## Comportement attendu

**Les emplacements sont immuables et représentent toujours les étapes 1, 2 et 3 dans cet ordre.** Chaque étape détermine indépendamment si l'étoile correspondante est pleine (`★`) ou vide (`☆`).

| Essais (1) | Qualifs (2) | Finale (3) | Affichage attendu |
| --- | --- | --- | --- |
| Non parfaite | Non parfaite | Non parfaite | `☆☆☆` |
| Parfaite | Non parfaite | Non parfaite | `★☆☆` |
| Non parfaite | Parfaite | Non parfaite | `☆★☆` |
| **Parfaite** | **Non parfaite** | **Parfaite** | **`★☆★`** |
| Parfaite | Parfaite | Parfaite | `★★★` |

**Cas réel demandé :** dans la ligne **DJ Cassette**, si les étapes 1 et 3 sont parfaites et la 2 ne l'est pas, afficher `★☆★` plutôt que `★★☆`. En ouvrant le rival, le joueur repère **Qualifs** comme étape à refaire.

- Réutiliser directement les **trois booléens ordonnés** de `perfectSteps(save, rival.id)` ; ne pas reconstituer la position des étoiles depuis `perfectCount`.
- Le compteur vocal « 2 victoires parfaites sur 3 » peut rester **en complément**, mais ne remplace pas les trois emplacements.
- Un emplacement manquant reste vide même si l'étape est verrouillée ; distinguer si nécessaire l'étape verrouillée via un autre indicateur, sans réordonner les étoiles.
- Dans les onglets d'étapes, conserver un état cohérent et laisser le joueur **revenir jouer l'étape manquante** selon les règles de déblocage déjà existantes.
- Ajouter des libellés accessibles par position (« Essais : parfaite ; Qualifs : non parfaite ; Finale : parfaite »), en français et en anglais, pas uniquement la lecture « 2 sur 3 ».
- Ne toucher ni aux scores, ni à l'attribution des récompenses, ni à la structure de la sauvegarde.

## Critères d'acceptation

- [ ] Pour DJ Cassette avec **Essais + Finale parfaites**, l'indicateur montre exactement **`★☆★`**.
- [ ] Quand **seule Qualifs** est parfaite, l'indicateur montre `☆★☆` et non `★☆☆`.
- [ ] Les trois positions sont toujours dans l'ordre **Essais / Qualifs / Finale** et ne changent jamais en fonction du nombre d'étoiles.
- [ ] Les données historiques de `save.record` s'affichent correctement sans migration ni recalcul.
- [ ] L'étape manquante peut être identifiée et rouverte depuis les onglets du rival si elle est débloquée.
- [ ] Vérifier tous les 8 cas possibles (2³) et la restitution accessible, sur mobile 320/390 px et desktop.
- [ ] Le fonctionnement des spéciales, des victoires parfaites et des récompenses ne régresse pas.

**Livrable :** remplacement du compteur d'étoiles compactées par trois étoiles positionnelles, et test de non-régression. 
