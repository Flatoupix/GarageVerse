# T-028 · Prototype de course : choisir entre course automatique et pilotage manuel

- **Type :** Prototype gameplay
- **Priorité :** P2
- **Statut :** Publié en v0.15.0 (choix « Pilotage » sur l'onglet Course, bascule en automatique pendant la course) ; **à playtester sur mobile**
- **Signalement :** Retour du joueur, 18 novembre 2026 : laisser la possibilité d'automatiser les matchs comme avant, « au prix de l'aléatoire ».
- **Tickets liés :** [T-026 · passage de vitesses](026-prototype-passage-vitesses-timing.md), [T-027 · virages en jeu de rythme](027-prototype-direction-virages.md), [T-029 · boutons du choix](029-boutons-pilotage-automatique.md)
- **Fichiers :** [`src/game/pilot.ts`](../src/game/pilot.ts) et `pilot.check.cjs`, [`src/views/RaceView.vue`](../src/views/RaceView.vue), [`src/game/save.ts`](../src/game/save.ts), [`docs/meta.md`](../docs/meta.md)

## Principe

Les prototypes T-026 et T-027 remplacent le hasard (« forme du jour », secteurs parfaits, incidents) par l'adresse du joueur. Ce ticket garde la **course automatique exactement comme avant**, avec son hasard, et laisse le joueur choisir **à chaque course** :

- **Automatique (avec le hasard, comme avant)** : aucun geste, résolution actuelle, strictement identique (mêmes tirages, mêmes scores, vérifié par `pilot.check.cjs`) ;
- **Manuel (ton adresse remplace le hasard)** : compteur de vitesses (T-026) et, si l'option est activée, virages en rythme (T-027).

## Fonctionnement dans le prototype

- Sélecteur « Pilotage » en haut de l'onglet Course, **visible quand le mode timing expérimental est activé** dans les Réglages ; choix mémorisé, **Automatique par défaut**.
- Pendant une course manuelle, bouton « Passer en automatique pour la suite » : les secteurs restants se jouent avec le hasard ; le choix est conservé au rechargement et ne s'annule pas pour cette course.
- Le bilan de secteur et de course indique le mode utilisé (Automatique, Manuel, Manuel puis automatique).
- Récompenses, adversaires, règles de victoire et Versus inchangés ; `rules.ts`, `data.ts` et `supabase/` non modifiés.

## Points relevés par les revues

- En course manuelle, le défilement après un secteur peut viser le bouton de bascule au lieu du résultat du secteur.
- Une course en cours issue d'une ancienne sauvegarde sans mode enregistré bascule en automatique pour les secteurs restants.
- Après une bascule, le résultat d'un secteur automatique est réaffiché au rechargement, ce qu'une course entièrement automatique ne fait pas (mineur).

## À décider après playtest

- Garder deux modes durablement ou faire évoluer le mode principal ?
- Le mode manuel doit-il rapporter plus que l'automatique (aujourd'hui : mêmes récompenses) ?
- Le sélecteur doit-il rester réservé aux joueurs qui activent le mode expérimental ?
