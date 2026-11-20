# Tickets GarageVerse

Un fichier Markdown = un ticket de travail. Ce répertoire rassemble les **travaux futurs, études et reliquats**, à partir de la bible, de la méta v0.12.0, des notes de passation, du backlog historique et de la spécification Versus. **Ce ne sont pas des GitHub Issues.**

## Utilisation

- Lire le statut et la priorité dans chaque ticket ; **« à arbitrer / mis de côté » n'autorise pas de développement sans validation**.
- L'implémentation doit s'appuyer sur **`dev`** pour le développement ; la branche **`master`** publie le jeu. Vérifier l'état des branches avant de commencer.
- Avant de coder, confronter chaque ticket au code et au `CHANGELOG.md` les plus récents. Les notes `docs/passation.md` sont partiellement datées ; la v0.12.0 est plus récente.
- Ne pas écraser `docs/`, `README.md` ni `orchestrator/backlog/`. Un ticket ne remplace pas sa source.
- Les références relatives partent du dossier `tickets/`.

## À faire

| Ticket | Sujet | Priorité |
|---|---|---|
| [T-041](041-suggestions-ecurie-avant-course.md) | Suggestions d'écurie (3 voitures et une raison chacune) avant une course, à concevoir avec T-038 | P2 |
| [T-034](034-difficulte-pilotage-manuel-rivaux.md) | Difficulté commune du pilotage manuel suivant la progression des rivaux et boss | P2 |

## Chantiers plus larges

| Ticket | Sujet | Priorité |
|---|---|---|
| [T-036](036-refonte-musiques-bruitages.md) | Refonte artistique des musiques et du sound design, avec écoutes A/B et mixage mobile | P2 |
| [T-040](040-package-apk-android.md) | Package APK Android (Capacitor, hors ligne) et édition publique sans les 13 voitures sous licence | P2 |
| [T-013](013-pieces-performance-compatibilite.md) | Nouvelles pièces mécaniques | P2 |
| [T-014](014-catalogue-futures-voitures.md) | 50 candidats de la bible à réconcilier avec le roster | P2 |
| [T-018](018-desktop-et-themes-regressions.md) | Finitions desktop/thèmes | P2 |

## Livré, à playtester ou valider sur appareil

| Ticket | Sujet | Livré en |
|---|---|---|
| [T-048](048-course-manuelle-animation-jusqu-arrivee.md) | Course manuelle continue jusqu'à l'arrivée | v0.22.0 |
| [T-043](043-bouton-mise-a-jour.md) | Bouton « Mettre à jour » quand une nouvelle version est en ligne | v0.21.0 |
| [T-044](044-fiche-voiture-bouton-fermer-et-boutons-pleins.md) | Favori loin du ×, boutons pleins | v0.21.0 |
| [T-045](045-bouton-retour-plus-grand-plein.md) | Bouton ← Rivaux plein | v0.21.0 |
| [T-046](046-cartes-tcg-selection-course.md) | Vraies cartes TCG en préparation de course | v0.21.0 |
| [T-047](047-pilotage-manuel-bilan-compact.md) | Bilan compact après les mini-jeux manuels | v0.21.0 |
| [T-032](032-etoile-victoire-parfaite-par-etape.md) | Étoiles de victoire parfaite à place fixe | v0.20.1 |
| [T-037](037-echanges-synchro-lot-change.md) | Échanges : lot changé, voitures d'écurie, actualisation | v0.20.0 |
| [T-039](039-annuler-achat-edition.md) | Annuler un achat d'édition ou de style | v0.20.0 |
| [T-025](025-bug-couleur-rarete-garage-plein-ecran.md) | Une seule couleur par rareté | v0.20.0 |
| [T-030](030-bouton-ouverture-booster-position-fixe.md) | Bouton d'ouverture de booster à place fixe | v0.20.0 |
| [T-033](033-ouverture-groupee-5-10-boosters.md) | Révélation groupée de 5 ou 10 boosters | v0.20.0 |
| [T-042](042-decompte-a-chaque-secteur.md) | Décompte complet avant chaque mini-jeu | v0.20.0 |
| [T-038](038-ux-selection-voitures-course-echanges.md) | Sélection de voitures (présentation reprise dans T-046) | v0.20.0 |
| [T-026](026-prototype-passage-vitesses-timing.md) | Pilotage manuel : passage des vitesses | v0.15.0 à v0.17.0 |
| [T-027](027-prototype-direction-virages.md) | Pilotage manuel : virages en jeu de rythme | v0.15.0 à v0.17.0 |
| [T-028](028-pilotage-automatique-ou-manuel.md) | Choix Automatique / Manuel, bascule en course | v0.15.0 |
| [T-029](029-boutons-pilotage-automatique.md) | Boutons du choix Automatique / Manuel (`PilotPicker`) | v0.15.0 à v0.19.0 |
| [T-035](035-nuit-sans-fin-pilotage-auto-manuel.md) | Nuit sans fin : Auto / Manuel sans perdre sa série | v0.20.0 |
| [T-008](008-echanges-de-cartes.md) | Échanges entre amis (expérimental) ; bugs dans T-037 | v0.15.0 |
| [T-015](015-equilibrage-overdrive.md) | Playtest réel Overdrive | — |
| [T-016](016-economie-booster-bricole-mecanique.md) | Ressenti Bricole/Mécanique (rééquilibrés en v0.6) | v0.6.0 |

