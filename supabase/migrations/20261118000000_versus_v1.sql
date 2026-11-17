-- Versus V1 : duels et mises (docs/supabase.md § 6 et § 8, docs/versus.md § 3 à § 5).
-- Schéma, sécurité ligne par ligne, droits et publication Realtime. Les écritures passent toutes par les fonctions serveur
-- (service_role) : anon et authenticated n'ont aucun droit d'écriture, et seul authenticated lit, à travers la RLS.

create type public.gv_room_state as enum ('open', 'ready', 'racing', 'done', 'expired', 'cancelled');

create table public.gv_players (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 20),
  friend_code text not null unique check (friend_code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

create table public.gv_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- code court de l'invitation (lien et QR)
  host uuid not null references public.gv_players,
  guest uuid references public.gv_players,
  cap smallint not null check (cap in (9, 15, 22)),
  stake integer not null check (stake in (0, 50, 100, 250, 500)),
  seed text not null,
  state public.gv_room_state not null default 'open',
  sector smallint not null default 0 check (sector between 0 and 4), -- secteur en cours
  sector_deadline timestamptz,                     -- fin des 20 secondes du secteur en cours
  missed jsonb not null default '{}',              -- secteurs sans réponse par joueur
  winner uuid references public.gv_players,        -- null : égalité ou pas encore fini
  rematch_of uuid references public.gv_rooms on delete set null, -- salle d'origine d'une revanche
  expires_at timestamptz not null default now() + interval '10 minutes',
  created_at timestamptz not null default now()
);

create table public.gv_lineups (
  room uuid references public.gv_rooms on delete cascade,
  player uuid references public.gv_players,
  cars jsonb not null,                             -- 3 voitures et leur préparation, revérifiées par le serveur
  primary key (room, player)
);

create table public.gv_moves (
  room uuid references public.gv_rooms on delete cascade,
  sector smallint not null check (sector between 0 and 4),
  player uuid references public.gv_players,
  car smallint not null check (car between 0 and 2),
  stance text not null check (stance in ('normal', 'attaque', 'gestion')),
  nitro boolean not null,
  auto boolean not null default false,             -- joué par l'IA après le délai
  created_at timestamptz not null default now(),
  primary key (room, sector, player)
);

create table public.gv_rounds (
  room uuid references public.gv_rooms on delete cascade,
  sector smallint not null check (sector between 0 and 4),
  result jsonb not null,                           -- scores, lignes, chance, vainqueur du secteur
  primary key (room, sector)
);

create table public.gv_settlements (
  room uuid references public.gv_rooms on delete cascade,
  player uuid references public.gv_players,
  delta integer not null,                          -- crédits à appliquer à la sauvegarde (peut être négatif ou nul)
  reason text not null,                            -- 'win', 'loss', 'tie', 'forfeit', 'refund'
  claimed_at timestamptz,
  primary key (room, player)
);

-- gv_rooms (code) est couvert par l'index de la contrainte unique.
create index gv_rooms_state_expires_at on public.gv_rooms (state, expires_at);
create index gv_rooms_state_sector_deadline on public.gv_rooms (state, sector_deadline);

-- Droits : lecture seule pour authenticated, rien pour anon, tout pour service_role.
revoke all on public.gv_players, public.gv_rooms, public.gv_lineups, public.gv_moves, public.gv_rounds, public.gv_settlements
  from public, anon, authenticated;
grant select on public.gv_players, public.gv_rooms, public.gv_lineups, public.gv_moves, public.gv_rounds, public.gv_settlements
  to authenticated;
grant all on public.gv_players, public.gv_rooms, public.gv_lineups, public.gv_moves, public.gv_rounds, public.gv_settlements
  to service_role;

alter table public.gv_players enable row level security;
alter table public.gv_rooms enable row level security;
alter table public.gv_lineups enable row level security;
alter table public.gv_moves enable row level security;
alter table public.gv_rounds enable row level security;
alter table public.gv_settlements enable row level security;

-- Lecture (RLS). Les politiques passent par gv_rooms (et gv_rounds pour les coups), jamais l'inverse : pas de boucle.
create policy gv_rooms_read on public.gv_rooms for select to authenticated
  using (auth.uid() in (host, guest));

create policy gv_players_read on public.gv_players for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.gv_rooms r
      where (r.host = auth.uid() and r.guest = gv_players.id) or (r.guest = auth.uid() and r.host = gv_players.id)
    )
  );

create policy gv_lineups_read on public.gv_lineups for select to authenticated
  using (exists (select 1 from public.gv_rooms r where r.id = gv_lineups.room and auth.uid() in (r.host, r.guest)));

create policy gv_rounds_read on public.gv_rounds for select to authenticated
  using (exists (select 1 from public.gv_rooms r where r.id = gv_rounds.room and auth.uid() in (r.host, r.guest)));

-- Son propre coup toujours ; celui de l'adversaire seulement une fois le secteur résolu (ligne gv_rounds visible).
create policy gv_moves_read on public.gv_moves for select to authenticated
  using (
    player = auth.uid()
    or exists (select 1 from public.gv_rounds o where o.room = gv_moves.room and o.sector = gv_moves.sector)
  );

create policy gv_settlements_read on public.gv_settlements for select to authenticated
  using (player = auth.uid());

-- Temps réel : état de la salle et résultats des secteurs. Les coups ne sont jamais diffusés.
alter publication supabase_realtime add table public.gv_rooms, public.gv_rounds;
