create table public.gv_friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.gv_players(id) on delete cascade,
  recipient uuid not null references public.gv_players(id) on delete cascade,
  state text not null default 'pending' check (state in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> recipient)
);

create unique index gv_friendships_pair on public.gv_friendships (least(requester, recipient), greatest(requester, recipient));
create index gv_friendships_requester on public.gv_friendships (requester);
create index gv_friendships_recipient on public.gv_friendships (recipient);

alter table public.gv_friendships enable row level security;
revoke all on public.gv_friendships from public, anon, authenticated;
grant select on public.gv_friendships to authenticated;
grant all on public.gv_friendships to service_role;

create policy gv_friendships_read on public.gv_friendships for select to authenticated
  using ((select auth.uid()) in (requester, recipient));

-- Le filtre explicite protège la liste même sous le propriétaire de la fonction.
create function public.gv_friends()
returns table (id uuid, state text, outgoing boolean, nickname text, friend_code text)
language sql stable security definer set search_path = ''
as $$
  with viewer as (select auth.uid() as player)
  select f.id, f.state, f.requester = v.player, p.nickname, p.friend_code
  from viewer v
  join public.gv_friendships f on v.player in (f.requester, f.recipient)
  join public.gv_players p on p.id = case when v.player = f.requester then f.recipient else f.requester end
  order by f.created_at desc, f.id
$$;

revoke all on function public.gv_friends() from public, anon, authenticated;
grant execute on function public.gv_friends() to authenticated;
