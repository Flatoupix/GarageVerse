-- Graine secrète (relecture du Versus V1, constat 1). Toute la chance d'une course (forme du jour, secteur parfait, incident)
-- découle de la graine : lisible par les joueurs, elle permettait à un jeu modifié de prévoir un incident et de l'éviter.
-- La graine passe dans gv_room_secrets, que seul le serveur lit. La salle publie à la place le circuit et la météo des
-- secteurs (déjà annoncés aux joueurs), et la graine n'y est recopiée qu'à l'arrivée (revealed_seed) pour vérification.

create table public.gv_room_secrets (
  room uuid primary key references public.gv_rooms on delete cascade,
  seed text not null
);
revoke all on public.gv_room_secrets from public, anon, authenticated;
grant all on public.gv_room_secrets to service_role;
alter table public.gv_room_secrets enable row level security;
-- Aucune politique : ni anon ni authenticated ne lisent cette table, même par une fonction security invoker.

insert into public.gv_room_secrets (room, seed) select id, seed from public.gv_rooms;

alter table public.gv_rooms
  add column circuit jsonb,         -- { name, sectors, conditions } du circuit tiré (versusRaceInfo)
  add column conditions jsonb,      -- météo de chacun des 5 secteurs
  add column revealed_seed text;    -- graine publiée seulement quand la salle est terminée ou expirée

-- Salles déjà terminées : leur graine peut être publiée. Les salles en cours gardent circuit et météo à null :
-- le serveur les complète au prochain appel qui les touche.
update public.gv_rooms r set revealed_seed = s.seed from public.gv_room_secrets s
  where s.room = r.id and r.state in ('done', 'expired', 'cancelled');

alter table public.gv_rooms drop column seed;
