# Supabase · préparation du multijoueur

Statut : **serveur et client V1 implémentés et testés localement**. Ce document complète [`docs/versus.md`](versus.md), qui décrit le jeu. Ici : le projet Supabase, le schéma, les fonctions serveur, la sécurité et le déploiement. Tickets liés : `tickets/003` (serveur), `004` (mises), `005` (client temps réel), `007` (amis), `008` (échange).

## 1. Le projet

| Élément | Valeur |
| --- | --- |
| Nom | `garage-verse` (créé par le propriétaire) |
| Référence | `wqfukxadzwxaypqebtqw` |
| URL (publique) | `https://wqfukxadzwxaypqebtqw.supabase.co` |
| Clé publishable (publique) | `sb_publishable__Z5ER4kBYKflcgz2Q-wdcA_8UmRQhdh` |
| Comptes anonymes | **activés** le 17 novembre (vérifié par une inscription anonyme de test) |
| Région | Europe (Paris `eu-west-3` ou Francfort `eu-central-1`), au plus près des joueurs |
| Offre | Gratuite au départ : largement suffisante pour des duels entre amis |
| Séparation | Projet **dédié**, distinct de celui de Crazy Popping Catz. Les tables gardent quand même le préfixe `gv_` |

**Attention, offre gratuite.** Un projet gratuit inactif pendant une semaine est mis en pause par Supabase ; il faut alors le relancer depuis le tableau de bord. Le jeu doit le supporter : sans réponse du serveur, l'entrée Versus affiche « Serveur indisponible » et le reste du jeu fonctionne normalement.

## 2. Ce que le propriétaire fait, une fois

| Étape | Où | Public ou secret ? |
| --- | --- | --- |
| 1. Activer **Allow anonymous sign-ins** | *Authentication › Sign In / Providers* | — |
| 2. Relever la **Project URL** (`https://<ref>.supabase.co`) | *Project Settings › API* | **Public** : peut aller dans le code |
| 3. Relever la clé **anon** (publishable) | *Project Settings › API* | **Public** : peut aller dans le code |
| 4. Créer un **jeton d'accès** personnel | *Account › Access Tokens* | **Secret** : GitHub uniquement |
| 5. Retrouver le **mot de passe de la base** | choisi à la création du projet | **Secret** : GitHub uniquement |
| 6. Ajouter les secrets GitHub `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` | dépôt GarageVerse, *Settings › Secrets and variables › Actions* | — |
| 7. Autoriser la création de l'action de déploiement | soit `gh auth refresh -s workflow` validé par code, soit ajout manuel du fichier | — |

La clé **service_role** ne quitte jamais Supabase : les fonctions serveur la reçoivent automatiquement. Elle ne doit apparaître ni dans le dépôt, ni dans le jeu, ni dans une conversation.

## 3. Côté jeu

- `src/game/versus.ts` : client Supabase (`@supabase/supabase-js`), connexion anonyme, appels aux fonctions, abonnements Realtime.
- URL et clé anon en constantes dans ce fichier (valeurs publiques). Pas de variable d'environnement de build à gérer.
- Connexion anonyme au premier passage dans Versus seulement : aucun appel réseau pour un joueur qui n'y va jamais.
- Pseudo choisi au premier passage, code ami à 6 caractères attribué par le serveur.
- Hors ligne ou serveur en pause : message clair, aucune donnée de la sauvegarde touchée.

## 4. Arborescence

```
supabase/
  config.toml                     # projet lié, fonctions, auth anonyme
  sync-rules.mjs                  # génère la copie des règles
  migrations/
    20261118000000_versus_v1.sql  # tables, index, RLS, publication Realtime
    20261118010000_versus_snapshot.sql  # lecture cohérente de la salle
  scheduler/resolve-due.sql         # installation du rattrapage après déploiement
  functions/
    _shared/
      game/                       # copie générée de src/game (règles et données), ne pas éditer à la main
      http.ts                     # authentification, connexion SQL, réponses JSON
      versus.ts                   # logique du duel et des règlements
    register/index.ts
    create-room/index.ts
    join-room/index.ts
    submit-move/index.ts
    resolve-due/index.ts
    claim-settlement/index.ts
```

