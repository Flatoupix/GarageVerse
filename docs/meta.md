# GarageVerse · Méta « Neon Drive » v0.2

Ce document arbitre les questions laissées ouvertes par la bible (§3, §4 et §9) pour la version jouable. Les valeurs vivent dans `src/data/roster.json` et `src/data/garage.json`, les règles dans `src/game/rules.ts`. La simulation `node pipeline/balance.mjs` vérifie les ordres de grandeur.

## 1. Principe directeur

**Une voiture modeste se prépare, une légende se choisit.** Chaque voiture a un **coût d’écurie** de 1 à 10 et un **potentiel de préparation** qui vaut `12 − coût`, au minimum 2, plus 1 par Stage. Une Clio III coûte 2 et accepte 10 points de pièces. Une Venom F5 coûte 10 et n’en accepte que 2. Les ligues plafonnent le coût total des trois voitures engagées. L’hypercar domine les lignes droites, la citadine préparée tient les secteurs longs, la ville et la pluie.

## 2. Les quatre dimensions de la bible

| Dimension | Traduction en jeu |
| --- | --- |
| Rareté | Courante, Rare, Épique, Légendaire. Elle règle la fréquence en booster et le cadre de la carte (chrome cyan, magenta, coucher de soleil, holographique animé). |
| Puissance | Quatre scores sur 10 (ACC, VIT, MAN, END) et le coût d’écurie. Une carte rare n’est pas forcément plus forte. |
| Aura | Les éditions culturelles portent leurs étiquettes (Cinéma, Série, Nostalgie, Tuning…). Elles gagnent +1 la Nuit. Certaines capacités comptent les alliés qui partagent une étiquette. |
| Édition artistique | Synthwave pour les 50 voitures. Classic et Pixel Art pour certaines. L’édition ne change jamais les statistiques. |

## 3. Cartes

**Voiture (50).** Numéro de collection, version, coût, quatre scores, transmission, motorisation, catégories, capacité signature et fiche réelle à vérifier. Les 32 cartes candidates de la bible sont reprises, avec 18 voitures de la liste des futures cartes : Abarth 500, Dacia Logan, Civic Type R EK9, MX-5 NA, M3 E46, Delta HF Integrale, Lancer Evo VIII, Alpine A110, NSX, Tesla Model S Plaid, Mustang Shelby GT500, Challenger Demon 170, RUF CTR Yellowbird, Carrera GT, Zonda R, Agera R, Veyron et Hummer H1.

**Mécanique (24).** Huit familles, une pièce par famille et par voiture : pneumatiques, suspension, freinage, transmission, suralimentation, gestion moteur, châssis et spécial. Chaque pièce a un coût de préparation de 1 à 3, des bonus de scores ou des effets conditionnels, et une compatibilité explicite. Exemples : *Kit angle drift* (propulsion uniquement), *Compresseur volumétrique* (V8, V10 ou V12), *Gros turbo hybride* (déjà turbo), *Pack batterie* (électrique), *Fiabilité K9K* (diesel) et *Éco-Croisière* (citadine, diesel ou berline). Les deux dernières reprennent les pistes de capacités de la bible.

**Évolution.** La chaîne Lotus `Elise S1 → 111S → Sport 190` se débloque au garage : la version de base au Stage 3, plus des crédits. Les éditions culturelles (Skyline de Brian, KITT, DeLorean temporelle, Choupette, Esprit de James Bond) sortent des boosters, surtout d’After Hours, et renvoient vers leur carte de base.

## 4. Garage et progression

| Action | Effet |
| --- | --- |
| Stage 1 · 80 crédits | +1 potentiel |
| Stage 2 · 200 crédits et 1 doublon | +1 potentiel, +1 à la meilleure statistique d’origine |
| Stage 3 · 450 crédits et 2 doublons | +1 potentiel, débloque les évolutions |
| Recycler un doublon | 10, 30, 80 ou 200 crédits selon la rareté. Moitié prix pour une pièce libre. |

Les doublons alimentent la progression, comme le demande la bible. Le garage de départ contient la Clio III, la Twingo I et la Panda 4×4, trois pièces, 300 crédits et deux tickets Neon Drive.

## 5. Course en secteurs

C’est la piste « épreuve en secteurs » de la bible, enrichie de choix simultanés.

1. **Écurie.** Trois voitures dont le coût total respecte le plafond de la ligue : Néon 9, Chrome 15, Overdrive 22.
2. **Circuit.** Cinq secteurs connus d’avance : Départ (ACC), Virages (MAN), Ligne droite (VIT) et Endurance (END). La condition (Sec, Pluie, Nuit, Terre, Ville) n’est annoncée que pour le secteur en cours et le suivant.
3. **Engagement.** À chaque secteur, chaque pilote engage une voiture en secret et peut brûler une charge de **Nitro** (+2, deux charges par course). Une voiture court `1 + END/4` secteurs. Au-delà, elle **surchauffe** (−3).
4. **Résolution.** Score = statistique préparée + modificateurs de terrain + capacités et pièces + Nitro. En cas d’égalité, l’Endurance départage. La course se joue au meilleur des cinq secteurs.

| Terrain | Modificateurs communs |
| --- | --- |
| Pluie | Intégrale +1, propulsion −1 |
| Terre | 4×4 et rallye +1, supercar et hypercar −2 |
| Ville | Citadine +1, hypercar et muscle −1 |
| Nuit | Éditions culturelles +1 |

Le joueur doit pouvoir expliquer son choix : le panneau de résultat détaille chaque bonus. Il peut se relancer après un mauvais départ grâce aux capacités « retour en force » et à la Nitro gardée pour la fin. Une carte commune garde un usage : une Twingo sous la pluie en ville vaut mieux qu’une hypercar.

