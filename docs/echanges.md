# Échange de cartes entre amis

Statut : **étapes 1 à 3 implémentées dans le dépôt**. Décision du 18 novembre 2026 : les échanges sont **dissociés du Versus** et **livrés avant lui**. Les règles d'échange décidées le 17 novembre 2026 (anciennement `docs/versus.md` §7) restent valables et sont reprises ici.

## 1. Intention

Échanger des voitures, et des crédits, avec un ami : « je te donne ma Supra contre ta F40 et 200 ₡ ». Aucun duel, aucune mise, aucune salle de course : seulement un compte, une liste d'amis et un serveur qui tient l'échange pour qu'il ne puisse ni se perdre ni se dupliquer.

## 2. Ce qui change par rapport au plan Versus

| Avant | Maintenant |
| --- | --- |
| Échange = étape V3 du Versus, après les duels et la liste d'amis | Chantier **indépendant**, livré **avant** le Versus |
| S'appuie sur les salles, les mises et le règlement du Versus | S'appuie seulement sur le **compte anonyme** et le **code ami** déjà posés par le Versus V1 (`gv_players`, fonction `register`) |
| La liste d'amis arrive avec le palmarès (V2) | La **liste d'amis par code** passe dans ce chantier ; le palmarès du Versus la réutilisera |

Le Versus V1 reste en pause : les échanges n'en dépendent ni pour le client, ni pour le serveur. Ils réutilisent le projet Supabase déjà configuré, par des migrations **additives** (aucune table du Versus n'est modifiée).

## 3. Décisions déjà prises (17 novembre 2026)

- **Toutes les cartes** sont échangeables, y compris le dernier exemplaire d'une voiture et les évolutions.
- Des **crédits** peuvent figurer dans l'offre, d'un côté, des deux côtés, ou seuls contre des cartes.
- **Aucun garde-fou d'équilibre** (pas de plafond quotidien, pas de limite d'écart de rareté) : entre amis, le jeu fait confiance aux joueurs.
- Offre valable **24 heures** ; une contre-proposition remplace l'offre précédente.

## 4. Amis