## 5. Partager les règles du jeu avec le serveur

Le serveur doit résoudre les secteurs **avec exactement le même code** que le jeu (`docs/versus.md` § 4).

- Les fonctions tournent sous Deno et ne peuvent embarquer que des fichiers situés sous `supabase/functions/`. Un script `supabase/sync-rules.mjs` copie donc `src/game/rules.ts`, `src/game/data.ts` et `src/data/{roster,garage}.json` dans `supabase/functions/_shared/game/`, en adaptant les imports JSON (`with { type: 'json' }`).
- Une vérification (`node src/game/supabase.check.cjs`) échoue si la copie diffère de la source : impossible de déployer un serveur dont les règles ont dérivé du jeu.
- Le moteur expose `playVersusRound(duel, choiceA, choiceB, rng)` (ticket 002) ; `playRound` contre l'IA s'appuiera dessus.
- La graine de la salle est tirée par le serveur ; tout le hasard de la course en découle (`dailyRng(graine)`). **Elle ne quitte jamais le serveur pendant la course** : elle vit dans `gv_room_secrets` (aucun droit pour les joueurs), la salle publie le circuit et la météo des secteurs (`versusRaceInfo`), le jeu reconstruit la course à partir des secteurs publiés (`rebuildVersus`), et la graine est recopiée dans `gv_rooms.revealed_seed` à l'arrivée pour vérification (migration `20261118020000_versus_secret_seed.sql`). Sans cela, un jeu modifié pourrait prévoir la chance d'un secteur et choisir sa consigne pour éviter un incident.

## 6. Schéma V1 (duels et mises)

Première migration : `supabase/migrations/20261118000000_versus_v1.sql` (tables dans le schéma `public`, extrait ci-dessous). Toutes les tables ont la RLS activée ; **aucune écriture directe depuis le jeu** : tout passe par les fonctions serveur.

```sql
create type gv_room_state as enum ('open', 'ready', 'racing', 'done', 'expired', 'cancelled');

create table gv_players (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 20),
  friend_code text not null unique check (friend_code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

create table gv_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- code court de l'invitation (lien et QR)
  host uuid not null references gv_players,
  guest uuid references gv_players,
  cap smallint not null check (cap in (9, 15, 22)),
  stake integer not null check (stake in (0, 50, 100, 250, 500)),
  seed text not null,
  state gv_room_state not null default 'open',
  sector smallint not null default 0 check (sector between 0 and 4), -- secteur en cours
  sector_deadline timestamptz,                     -- fin des 20 secondes du secteur en cours
  missed jsonb not null default '{}',              -- secteurs sans réponse par joueur
  winner uuid references gv_players,               -- null : égalité ou pas encore fini
  rematch_of uuid references gv_rooms on delete set null, -- salle d'origine d'une revanche (§ 12)
  expires_at timestamptz not null default now() + interval '10 minutes',
  created_at timestamptz not null default now()
);

create table gv_lineups (
  room uuid references gv_rooms on delete cascade,
  player uuid references gv_players,
  cars jsonb not null,                             -- 3 voitures et leur préparation, revérifiées par le serveur
  primary key (room, player)
);

create table gv_moves (
  room uuid references gv_rooms on delete cascade,
  sector smallint not null check (sector between 0 and 4),
  player uuid references gv_players,
  car smallint not null check (car between 0 and 2),
  stance text not null check (stance in ('normal', 'attaque', 'gestion')),
  nitro boolean not null,
  auto boolean not null default false,             -- joué par l'IA après le délai
  created_at timestamptz not null default now(),
  primary key (room, sector, player)
);

create table gv_rounds (
  room uuid references gv_rooms on delete cascade,
  sector smallint not null check (sector between 0 and 4),
  result jsonb not null,                           -- scores, lignes, chance, vainqueur du secteur
  primary key (room, sector)
);

create table gv_settlements (
  room uuid references gv_rooms on delete cascade,
  player uuid references gv_players,
  delta integer not null,                          -- crédits à appliquer à la sauvegarde (peut être négatif ou nul)
  reason text not null,                            -- 'win', 'loss', 'tie', 'forfeit', 'refund'
  claimed_at timestamptz,
  primary key (room, player)
);
```

