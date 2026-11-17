-- Une seule lecture cohérente après un changement Realtime ou une reconnexion.
-- Les politiques des tables s'appliquent au joueur qui appelle la fonction.
create function public.gv_snapshot(room_id uuid) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'room', to_jsonb(r), 'now', now(),
    'players', (select jsonb_object_agg(p.id, p.nickname) from gv_players p where p.id in (r.host,r.guest)),
    'lineups', (select jsonb_object_agg(l.player,l.cars) from gv_lineups l where l.room=r.id),
    'rounds', coalesce((select jsonb_agg(o.result order by o.sector) from gv_rounds o where o.room=r.id), '[]'::jsonb),
    'played', exists(select 1 from gv_moves m where m.room=r.id and m.sector=r.sector and m.player=auth.uid()),
    'settlement', (select jsonb_build_object('delta',s.delta,'claimed',s.claimed_at is not null) from gv_settlements s where s.room=r.id and s.player=auth.uid())
  ) from gv_rooms r where r.id=room_id and auth.uid() in (r.host,r.guest)
$$;
revoke all on function public.gv_snapshot(uuid) from public;
grant execute on function public.gv_snapshot(uuid) to authenticated;
