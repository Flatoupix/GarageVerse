# T-047 · Pilotage manuel : alléger les résultats techniques qui encombrent la scène

- **Type :** Ergonomie / présentation des résultats
- **Priorité :** P2
- **Statut :** Livré en v0.21.0 ; à valider sur téléphone
- **Signalement :** retour joueur du 19 novembre 2026 : « Direction +2, 1 Parfait, 1 Bien, 0 Raté, score de base… on s'en fout », ou à défaut beaucoup mieux intégré.
- **Tickets liés :** [T-026 · passage de vitesses](026-prototype-passage-vitesses-timing.md), [T-027 · jeu de rythme gauche/droite](027-prototype-direction-virages.md), [T-048 · continuité de la course](048-course-manuelle-animation-jusqu-arrivee.md).
- **Fichiers à examiner :** [`src/views/RaceView.vue`](../src/views/RaceView.vue) (paragraphes `shown.direction`, `shown.timing`, bilan de secteur), [`src/components/SectorRun.vue`](../src/components/SectorRun.vue), [`src/game/turn-text.ts`](../src/game/turn-text.ts), [`src/game/timing-text.ts`](../src/game/timing-text.ts), styles associés.

## Problème

Après un mini-jeu manuel, l'interface empile des informations comme :
- `Direction · 2 parfaits / 1 bien / 0 raté` (selon le cas) ;
- `Score de base N + Direction (+2) = Total` ;
- d'autres lignes techniques de timing, score, jugements, puis résultats de secteur.

Sur smartphone, cette accumulation **prend beaucoup de place, coupe le rythme et détourne l'attention de la course**. Le joueur veut d'abord **voir la voiture courir et savoir s'il a réussi**, pas lire un bilan comptable à chaque geste.

## Comportement attendu

- **Pendant l'action** : afficher le retour vraiment utile, **Parfait / Bien / Raté** et un feedback visuel/sonore léger, directement **près de la voiture ou de la piste**, sans gros bloc de texte.
- **À la fin du secteur** : mettre en avant **le verdict**, le **score final du joueur face à celui du rival**, et si utile le bonus/malus global du geste dans un format compact (ex. « Trajectoire +2 »). Le bilan du secteur doit pouvoir tenir sur mobile sans défilement imposé.
- **Retirer de l'affichage principal** les compteurs détaillés « 1 parfait, 1 bien, 0 raté », les équations « score de base + direction = score final » et les sous-scores répétitifs ; **ne pas retirer les calculs ni les données du moteur**.
- Si ces informations sont utiles pour les joueurs qui veulent optimiser leur pilotage, les ranger dans un **détail facultatif** (« Détails du secteur ») **replié par défaut**, idéalement réutilisant le mécanisme de détail déjà présent.
- Éviter de répéter les jugements en trois endroits (animation, ligne technique, résultat de secteur). Les **sons et effets** servent de confirmation immédiate.
- En cas de résultat perfect / série parfaite, conserver la célébration, mais ne pas laisser un compteur permanent masquer la piste.
- La réduction d'information **ne doit pas cacher un échec ou un malus réellement important** : rendre clair le résultat général et laisser accéder au détail.

## Critères d'acceptation

- [ ] Après une séquence de virage, le joueur **ne voit plus par défaut** l'empilement « Direction, Parfait/Bien/Raté, score de base, formule, total ».
- [ ] Le retour immédiat et le score de secteur restent **clairs et lisibles** ; les informations techniques éventuelles sont dans un panneau replié.
- [ ] La présentation est cohérente pour le passage de vitesses **et** les virages, sur les épreuves avec plusieurs gestes.
- [ ] Sur **320/390 px**, la piste et les actions utiles restent visibles ; aucun bloc de bilan ne déplace inutilement les commandes.
- [ ] Les calculs, les modificateurs, les récompenses, le mode Automatique et les reprises de sauvegarde restent inchangés.
- [ ] Vérifier les textes accessibles aux lecteurs d'écran et les traductions FR/EN ; ne pas annoncer en direct chaque ligne de détail masquée.
- [ ] Playtest sur téléphone, avec captures avant/après de plusieurs résultats (réussite parfaite, moyenne et ratée).

**Livrable :** une scène épurée orientée sensations, et un bilan facultatif pour les joueurs qui veulent comprendre les chiffres.