**Lecture (RLS).**

| Table | Qui peut lire |
| --- | --- |
| `gv_players` | soi-même ; pseudo et code ami des joueurs avec qui on partage une salle |
| `gv_rooms`, `gv_lineups`, `gv_rounds` | les deux joueurs de la salle |
| `gv_moves` | **son propre coup seulement** tant que le secteur n'est pas résolu, puis les deux |
| `gv_settlements` | sa propre ligne |

Un coup adverse devient lisible dès qu'une ligne `gv_rounds` existe pour cette salle et ce secteur. Les politiques passent par `gv_rooms` (et `gv_rounds` pour les coups), jamais l'inverse, et n'utilisent aucune fonction.

**Droits.** `anon` n'a aucun droit sur ces tables (même pas `select`) ; `authenticated` n'a que `select`, filtré par la RLS ; seul `service_role` (fonctions serveur) insère, modifie et supprime.

**Temps réel.** Publication Realtime sur `gv_rooms` (état, secteur, délai) et `gv_rounds` (résultats). Les coups (`gv_moves`) ne sont **jamais** diffusés.

**Index.** `gv_rooms (code)` (celui de la contrainte unique), `gv_rooms (state, expires_at)`, `gv_rooms (state, sector_deadline)` pour les délais.

## 7. Fonctions serveur

Les points d'entrée Deno vérifient le jeton du joueur et ouvrent une connexion SQL via `SUPABASE_DB_URL`. Ils répondent en JSON `{ ok: true, data }` ou `{ ok: false, error }` avec un code stable. Les secteurs sont numérotés de 0 à 4. Les écritures se font dans une transaction et les opérations sur une salle verrouillent sa ligne.

| Fonction | Entrée | Effet | Erreurs principales |
| --- | --- | --- | --- |
| `register` | `nickname` | crée le joueur et son code ami, ou renvoie le joueur existant | `INVALID_NICKNAME` |
| `create-room` | `cap`, `stake`, `lineup`, `credits`, `rematch_of` facultatif | crée une salle ouverte et renvoie son code d'invitation. Une revanche reprend le plafond et la mise de la salle d'origine | `INVALID_LINEUP`, `STAKE_TOO_HIGH`, `RATE_LIMITED` |
| `join-room` | `code`, `lineup`, `credits` | vérifie l'écurie et la mise, lance le secteur 0 avec un délai de 20 s | `ROOM_NOT_FOUND`, `ROOM_FULL`, `ROOM_EXPIRED`, `OWN_ROOM` |
| `submit-move` | `room`, `sector`, `car`, `stance`, `nitro` | enregistre le coup. Le second coup résout le secteur et publie `gv_rounds` | `NOT_YOUR_ROOM`, `WRONG_SECTOR`, `ALREADY_PLAYED`, `INVALID_MOVE`, `DEADLINE_PASSED` |
| `resolve-due` | `room` | à l'échéance, `autoChoice` joue pour chaque absent. Deux absences valent abandon. Si les deux joueurs abandonnent au même secteur, chacun récupère sa mise | `NOT_DUE` |
| `claim-settlement` | `room` | renvoie le montant à appliquer à la sauvegarde et marque la ligne réclamée | `NOT_FINISHED`, `ALREADY_CLAIMED` |

