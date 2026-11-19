# Tickets GarageVerse

Un fichier Markdown = un ticket de travail. Ce répertoire rassemble les **travaux futurs, études et reliquats**, à partir de la bible, de la méta v0.12.0, des notes de passation, du backlog historique et de la spécification Versus. **Ce ne sont pas des GitHub Issues.**

## Utilisation

- Lire le statut et la priorité dans chaque ticket ; **« à arbitrer / mis de côté » n'autorise pas de développement sans validation**.
- L'implémentation doit s'appuyer sur **`dev`** pour le développement ; la branche **`master`** publie le jeu. Vérifier l'état des branches avant de commencer.
- Avant de coder, confronter chaque ticket au code et au `CHANGELOG.md` les plus récents. Les notes `docs/passation.md` sont partiellement datées ; la v0.12.0 est plus récente.
- Ne pas écraser `docs/`, `README.md` ni `orchestrator/backlog/`. Un ticket ne remplace pas sa source.
- Les références relatives partent du dossier `tickets/`.

## Développement prioritaire (à valider)

| Ticket | Sujet | Priorité |
|---|---|---|
| [T-001](001-versus-arbitrages-v1.md) | Arbitrages Versus V1 | P1 |
| [T-002](002-versus-moteur-deterministe.md) | Moteur déterministe commun | P1 |
| [T-003](003-versus-backend-supabase.md) | Supabase, RLS, salles | P1 |
| [T-004](004-versus-mises-et-reglement.md) | Mises et règlement unique | P1 |
| [T-005](005-versus-client-temps-reel.md) | Client Versus et reprise | P1 |
| [T-006](006-versus-interface-mobile.md) | Interface de duel mobile | P1 |
| [T-007](007-versus-amis-palmares-v2.md) | Palmarès V2 (la liste d'amis passe dans [T-008](008-echanges-de-cartes.md)) | P2 |
| [T-037](037-echanges-synchro-lot-change.md) | Bug échanges : « Le lot a changé », voitures d'écurie bloquées, pas d'actualisation | P1 |
| [T-008](008-echanges-de-cartes.md) | Échanges de cartes entre amis, dissociés du Versus et livrés avant lui | P2 |

## Gameplay, collection et économie

| Ticket | Sujet | Priorité |
|---|---|---|
| [T-026](026-prototype-passage-vitesses-timing.md) | Prototype de course au timing : passage des vitesses, zones de réussite et préparation auto | P2 |
| [T-027](027-prototype-direction-virages.md) | Prototype de course : virages en jeu de rythme (deux pistes gauche/droite) | P2 |
| [T-028](028-pilotage-automatique-ou-manuel.md) | Prototype de course : choisir entre course automatique (hasard) et pilotage manuel | P2 |
| [T-035](035-nuit-sans-fin-pilotage-auto-manuel.md) | Nuit sans fin : sélectionner Auto / Manuel, basculer sans perdre sa série | P2 |
| [T-034](034-difficulte-pilotage-manuel-rivaux.md) | Difficulté commune du pilotage manuel suivant la progression des rivaux et boss | P2 |
| [T-032](032-etoile-victoire-parfaite-par-etape.md) | Étoile de victoire parfaite sur chaque étape d'un rival (Essais, Qualifs, Finale) | P3 |
| [T-009](009-modes-duel-alternatifs.md) | Modèles de duel alternatifs | P3 |
| [T-010](010-deck-et-evolution-en-duel.md) | Deck et évolution tactique | P3 |
| [T-011](011-fusion-de-cartes-doublons.md) | Fusion des doublons | P3 |
| [T-012](012-aura-synergies-conditionnelles.md) | Auras conditionnelles | P3 |
| [T-013](013-pieces-performance-compatibilite.md) | Nouvelles pièces mécaniques | P2 |
| [T-014](014-catalogue-futures-voitures.md) | 50 candidats de la bible à réconcilier avec le roster | P2 |
| [T-015](015-equilibrage-overdrive.md) | Playtest réel Overdrive | P2 |
| [T-016](016-economie-booster-bricole-mecanique.md) | Ressenti Bricole/Mécanique (déjà rééquilibrés en v0.6) | P2 |
| [T-033](033-ouverture-groupee-5-10-boosters.md) | Révélation groupée de 5 ou 10 boosters (25/50 cartes) et récapitulatif mobile | P2 |
| [T-019](019-nouveaux-rivaux-overdrive.md) | Personnages et rivaux Overdrive | P3 |
| [T-020](020-series-speciales-extension.md) | Variantes futures de spéciales | P3 |
| [T-021](021-demontage-voiture.md) | Démontage de véhicule, distinct du retrait des pièces | P3 |

## Ergonomie, technique, finition

| Ticket | Sujet | Priorité |
|---|---|---|
| [T-038](038-ux-selection-voitures-course-echanges.md) | Ergonomie de la sélection de voitures : préparation de course et échanges | P2 |
| [T-039](039-annuler-achat-edition.md) | Annuler un achat d'édition ou de style fait trop vite | P2 |
| [T-017](017-ux-selection-course-garage.md) | Sélection course/garage (ancienne unification annulée) | P2 |
| [T-037](037-suggestions-ecurie-avant-course.md) | Suggestions d'écurie (3 voitures et une raison chacune) avant une course, sans choix imposé | P2 |
| [T-018](018-desktop-et-themes-regressions.md) | Finitions desktop/thèmes | P2 |
| [T-025](025-bug-couleur-rarete-garage-plein-ecran.md) | Bug : couleur de rareté différente entre garage et plein écran | P2 |
| [T-029](029-boutons-pilotage-automatique.md) | Boutons propres pour le choix automatique / manuel (dépend des prototypes T-026/T-027) | P2 |
| [T-030](030-bouton-ouverture-booster-position-fixe.md) | Bouton de l'ouverture d'un booster toujours à la même place | P2 |
| [T-031](031-bug-edition-16-bits-de-base.md) | Bug : déblocage du 16 bits de base et voiture en double | P2 |
| [T-040](040-package-apk-android.md) | Package APK Android (Capacitor, hors ligne) et édition publique sans les 13 voitures sous licence | P2 |
| [T-022](022-android-pwa-premier-lancement.md) | Android, PWA et accueil | P3 |
| [T-036](036-refonte-musiques-bruitages.md) | Refonte artistique des musiques et du sound design, avec écoutes A/B et mixage mobile | P2 |
| [T-023](023-finitions-audio-animations.md) | Audio et déchirure légendaire sur appareil | P3 |
| [T-024](024-verification-donnees-et-droits.md) | Fiches, histoires et provenance | P3 |

## Déjà livré, ne pas créer de nouveaux tickets identiques

- UI gaming anguleuse des filtres et spéciales, onglets Paramètres/Thèmes/Aide, thèmes repliables, aide déplacée, portraits et personnalités des six rivaux, responsive desktop : `docs/meta.md` et `docs/passation.md`.
- Bonus secret des 14 appuis sur le logo : **déjà actif, y compris en production à la demande du joueur**. T-004 documente uniquement son interaction future avec Versus.
- Boosters Bricole **60 ₡** et Mécanique **240 ₡**, intégrés en v0.6.0 ; ne pas repartir des anciens 75/180 ₡ sans bilan.
- Quatre spéciales à cinq paliers, démontage *des pièces montées*, histoires automobiles, éditions Abandonnée/Solarpunk, cartes Anime japonaises, achat multi-boosters : déjà présents.
- Anciens correctifs du rapport `pipeline/balance-review.md` : vérifier le roster/garage actuels avant d'en reprendre un.

## Sources principales

- [Bible et futurs véhicules](../README.md)
- [Méta / état des règles](../docs/meta.md)
- [Spécification Versus](../docs/versus.md)
- [Passation / idées différées](../docs/passation.md)
- [Audit audio](../docs/audit-audio.md)
- [Anecdotes](../docs/anecdotes.md)
- [Notes de version](../CHANGELOG.md)
- [Backlog JSON historique](../orchestrator/backlog/)
