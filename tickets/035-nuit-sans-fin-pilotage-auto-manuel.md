# T-035 · Nuit sans fin : choisir le pilotage automatique ou manuel sans perdre sa série

- **Type :** Fonctionnalité / ergonomie de course
- **Priorité :** P2
- **Statut :** Implémenté dans `dev` (contrôle `src/game/night-pilot.check.cjs`) ; à playtester sur mobile
- **Signalement :** demande du joueur du 19 novembre 2026 : ne pas imposer le manuel en mode infini, et pouvoir repasser en automatique tout en conservant sa progression
- **Tickets liés :** [T-028 · pilotage automatique ou manuel](028-pilotage-automatique-ou-manuel.md), [T-026 · passage de vitesses](026-prototype-passage-vitesses-timing.md), [T-027 · direction en virage](027-prototype-direction-virages.md), [T-034 · difficulté progressive](034-difficulte-pilotage-manuel-rivaux.md)
- **Fichiers à examiner :** [`src/views/RaceView.vue`](../src/views/RaceView.vue), [`src/game/save.ts`](../src/game/save.ts), [`src/game/pilot.ts`](../src/game/pilot.ts), [`src/game/endless.ts`](../src/game/endless.ts), [`src/game/pilot.check.cjs`](../src/game/pilot.check.cjs), [`src/game/endless.check.cjs`](../src/game/endless.check.cjs), [`docs/meta.md`](../docs/meta.md)

## Problème constaté dans le code actuel

La **Nuit sans fin** n'utilise pas le sélecteur « Pilotage » des courses ordinaires :

- Dans `RaceView.vue`, le sélecteur n'est visible que si `rivalRace`, ce qui exclut `isNight`.
- `manualSector` lit directement **`save.preferences.timingMode`** pour la Nuit sans fin, au lieu d'un choix de mode propre à la course ou à la série.
- Le bouton **« Passer en automatique pour la suite »** est réservé aux courses de rivaux classiques (`canSwitchPilot` utilise aussi `rivalRace`).
- `createNightRound` dans `save.ts` crée le duel sans pilotage explicitement enregistré ; le moteur de nuit conserve pourtant la graine, le numéro de manche, les victoires et les gains.
- **Conséquence :** lorsque le timing expérimental est activé, la Nuit sans fin se joue en manuel sans possibilité équivalente de choisir l'automatique. Ce n'est pas le comportement souhaité.

## Expérience attendue

La Nuit sans fin doit offrir le **même choix volontaire** que les courses contre les rivaux, sans obliger le joueur à changer un paramètre global ou à interrompre sa série :

1. **Avant « Commencer la nuit »**, afficher un sélecteur clair **« Automatique » / « Manuel »** dans la préparation de la Nuit sans fin (si le mode timing expérimental est activé).
2. **Automatique** : aucune action de timing ni de direction n'est requise ; les secteurs utilisent les règles de hasard déjà en place. **C'est la valeur par défaut**, y compris pour les anciennes sauvegardes sans préférence explicite.
3. **Manuel** : le joueur passe les vitesses et, si l'option de virage est activée, effectue les gestes gauche/droite ; les gestes remplacent le hasard **pour le joueur uniquement**, selon les règles actuelles.
4. **Pendant une manche commencée en manuel**, proposer **« Passer en automatique pour la suite »**. La bascule prend effet dès le **prochain secteur non résolu**, sans rejouer de secteur déjà validé ni annuler la manche.
5. **Entre deux manches de la même Nuit sans fin**, permettre de choisir **à nouveau Automatique ou Manuel** avant de lancer la manche suivante, sans revenir au garage, redémarrer la série ni perdre de gains.
6. Si une manche a commencé en automatique, le passage au manuel peut attendre **la manche suivante** dans la V1 : ne pas imposer un basculement en pleine action ni casser le déterminisme. Le choix doit néanmoins être **réversible à chaque intermanche**.
7. Après un rechargement, reprendre exactement au bon écran avec le bon choix de pilotage, le bon secteur et les mêmes ressources.

La bascule ne doit **jamais être assimilée à un abandon, une défaite ou une nouvelle Nuit sans fin**.

## Parcours et interface mobile-first