**Délais sans serveur permanent.** Le client appelle `resolve-due` à la fin du compte à rebours. Un appel avec le jeton `service_role` et un corps `{}` traite jusqu'à 100 salles en retard, dont les salles ouvertes expirées à rembourser. Le script `supabase/scheduler/resolve-due.sql` installe le rattrapage chaque minute avec Supabase Cron, pg_net et Vault. Après le déploiement des fonctions, un administrateur peut exécuter `bash supabase/scheduler/activate.sh` avec `SUPABASE_PROJECT_REF` et `SUPABASE_ACCESS_TOKEN` pour le projet cible. Il active les extensions, initialise la destination et le jeton dédié dans Vault, configure le secret Edge sur le même projet puis installe le job nommé. Une nouvelle exécution réutilise le jeton et actualise le même job. Les fonctions vérifient elles-mêmes l'identité avec Auth.

**Reprise du client.** Une invitation ouvre `?versus=CODE`. Le client vérifie le plafond et la mise avant de rejoindre. Il réserve la mise et sauvegarde la demande avec l’identifiant de salle avant l’appel réseau. Il peut ainsi rejouer une création ou une acceptation après une réponse perdue. La fonction SQL `gv_snapshot` renvoie l’état, l’heure du serveur, les secteurs révélés et le reçu du joueur sous les politiques de lecture existantes. Le client relit cet état au retour au premier plan, aux notifications Realtime et toutes les cinq secondes pendant le duel.

**Mise côté jeu.** À la création ou à l'acceptation, le jeu retire la mise de la sauvegarde et la note comme *mise en cours* (identifiant de salle). À l'arrivée, `claim-settlement` donne le montant ; le jeu l'applique une seule fois et retire la mise en cours. Le jeu se contente d'afficher ce que le serveur a calculé : vainqueur, pot, commission de 10 %.

## 8. Sécurité

