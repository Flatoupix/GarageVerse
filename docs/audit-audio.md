# GarageVerse · Audit sonore et sélection Suno

15 novembre 2026. Revue du code du prototype Vue et des prises générées pour la collection, l’atelier, les boosters et les courses en secteurs.

## État du prototype au moment de l’audit

| Parcours | Ce que le jeu fait aujourd’hui | Priorité audio |
| --- | --- | --- |
| Accueil, garage et atelier | Le clic générique et les confirmations passent par Web Audio. Les niveaux et les pièces installées partagent le motif `upgrade`. | Faire tourner **Radio Néon** d’un écran à l’autre pour accompagner la collection et les réglages. Garder les confirmations courtes et au premier plan. |
| Boosters | Le jeu déclenche `tear` à l’ouverture. À la révélation, la rareté choisit le son, sauf pour l’édition animée avec drift qui a son propre effet. Les particules partent à mi-retournement, environ 170 ms après le son. | Donner une texture au scellé et réserver la signature musicale aux légendaires. Caler l’impact du son sur la découverte de la face, avec un départ immédiat en mouvement réduit. |
| Courses | Le départ déclenche `rev`, puis chaque ligne de score joue un tic toutes les 560 ms. La nitro joue à l’armement et peut rejouer au score pour chacun des deux pilotes. | Démarrer **Plein phare** à l’engagement de la course et garder le même fond entre les secteurs. Utiliser un clic court à l’armement et un seul effet de poussée par étape de résolution, même si les deux voitures jouent la nitro. |
| Récompenses | Le clic, la frappe du verdict et les carillons peuvent se superposer. Le son `legend` sert aussi à la victoire parfaite, à l’évolution d’une voiture et au déblocage d’un thème. | Donner la priorité au signal principal. Séparer la révélation légendaire des autres récompenses avant de remplacer le son `legend`. |

Le prototype synthétise tous ses effets, sans fichier audio à charger. Le réglage **Son** les coupe au moment du déclenchement. Une future intégration pourra reprendre cette synthèse en secours et baisser le fond pendant les effets marquants. Des réglages **Musique** et **Bruitages** séparés permettraient de couper le fond tout en gardant les retours des commandes.

Sources du prototype · [synthèse](../src/feedback.ts#L37), [préférences et déclenchement](../src/game/store.ts#L40), [clic global et portefeuille](../src/App.vue#L42), [ouverture et révélation](../src/views/BoosterView.vue#L69), [résolution des secteurs](../src/views/RaceView.vue#L130), [atelier](../src/views/CarSheet.vue#L73).

## Musiques générées

| Morceau | Prise A | Prise B | Montage envisagé |
| --- | --- | --- | --- |
| **Radio Néon**, accueil, garage et boutique | [**A · 1 min 15 s**](https://suno.com/song/87e33393-a8b4-4249-b70c-36340794e38f) | [B · 1 min 15 s](https://suno.com/song/03c97a65-459f-4c73-a1bc-d0c5c6a83895) | Retenir A. Ambiance synthwave instrumentale, groove vers 0:08 selon l’analyse Suno, environ 95 BPM. Sur B, le groove complet arrive vers 0:33. |
| **Plein phare**, course et défi du jour | [**A · 1 min 10 s**](https://suno.com/song/6436b626-0a18-4cee-b9f7-3160dd3b39c1) | [B · 1 min 09 s](https://suno.com/song/608c08bf-01f4-45f6-8076-29917a9f7b07) | Retenir A. Pulsation outrun dès la première seconde et environ 129 BPM selon Suno. B installe son groove vers 0:34. |

Le brief des deux morceaux demandait le même motif et des timbres analogiques proches. Suno situe les deux prises A en la mineur et n’a détecté aucune voix dans les quatre prises.

Les boucles intégrées reprennent huit mesures à partir des temps forts détectés par Suno. **Radio Néon A** utilise le passage de **6,385 s à 26,706 s**. **Plein phare A** utilise **9,298 s à 24,159 s**. Un fondu de 3 ms aux bords atténue les clics au raccord.

## Bruitages générés

| Effet | Sélection | Autres prises | Repère de découpe |
| --- | --- | --- | --- |
| Ouverture du booster | [**Scellé aluminium B**](https://suno.com/song/83574643-77cd-4f38-a282-d3cba62d0950) | [Scellé aluminium A](https://suno.com/song/b230190c-8eeb-4526-86f4-3b4ebec65316), [Déchirure A](https://suno.com/song/bf689b88-7137-4708-90d2-96b95a50e691), [Déchirure B](https://suno.com/song/425ee2b4-a9ae-4e50-8edc-cf528bc5f09b) | **0,60 à 0,95 s** dans Scellé B. La première génération évoquait surtout la manipulation du sachet ou une déchirure de papier. |
| Révélation légendaire | [**A**](https://suno.com/song/438f2340-2c55-4ba8-8b23-65ac9c820657) | [B](https://suno.com/song/8dddac6a-78a6-457d-91c5-6f28ff0cce68) | **0 à 1,2 s**. Carillon ascendant avec impact immédiat. Prévoir un court fondu sur la queue. |
| Déclenchement de la nitro | [**B**](https://suno.com/song/2da40987-35f2-4733-a4c9-2de4779bb963) | [A](https://suno.com/song/d0a16cc7-f4e2-4e9a-8afe-46fe5896b70c) | **0 à 1,2 s** environ. L’attaque et la poussée occupent les ~0,60 premières secondes. Ajuster le niveau de la queue en jeu. |
| Drift de la carte animée | [**A**](https://suno.com/song/5c6ed88c-7934-4444-8a73-7023c98ce3b1) | [B](https://suno.com/song/8e8b5250-0310-4b5a-b6ed-2e4e3d815013) | **0 à 0,85 s**. Crissement bref et moteur en fond. |

Les repères du tableau viennent de l’analyse Suno des prises brutes. Le montage enlève aussi le silence mesuré au début de la nitro et du drift, puis ajuste les niveaux du drift et du scellé.

## Intégration dans le prototype

Les ambiances sont lues en boucle après le premier geste. La piste de course démarre quand un duel est engagé et reste active entre les secteurs. Le réglage **Musique** apparaît dès qu’une piste est présente. Le réglage **Bruitages** reste indépendant et reprend l’ancienne préférence **Son**.

Les six MP3 montés sont dans `src/assets/audio/`. Pour reproduire le montage avec FFmpeg, nommer les six exports Suno d’après leur identifiant de prise et lancer `node pipeline/audio.mjs <dossier-des-exports>`. Les effets synthétisés restent disponibles pendant le chargement.