- Dans la préparation et sur l'écran **« Manche suivante »**, montrer le mode choisi de façon lisible avec deux boutons tactiles suffisamment grands, réutilisant l'interface de sélection existante autant que possible.
- Lorsqu'une manche est en cours, afficher un libellé du mode actif, et le bouton de bascule manuel → automatique à un emplacement stable sans gêner les actions du secteur, les commandes de timing ou les contrôles de virage.
- Prévoir un court texte : **« Auto : le hasard décide de la variation. Manuel : c'est ton adresse. »** Ne pas laisser croire que l'automatique est interdit ou pénalisé en mode infini.
- Ne pas afficher un choix « Manuel » inutilisable lorsque **Mode timing (expérimental)** est désactivé ; dans ce cas, la Nuit sans fin reste **automatique** et accessible.
- Afficher dans le bilan d'une manche le mode utilisé : **Automatique**, **Manuel** ou **Manuel puis automatique**. Une série peut naturellement combiner les deux modes d'une manche à l'autre.
- Conserver une présentation adaptée à 320/390 px, avec focus clavier, zones tactiles stables et mouvement réduit.

## Contraintes techniques et invariants

- Réutiliser `sectorPilot`, `switchToAutomatic` et `playPilotRound` autant que possible : **pas de nouveau moteur de score**, pas de duplication de règles de hasard.
- Définir clairement **où la préférence de série est enregistrée** (par exemple `Night.pilotMode`) et **où la décision d'une manche est figée** (par exemple `duel.pilot` au démarrage de `createNightRound`). Éviter de déduire le mode d'une manche engagée d'un réglage global qui peut changer en cours de route.
- À chaque manche, utiliser le choix actuellement enregistré pour démarrer le duel. Une bascule manuel → automatique pendant une manche doit affecter **cette manche seulement**, à moins que le joueur ne choisisse explicitement de garder l'automatique aux manches suivantes. Le choix reste modifiable à l'intermanche.
- Préserver la **graine de nuit, le numéro de manche, les victoires, les crédits en attente, le record, l'écurie, la nitro, les utilisations des voitures et les secteurs résolus** lors d'un changement de mode.
- **Sérialisation et migration** : les sauvegardes existantes de Nuit sans fin doivent continuer à charger, avec une valeur par défaut explicite et sans supprimer `night` ou `duel`. Ne pas recalculer/résoudre rétroactivement les secteurs déjà terminés.
- Ne pas modifier la résolution Versus/Supabase, les récompenses de la Nuit sans fin, les chances du mode automatique, ni les autres modes (course classique, Défi du jour).
- Interdire les doubles validations pendant un mini-jeu ou une transition ; éviter qu'une bascule au mauvais moment résolve deux fois un même secteur.

## Critères d'acceptation

- [ ] Avec le mode timing expérimental **activé**, je peux lancer une Nuit sans fin **entièrement automatique** sans aucun geste de timing.
- [ ] Avec le mode timing activé, je peux choisir **Manuel** avant de lancer ma Nuit sans fin.
- [ ] Avec le mode timing **désactivé**, la Nuit sans fin est jouable normalement en **Automatique** sans sélecteur trompeur.
- [ ] Depuis une manche **manuelle**, « Passer en automatique pour la suite » résout les **secteurs restants** en automatique, sans rejouer les secteurs précédents.
- [ ] À l'**intermanche**, je peux choisir Auto ou Manuel pour la **manche suivante**, y compris après une manche mixte, sans perdre ma série.
- [ ] La bascule ne modifie pas les victoires, gains accumulés, record, graine, écurie et récompenses.
- [ ] Une **reprise après rechargement** conserve le bon mode pour la manche engagée et le choix pour la manche suivante. Les anciennes sauvegardes restent valides.
- [ ] Le détail des secteurs et le bilan affichent le mode réellement utilisé.
- [ ] Vérifier les tests `pilot.check.cjs`, `endless.check.cjs` et les contrôles de timing ; ajouter des scénarios de changement de mode en pleine Nuit sans fin, d'intermanche et de migration.
- [ ] Vérifier sur smartphone à **320 / 390 px**, avec commandes tactiles accessibles et sans régression du mode automatique ni du Versus.

**Livrable :** choix de pilotage fonctionnel dans la Nuit sans fin, bascule vers Auto sans abandon et possibilité de changer à chaque intermanche, avec sauvegarde fiable et tests de non-régression.
