# T-029 · Interface : des boutons propres pour le choix automatique / manuel

- **Type :** Finition d'interface
- **Priorité :** P2
- **Statut :** À corriger ; **dépend des prototypes T-026, T-027 et du choix de pilotage (tâche T-028 du backlog), pas encore dans `dev`**
- **Signalement :** Retour du joueur, 18 novembre 2026 : « Je veux des boutons propres pour l'automatique, là c'est dégueulasse. »
- **Fichiers à examiner :** [`src/views/RaceView.vue`](../src/views/RaceView.vue) (sélecteur « Pilotage », boutons `input[name=race-pilot]`, bouton `.pilot-switch` « Passer en automatique pour la suite »), [`src/themes/shared.css`](../src/themes/shared.css) et les thèmes de `src/themes/`, [`src/components/GvButton.vue`](../src/components/GvButton.vue)

## Problème observé

Le choix entre la course **automatique** (avec le hasard, comme avant) et le pilotage **manuel** est présenté avec des **cases rondes de formulaire** dans un cadre simple, suivies d'un paragraphe d'explication. Le rendu ne ressemble ni aux boutons ni aux filtres du reste du jeu. Le bouton « Passer en automatique pour la suite », affiché pendant une course manuelle, est lui aussi un bouton discret qui se perd au-dessus du secteur.

## Comportement attendu

- Un **sélecteur à deux gros boutons** (type commutateur segmenté), au style des filtres et des boutons du jeu (`GvButton`, variante filtre ou équivalent), avec un **état actif clairement visible** et un libellé court pour chaque choix : « Automatique » et « Manuel », l'explication passant en sous-titre ou en bulle d'aide plutôt qu'en paragraphe.
- Cibles tactiles d'au moins 44 px, utilisables au pouce, lisibles à 320 et 390 px, avec un état distinct sans reposer sur la couleur seule.
- Le bouton « Passer en automatique pour la suite » reprend le même langage visuel et reste lisible sans masquer le secteur en cours.
- Même rendu cohérent dans les **huit thèmes**, clavier et lecteur d'écran préservés (un groupe de choix exclusif, état annoncé).

## Critères d'acceptation

- [ ] Le choix automatique / manuel n'utilise plus de cases rondes brutes : deux boutons au style du jeu, état actif évident.
- [ ] Le bouton de bascule en cours de course est assorti au même style.
- [ ] Vérifié à 320, 390 et 1280 px et dans les huit thèmes ; aucun débordement horizontal.
- [ ] Textes en français **et** en anglais (`t(…)`, traductions dans `src/i18n/en/`).
- [ ] Captures avant/après ; aucune régression de la course ni du choix mémorisé.