- Un joueur se présente par son **pseudo et son code ami** (6 caractères, déjà générés à l'inscription).
- **Demande d'ami par code, acceptée par l'autre** : **retenu le 18 novembre 2026** (une vraie liste d'amis, plutôt qu'un échange direct par code), parce que la vitrine n'est visible que des amis.
- Liste d'amis : pseudo, état de la demande, retrait d'un ami.
- Limites : 50 amis et 10 demandes envoyées en attente par joueur, pour éviter le courrier indésirable.

## 5. Déroulement d'un échange

1. **Vitrine.** Chaque joueur choisit les voitures qu'il rend visibles **à ses amis** pour l'échange. Une voiture engagée dans une course en cours ne peut pas y figurer.
2. **Proposition.** A compose son offre : ses cartes et, s'il le veut, des crédits ; il choisit ce qu'il demande dans la vitrine de B (cartes et/ou crédits).
3. **Réponse.** B voit les deux côtés en cartes complètes (édition affichée, Stage, niveaux d'atelier, rareté) et le montant de crédits. Il accepte, refuse ou contre-propose. Sans réponse en 24 heures, l'offre expire.
4. **Validation simultanée.** À l'acceptation, les cartes et crédits des **deux côtés** passent **en transit** : retirés des écuries (rivaux, défi du jour, Nuit sans fin), ni vendables ni jouables. Le serveur enregistre l'échange accepté, puis chaque jeu **reçoit ce que l'autre donne, une seule fois** (identifiant d'échange). Si une réception n'est pas confirmée sous 24 heures, les biens **retournent à leur propriétaire**.

**Ce qui suit la carte.** Tous les exemplaires échangés de la voiture, son Stage, ses niveaux d'atelier, son 3ᵉ emplacement et ses éditions débloquées passent au nouveau propriétaire. Les **pièces montées retournent au stock** de l'ancien propriétaire. L'édition affichée reste celle choisie avant l'échange. En cas de **doublon chez le destinataire**, les exemplaires s'additionnent, la meilleure progression est conservée et les éditions s'unissent (règle « un tirage = une seule tuile » : une édition n'apparaît qu'une fois par voiture).

**Reste interdit** (règles du jeu, pas d'équilibrage) :
- une voiture engagée dans une course en cours (ou, plus tard, une mise Versus) ;
- un échange qui laisserait un garage sous **trois voitures** (règle de la vente) ;
- des crédits au-delà du solde du joueur au moment de l'acceptation ;
- plus de **10 offres ouvertes** en même temps par joueur.

**Séries et collection.** Les récompenses de série déjà récupérées restent acquises. Une série complétée grâce à une carte reçue peut être récupérée normalement, une seule fois par joueur.

## 6. Serveur

Mêmes principes que le Versus (détail technique dans [`docs/supabase.md`](supabase.md)) : comptes anonymes, Row Level Security partout, écritures sensibles uniquement par Edge Functions, migrations déployées par le workflow protégé de `master`.

| Table (nouvelle) | Contenu |
| --- | --- |
| `gv_friendships` | demandeur, destinataire, état (`pending`, `accepted`), création |
| `gv_showcase` | joueur, voiture proposée à l'échange (instantané : voiture, Stage, ateliers, éditions) |
| `gv_trades` | id, proposeur, destinataire, état (`open`, `countered`, `declined`, `expired`, `accepted`, `done`, `returned`), offre précédente, expiration |
| `gv_trade_items` | échange, côté, voiture (avec préparation transmise) ou crédits |
| `gv_trade_claims` | échange, joueur, réclamé à (garantit la réception **unique**) |

Fonctions : `request-friend`, `answer-friend`, `set-showcase`, `propose-trade`, `answer-trade`, `claim-trade` ; l'expiration et le retour des biens passent par le planificateur déjà en place (`resolve-due`).

**Limite assumée.** Comme pour les mises, les garages vivent dans les **sauvegardes locales** (modifiables par leur propriétaire). Le serveur garantit l'échange et son unicité, pas l'honnêteté du garage d'origine ; un instantané de carte annoncé par un joueur n'est pas vérifié contre son garage.

## 7. Client

- `validateTradeOffer` vérifie les voitures, les engagements, le solde, la taille du garage et la limite des dix offres. `openTrade` enregistre une offre à l'état `ouverte`. `transitTrade` applique les mêmes contrôles à une offre directe ou déjà ouverte, y compris les réservations des autres offres. L'acceptation retire du garage et du solde les voitures et les crédits du lot `transit`. Les pièces montées sont déduites du stock, qui les comptait jusque-là.
- Après la décision commune de livraison, `completeTrade` libère les pièces au stock du donneur et passe le lot à l'état `recue`. Le lot sans pièces reste disponible après rechargement jusqu'à la confirmation de réception. `receiveTrade` applique le lot au destinataire une seule fois. La fusion additionne les exemplaires, retient les meilleurs niveaux et réunit les éditions sans doublon. Une voiture déjà possédée conserve son édition affichée, son favori et ses pièces. Une nouvelle voiture reçue apparaît avec le badge « Nouveau » et sans statut favori. Les récompenses de série récupérées restent acquises.
- Après une décision d'expiration, de refus ou d'annulation, `returnTrade` passe l'offre ou le transit à l'état `rendue`. Le retour restaure les biens du lot. Si un booster a redonné une voiture entre-temps, la fusion conserve l'édition affichée et le favori de la voiture actuelle, ainsi que les pièces montées du lot rendu.
- `readSave` applique les plafonds habituels, soit 10 millions de crédits, 999 exemplaires par voiture et 999 pièces par référence. La validation des lots applique les mêmes plafonds. Si une réception, une restitution ou une remise de pièces en stock dépasse un plafond, l'opération est refusée et les biens restent à leur emplacement d'origine.
- À la lecture, l'état `quarantaine` dans `Save.trades` signale un lot illisible, y compris un lot du donneur à l'état `recue`. Ses biens bruts restent dans `goods`. Toute réception, tout retour et toute purge excluent ces lots.
- Après confirmation de réception, la coordination appelle `acknowledgeTrade` chez le donneur. Les échanges terminés occupent un marqueur `{ id, state }` dans `Save.trades`, avec au plus les 200 derniers dans l'ordre de clôture. `Save.tradeHistory` conserve les identifiants de clôture, y compris ceux des marqueurs purgés, pour empêcher toute seconde application après rechargement. Cet historique d'identifiants n'a pas de limite et ne contient aucun lot. Pour un échange dans les deux sens, la coordination lie les deux lots à la même décision avec un identifiant distinct par sens et remet chaque lot livré uniquement à son destinataire.
- **Interface** : entrée **Échanges** dans l'onglet Garage (amis, vitrine, offres reçues, offres envoyées, historique). Connexion nécessaire : sans réseau, « Connexion nécessaire », le reste du jeu fonctionne comme avant. Textes en français **et** en anglais (`docs/i18n.md`).

## 8. Découpage pour l'orchestrateur

| Tâche | Contenu | Chemins |
| --- | --- | --- |
| `echange-amis` | Migration `gv_friendships`, fonctions `request-friend` et `answer-friend`, écran Amis, limites | `supabase/`, `src/game/`, `src/views/` |
| `echange-regles` | `src/game/trade.ts` et ses vérifications : validation, transit, réception unique, doublons, progression, retour | `src/game/` |
| `echange-serveur` | Migrations `gv_showcase`, `gv_trades`, `gv_trade_items`, `gv_trade_claims`, RLS, fonctions, expiration, tests serveur | `supabase/` |
| `echange-client` | Client réseau, transit et réception dans la sauvegarde, reprise après rechargement | `src/game/` |
| `echange-interface` | Vitrine, composition d'offre, offres reçues, contre-offre, historique | `src/views/`, `src/components/` |

**Étape 1 (Amis) implémentée dans le dépôt.** Le réglage expérimental, désactivé par défaut, ouvre la liste depuis le Garage. Les demandes croisées valent acceptation. Le déploiement sur Supabase hébergé reste à faire après relecture par le propriétaire et fusion dans `master`.

**Étape 3 (Serveur) implémentée dans le dépôt.** Le serveur enregistre les offres, les contre-offres et les réclamations, puis prend une décision commune de livraison ou de retour. Les fonctions et la migration attendent le déploiement depuis `master` après relecture. Le client de l'étape 4 appliquera cette décision à la sauvegarde. Le serveur conserve les instantanés déclarés et le jeu contrôle les contraintes du garage local.

Chaque tâche ayant des migrations ou des règles de collection passe une **revue de sécurité** ; **les migrations sont relues par le propriétaire avant leur fusion dans `master`**, qui déclenche le déploiement.

## 9. Critères d'acceptation de l'ensemble

- [ ] Aucun échange dupliqué après rechargement ni après double réception.
- [ ] Si une réception n'est pas confirmée sous 24 heures, les biens reviennent à leur propriétaire.
- [ ] Les récompenses de série déjà obtenues restent acquises.
- [ ] Tests : proposition, contre-offre, refus, annulation, expiration, dernier exemplaire, progression transférée, doublon chez le destinataire, solde insuffisant, garage sous trois voitures, simultanéité des deux acceptations.
- [ ] Le Versus reste inchangé et n'est pas requis pour échanger.