## Versus (en pause depuis la v0.13.1)

| Ticket | Sujet | Priorité |
|---|---|---|
| [T-001](001-versus-arbitrages-v1.md) | Arbitrages Versus V1, à reconfirmer avant réouverture | P1 |
| [T-002](002-versus-moteur-deterministe.md) | Moteur déterministe commun (implémenté) | P1 |
| [T-003](003-versus-backend-supabase.md) | Supabase, RLS, salles (implémenté) | P1 |
| [T-004](004-versus-mises-et-reglement.md) | Mises et règlement unique (implémenté) | P1 |
| [T-005](005-versus-client-temps-reel.md) | Client Versus et reprise (implémenté, test sur deux téléphones à faire) | P1 |
| [T-006](006-versus-interface-mobile.md) | Interface de duel mobile (implémentée, test sur deux téléphones à faire) | P1 |
| [T-007](007-versus-amis-palmares-v2.md) | Palmarès V2 (la liste d'amis existe déjà avec les échanges) | P2 |

## Idées à arbitrer

| Ticket | Sujet | Priorité |
|---|---|---|
| [T-009](009-modes-duel-alternatifs.md) | Modèles de duel alternatifs | P3 |
| [T-010](010-deck-et-evolution-en-duel.md) | Deck et évolution tactique | P3 |
| [T-011](011-fusion-de-cartes-doublons.md) | Fusion des doublons | P3 |
| [T-012](012-aura-synergies-conditionnelles.md) | Auras conditionnelles | P3 |
| [T-019](019-nouveaux-rivaux-overdrive.md) | Personnages et rivaux Overdrive | P3 |
| [T-020](020-series-speciales-extension.md) | Variantes futures de spéciales | P3 |
| [T-021](021-demontage-voiture.md) | Démontage de véhicule, distinct du retrait des pièces | P3 |
| [T-022](022-android-pwa-premier-lancement.md) | Android, PWA et accueil (la partie APK est dans T-040) | P3 |
| [T-023](023-finitions-audio-animations.md) | Audio et déchirure légendaire sur appareil (à rapprocher de T-036) | P3 |
| [T-024](024-verification-donnees-et-droits.md) | Fiches, histoires et provenance (analyse des droits dans T-040) | P3 |

## Remplacés ou abandonnés

| Ticket | Sujet | Remplacé par / décision |
|---|---|---|
| [T-017](017-ux-selection-course-garage.md) | Sélection course/garage (ancienne unification annulée) | T-038 et T-041 |
| [T-031](031-bug-edition-16-bits-de-base.md) | Bug du 16 bits en double, non reproduit | abandonné |

Prochain numéro libre : **T-049**. Avant d'en créer un, vérifier `dev` sur GitHub : plusieurs sessions ajoutent des tickets en parallèle.

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
