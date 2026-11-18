create table public.gv_showcase (
  player_id uuid not null references public.gv_players(id) on delete cascade,
  car_id text not null check (btrim(car_id) <> ''),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  primary key (player_id, car_id)
);

create table public.gv_trades (
  id uuid primary key default gen_random_uuid(),
  proposer uuid not null references public.gv_players(id) on delete cascade,
  recipient uuid not null references public.gv_players(id) on delete cascade,
  state text not null default 'open'
    check (state in ('open', 'countered', 'declined', 'expired', 'accepted', 'done', 'returned')),
  previous_id uuid unique references public.gv_trades(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (proposer <> recipient)
);

create index gv_trades_due on public.gv_trades (state, expires_at);
create index gv_trades_proposer on public.gv_trades (proposer);
create index gv_trades_recipient on public.gv_trades (recipient);

create table public.gv_trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.gv_trades(id) on delete cascade,
  side text not null check (side in ('proposer', 'recipient')),
  car_id text check (btrim(car_id) <> ''),
  snapshot jsonb,
  credits integer check (credits > 0),
  check (
    (car_id is not null and snapshot is not null and jsonb_typeof(snapshot) = 'object' and credits is null)
    or (car_id is null and snapshot is null and credits is not null)
  )
);

create unique index gv_trade_items_car on public.gv_trade_items (trade_id, side, car_id) where car_id is not null;
create unique index gv_trade_items_credits on public.gv_trade_items (trade_id, side) where credits is not null;

create table public.gv_trade_claims (
  trade_id uuid not null references public.gv_trades(id) on delete cascade,
  player_id uuid not null references public.gv_players(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (trade_id, player_id)
);

alter table public.gv_showcase enable row level security;
alter table public.gv_trades enable row level security;
alter table public.gv_trade_items enable row level security;
alter table public.gv_trade_claims enable row level security;

revoke all on public.gv_showcase, public.gv_trades, public.gv_trade_items, public.gv_trade_claims from public, anon, authenticated;
grant select on public.gv_showcase, public.gv_trades, public.gv_trade_items, public.gv_trade_claims to authenticated;
grant all on public.gv_showcase, public.gv_trades, public.gv_trade_items, public.gv_trade_claims to service_role;

create policy gv_showcase_read on public.gv_showcase for select to authenticated
  using (player_id = (select auth.uid()) or exists (
    select 1 from public.gv_friendships f
    where f.state = 'accepted'
      and least(f.requester, f.recipient) = least(player_id, (select auth.uid()))
      and greatest(f.requester, f.recipient) = greatest(player_id, (select auth.uid()))
  ));

create policy gv_trades_read on public.gv_trades for select to authenticated
  using ((select auth.uid()) in (proposer, recipient));

-- La politique de gv_trades filtre aussi les lectures effectuées par ces deux politiques.
create policy gv_trade_items_read on public.gv_trade_items for select to authenticated
  using (exists (select 1 from public.gv_trades t where t.id = trade_id));

create policy gv_trade_claims_read on public.gv_trade_claims for select to authenticated
  using (exists (select 1 from public.gv_trades t where t.id = trade_id));