- RLS sur toutes les tables, aucune politique d'écriture pour le rôle `anon` ou `authenticated` : seules les fonctions (service_role) écrivent.
- Écuries revérifiées par le serveur : 3 voitures distinctes, plafond respecté, pièces compatibles, potentiel tenu (`constraintCheck`, `installCheck`).
- Mise : dans les paliers, identique pour les deux joueurs, au plus 25 % des crédits **déclarés** par le jeu (le solde local n'est pas vérifiable, voir la limite assumée de `docs/versus.md` § 5).
- Limites d'usage : 10 salles créées par heure et par joueur, 1 coup par secteur.
- Les codes d'invitation sont longs (8 caractères ou plus, sans caractères ambigus) et expirent en 10 minutes.
- Aucune donnée personnelle : pas d'e-mail, pas de nom réel. Le pseudo est le seul texte libre (longueur bornée, filtrage simple).

## 9. Déploiement

**Action GitHub** `.github/workflows/supabase.yml`, déclenchée sur `master` quand `supabase/**` change (et à la main) :

1. installe la CLI Supabase (`supabase/setup-cli`) ;
2. vérifie que `_shared/game` est à jour (`node src/game/versus.check.cjs`) ;
3. `supabase link --project-ref $SUPABASE_PROJECT_REF` ;
4. `supabase db push` (migrations) ;
5. `supabase functions deploy` (toutes les fonctions) ;
6. `bash supabase/scheduler/activate.sh` **après** les fonctions : crée si nécessaire les secrets Vault `gv_project_url` et `gv_scheduler_token`, synchronise le jeton dédié vers `GV_SCHEDULER_TOKEN` dans les fonctions Edge, programme `gv-resolve-due` chaque minute et vérifie qu'une tâche active existe.

Une PR touchant `supabase/**` ou le workflow lance seulement le job **validate** (syntaxe Bash et présence du SQL) : **aucun accès au projet hébergé depuis la PR**. Le job **deploy** est réservé à `master` et s'arrête si la planification échoue. Le script est conçu pour être relancé sans renouveler le jeton Vault existant.

Pour désactiver le rattrapage en cas de problème, utiliser le SQL `select cron.unschedule('gv-resolve-due');` sur **le projet Supabase concerné**. Ne pas afficher dans les logs la valeur du jeton dédié ou celle des secrets GitHub.

Secrets utilisés : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`. Comme pour le site, **seul `master` déploie** : le serveur de `dev` n'est jamais mis en ligne tout seul.

**Développement.** `supabase start` en local demande Docker, absent du conteneur de l'agent. On teste donc :
- les règles et la résolution des secteurs sans serveur (tests Node, comme les autres `*.check.cjs`) ;
- les migrations hors ligne avec `node src/game/supabase.check.cjs` : il les applique dans un Postgres en mémoire (PGlite) par-dessus un faux environnement Supabase (`supabase/tests/supabase-stubs.sql`), puis lance les suites `supabase/tests/*.test.mjs` (contraintes, droits, RLS, publication Realtime) ;
- le serveur réel sur le projet, avec deux navigateurs (deux comptes anonymes) avant chaque publication.

## 10. Plan de tests

| Niveau | Ce qu'on vérifie |
| --- | --- |
| Moteur | même graine et mêmes choix → même course, secteur par secteur ; `playRound` contre l'IA inchangé |
| Copie des règles | `_shared/game` identique à `src/game` |
| Fonctions | salle complète, coup en double refusé, coup adverse invisible avant résolution, délai → IA, double absence → abandon, égalité → remboursement |
| Mises | pot moins 10 % au vainqueur, réclamation unique, salle expirée → remboursement |
| Bout en bout | deux navigateurs, cinq secteurs, déconnexion en cours de course, revanche |

## 11. Après la V1

- **V2 · Amis et palmarès** : `gv_friends (player, friend, created_at)`, vue `gv_head_to_head` (victoires et défaites entre deux joueurs).

## 12. Décisions et points restants

- **Mises** : 0 (sans mise), 50, 100, 250, 500 ₡ ; au plus 25 % des crédits déclarés. La contrainte SQL `stake in (0, 50, 100, 250, 500)` du § 6 est la bonne.
- **Plafonds** : 9, 15 ou 22 (`cap in (9, 15, 22)`).
- **Revanche** : même mise et même plafond ; `create-room` accepte une salle d'origine pour recopier ses réglages.
- **Planification des salles** : retenue via `pg_cron` + `pg_net`. Le script `supabase/scheduler/activate.sh` est lancé automatiquement après déploiement de `resolve-due` depuis `master` ; voir § 9. Les essais sur Supabase hébergé restent nécessaires pour confirmer l'exécution réelle.
- **Reste à confirmer** : la région du projet.

## Échanges entre amis

La migration additive `20261118030000_echanges_amis.sql` crée `gv_friendships`. Elle conserve le demandeur, le destinataire, l’état (`pending` ou `accepted`) et la date de création. Une paire est unique quel que soit le sens de la demande. La RLS limite la lecture aux deux participants authentifiés. `gv_friends()` renvoie leurs lignes avec le pseudo et le code ami de l’autre participant, sans élargir la lecture de `gv_players`. Seul `service_role` écrit dans la table.

- `request-friend` reçoit `{ code }`. Une demande croisée accepte la ligne existante. Une demande à soi-même ou répétée est refusée, de même qu’une onzième demande envoyée en attente ou une nouvelle demande si un des joueurs a déjà 50 amis.
- `answer-friend` reçoit `{ id, action }`. Seul le destinataire peut accepter (`accept`) ou refuser (`refuse`) une demande en attente. L’acceptation vérifie la limite de 50 amis des deux joueurs. Chacun peut retirer une amitié acceptée (`remove`). Un refus ou un retrait supprime la ligne.

Les fonctions vérifient le jeton du joueur via l’enveloppe HTTP commune et verrouillent les deux participants pendant la mutation pour appliquer les plafonds malgré des demandes simultanées. Le client réutilise la session anonyme et `register`. Le déploiement sur Supabase hébergé attend la relecture de la migration par le propriétaire et la fusion dans `master`.

### Vitrine, offres et réclamations

La migration additive `20261118040000_echanges.sql` crée les tables suivantes. Elles ont toutes une politique RLS de lecture pour les joueurs authentifiés. Les écritures passent par les fonctions Edge sous `service_role`.

| Table | Contenu | Lecture |
| --- | --- | --- |
| `gv_showcase` | Joueur, identifiant de voiture et instantané déclaré | Propriétaire et amis acceptés |
| `gv_trades` | Proposeur, destinataire, état, offre précédente et échéance | Les deux participants |
| `gv_trade_items` | Voiture avec sa préparation transmise ou crédits, par côté | Les deux participants |
| `gv_trade_claims` | Horodatage de la réclamation, unique par échange et joueur | Les deux participants |

- `set-showcase` reçoit `{ cars }`, un dictionnaire d'instantanés par identifiant de voiture. Il remplace la vitrine de ton compte. Un dictionnaire vide la vide. Les pièces montées restent visibles dans l’instantané de la vitrine. Une vitrine ou un lot proposé contient au plus 1 000 voitures et 1 Mio de JSON UTF-8, avec au plus 16 Kio par instantané. Une vitrine invalide renvoie `INVALID_SHOWCASE`.
- `propose-trade` reçoit `{ recipient, give, want }`. `give` contient `{ cars, credits }` avec les instantanés que tu proposes. `want` contient `{ cars, credits }` avec les identifiants demandés. Le serveur copie ces voitures depuis la vitrine de ton ami. Les pièces montées sont exclues du lot transmis. Tu peux envoyer jusqu’à dix offres ouvertes à la fois, contre-offres comprises. Les codes `NOT_FRIENDS`, `OPEN_TRADE_LIMIT`, `CAR_NOT_IN_SHOWCASE` et `INVALID_OFFER` distinguent ces refus.
- `answer-trade` reçoit `{ id, action }`. Le destinataire peut accepter (`accept`), refuser (`refuse`) ou contre-proposer (`counter`, avec `give` et `want` comme pour une proposition). Le proposeur peut annuler (`cancel`). Refus et annulations donnent l'état `declined`. Une contre-offre rend l'ancienne offre `countered` et ouvre une nouvelle offre pour 24 heures. Le verrou de l'échange garantit une seule acceptation. Une offre déjà traitée renvoie `TRADE_NOT_OPEN`. Un tiers reçoit `TRADE_UNAVAILABLE`.
- `claim-trade` reçoit `{ id }` et renvoie le même reçu `{ id, side, goods }` à chaque appel réussi du même joueur. `goods` contient exclusivement le lot de l'autre côté. Le reçu confirme la demande de livraison. Attends l'état `done` avant d'appliquer `goods` à la sauvegarde. Les deux réclamations déclenchent ensemble cette décision. En cas de `returned`, restaure tes biens depuis ton transit local, même si tu avais déjà obtenu un reçu.

L'appel planifié de `resolve-due` ajoute les échanges traités à sa réponse. Une offre encore ouverte à son échéance passe à `expired`. À compter de l'acceptation, les deux joueurs ont 24 heures pour réclamer. Si le délai s'écoule avant la seconde réclamation, l'état `returned` autorise le retour des biens aux deux garages. Le planificateur utilise la tâche existante du § 9.

Le contrôle du format des offres est extrait de `src/game/trade.ts` lors de la synchronisation. Les contrôles du solde, des engagements et du contenu réel des garages s'effectuent dans les sauvegardes locales. Le serveur conserve les instantanés déclarés et l'unicité des décisions et réclamations. Le déploiement hébergé attend la relecture des migrations et la fusion dans `master`.

Le client `src/game/trade-client.ts` utilise la session anonyme commune, créée par le parcours Amis avec `register`. Il lit `gv_showcase` pour afficher une vitrine et `gv_trades` avec `gv_trade_items` et `gv_trade_claims` pour les listes et la reprise. Il appelle `set-showcase`, `propose-trade`, `answer-trade` et `claim-trade` depuis le réglage expérimental. Le deuxième appel à `claim-trade` peut rendre le lot livrable pendant cette même synchronisation. Le client relit alors l’état serveur avant de l’appliquer.