**Rivaux.** Six rivaux en trois ligues, chacun avec un circuit et une météo typés : Lola Minitel, DJ Cassette, Kenji Vapor, Roxy Turbo, Le Baron Chrome et Nyx. La première victoire contre un rival rapporte un ticket du booster de sa ligue. L’IA voit les mêmes informations que le joueur.

## 6. Boosters et économie

| Booster | Prix | Spécificité |
| --- | --- | --- |
| Neon Drive | 150 | Collection 001, beaucoup de pièces |
| After Hours | 250 | Pondération ×4 sur Cinéma, Série, Tuning et Drift, dernière carte au moins Épique |
| Overdrive | 400 | Pondération ×3 sur hypercars, supercars et records |

Chaque booster contient cinq cartes tirées emplacement par emplacement (rareté, puis voiture ou pièce). La table est versionnée dans `garage.json`. Le lot est tiré et sauvegardé au moment de la déchirure. Un rechargement retrouve le même lot, et les cartes rejoignent le garage dès le récapitulatif, une seule fois.

## 7. Direction artistique synthwave

- **Palette.** Nuit `#0b0420`, magenta `#ff2a8a`, rose `#ff5fd2`, cyan `#2de2ff`, violet `#8b5cff`, soleil `#ffb347`.
- **Typographies.** Orbitron pour les titres et les scores, Chakra Petch pour le texte.
- **Motifs.** Soleil rayé, grille en perspective animée, chrome dégradé sur les titres, halos néon.
- **Cadres de rareté.** Chrome cyan, magenta, coucher de soleil, puis holographique animé pour les légendaires, avec un flash lumineux à la révélation.
- **Illustrations.** Une scène par famille de voitures : ville néon pour les citadines et le tuning, désert pour les muscle cars et les hypercars, col pour le rallye, circuit de nuit pour la compétition, rétro-futur pour la science-fiction. Aucun texte ni logo dans les images.
- **Retours de jeu.** Chaque action répond : son synthétisé et vibration au toucher, particules et secousse à la déchirure, révélation graduée selon la rareté (halo sur la carte encore cachée, explosion, rayons et confettis pour une légendaire), duel de secteur mis en scène (scores qui défilent, verdict, étincelles), compteur de crédits animé. Le moteur vit dans `src/game/fx.ts`.
- **Mouvement réduit.** Il coupe la grille animée, l’holographique et les révélations, sans perte d’information.

## 8. Production automatisée

| Commande | Rôle |
| --- | --- |
| `node pipeline/art.mjs` | Génère les illustrations manquantes. Codex d’abord, Antigravity en relais si Codex atteint sa limite. Recadrage et conversion WebP. |
| `node pipeline/art.mjs --review` | Antigravity relit chaque image (fidélité du modèle, absence de texte, cohérence de style) dans `pipeline/art-review.json`. |
| `node pipeline/art.mjs --redo` | Régénère les images refusées, avec la correction demandée ajoutée au prompt. |
| `node pipeline/balance.mjs [--review]` | Simulation d’équilibrage, puis avis chiffré d’Antigravity dans `pipeline/balance-review.md`. |

Ajouter une voiture consiste à ajouter une entrée dans `roster.json` puis à lancer `node pipeline/art.mjs`. La carte, le garage, les boosters et la course la prennent en compte sans autre modification.

## 9. Ouvert après les premiers essais

Le multijoueur, le paiement et la PWA restent hors périmètre. Les valeurs réelles des fiches et les droits (marques, œuvres) doivent être vérifiés avant toute diffusion. Il reste aussi à tester l’équilibrage de la Ligue Overdrive avec de vraies collections plutôt qu’avec la simulation.

## Boucle quotidienne

L’accueil propose un défi du jour et un ticket Neon Drive gratuit. Le tirage utilise
la date locale AAAA-MM-JJ et un générateur déterministe indépendant : circuit de
cinq secteurs, météo et adversaire généré restent identiques pour tous ce jour-là.
Les six rivaux et leur progression restent inchangés.

La contrainte choisit un plafond de coût réduit, au moins une voiture d’une
catégorie donnée ou au moins une voiture d’une rareté donnée. Si aucun trio du
garage du joueur ne peut la respecter, un plafond de coût de 6 la remplace pour lui. Une écurie valide
est préremplie depuis les voitures possédées ; toute sélection invalide indique
la raison sur le bouton désactivé. Le défi réutilise les duels de secteur et
l’arrivée des courses habituelles.

La première victoire rapporte 180 crédits. Rejouer reste possible sans nouveau
gain. La série augmente après une victoire le lendemain de la précédente ; un
jour manqué l’interrompt. Le booster quotidien ajoute exactement un ticket, puis
l’accueil affiche « Reviens demain ». La date, la réussite, la récupération, la
série et la dernière victoire sont conservées dans garageverse:v2, avec des valeurs
par défaut pour les anciennes sauvegardes. Au changement de date, réussite et
récupération sont réinitialisées ; une course de la veille ne donne plus de gain.

Les contraintes de catégorie et de rareté conservent le plafond Néon de 9 ;
le plafond réduit est tiré entre 7 et 8. La jauge indique toujours le plafond
réel du défi. L’écurie quotidienne est indépendante de l’écurie des rivaux et
est préremplie à chaque ouverture. Si aucun trio possédé n’est admissible, le
lancement reste désactivé avec sa raison, sans effacer l’écurie habituelle.
La météo affichée sur l’accueil correspond aux conditions des cinq secteurs.
Rejouer le défi reproduit ces conditions, tandis que les choix de l’adversaire
pendant les secteurs continuent d’utiliser le hasard habituel du moteur.

`node pipeline/check-daily.cjs` vérifie le tirage sur 365 dates, les plafonds, l’écurie indépendante et le booster unique.
