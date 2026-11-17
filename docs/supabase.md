# Supabase · préparation du multijoueur

Statut : **préparation, rien n'est encore créé côté serveur** (17 novembre 2026). Ce document complète [`docs/versus.md`](versus.md), qui décrit le jeu. Ici : le projet Supabase, le schéma, les fonctions serveur, la sécurité et le déploiement. Tickets liés : `tickets/003` (serveur), `004` (mises), `005` (client temps réel), `007` (amis), `008` (échange).

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
- La graine de la salle est tirée par le serveur ; tout le hasard de la course en découle (`dailyRng(graine)`).

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

**Délais sans serveur permanent.** Le client pourra appeler `resolve-due` à la fin du compte à rebours. Un appel avec le jeton `service_role` et un corps `{}` traite jusqu'à 100 salles en retard, dont les salles ouvertes expirées à rembourser. La configuration de la tâche planifiée et l'intégration au client restent à faire.

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
5. `supabase functions deploy` (toutes les fonctions).

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
- **V3 · Échange de cartes** : `gv_trades (id, from, to, state, expires_at)` et `gv_trade_items (trade, side, kind 'car'|'credits', car_id, prep, amount)`, fonctions `propose-trade`, `answer-trade`, `claim-trade`, avec le même principe de réception unique que les mises (`docs/versus.md` § 7).

## 12. Décisions et points restants

- **Mises** : 0 (sans mise), 50, 100, 250, 500 ₡ ; au plus 25 % des crédits déclarés. La contrainte SQL `stake in (0, 50, 100, 250, 500)` du § 6 est la bonne.
- **Plafonds** : 9, 15 ou 22 (`cap in (9, 15, 22)`).
- **Revanche** : même mise et même plafond ; `create-room` accepte une salle d'origine pour recopier ses réglages.
- **Mise en pause** : à éviter. Une tâche planifiée appelle le projet régulièrement (au moins tous les 3 jours) : soit `pg_cron` dans la base, soit une action GitHub planifiée qui interroge l'API. Choix au moment de la migration.
- **Reste à confirmer** : la région du projet.
