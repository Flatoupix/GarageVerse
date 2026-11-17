// Migration versus V1 (supabase/migrations/20261118000000_versus_v1.sql) : contraintes, droits, RLS et publication Realtime.
// Lancé par node src/game/supabase.check.cjs, dans une base PGlite neuve.

const HOST = '00000000-0000-4000-8000-000000000001'
const GUEST = '00000000-0000-4000-8000-000000000002'
const THIRD = '00000000-0000-4000-8000-000000000003'
const FOURTH = '00000000-0000-4000-8000-000000000004'
const ROOM = '10000000-0000-4000-8000-000000000001'
const TABLES = ['gv_players', 'gv_rooms', 'gv_lineups', 'gv_moves', 'gv_rounds', 'gv_settlements']

// Une ligne valide par table, et une modification simple, pour tester les écritures refusées.
const WRITES = {
  gv_players: [`insert into gv_players (id, nickname, friend_code) values ('${THIRD}', 'Intrus', 'ZZZ999')`, `update gv_players set nickname = 'Pirate'`],
  gv_rooms: [`insert into gv_rooms (code, host, cap, stake, seed) values ('INTRUS99', '${HOST}', 9, 0, 's')`, `update gv_rooms set stake = 500`],
  gv_lineups: [`insert into gv_lineups (room, player, cars) values ('${ROOM}', '${HOST}', '[]')`, `update gv_lineups set cars = '[]'`],
  gv_moves: [`insert into gv_moves (room, sector, player, car, stance, nitro) values ('${ROOM}', 4, '${HOST}', 0, 'normal', false)`, `update gv_moves set nitro = true`],
  gv_rounds: [`insert into gv_rounds (room, sector, result) values ('${ROOM}', 4, '{}')`, `update gv_rounds set result = '{}'`],
  gv_settlements: [`insert into gv_settlements (room, player, delta, reason) values ('${ROOM}', '${HOST}', 1000, 'win')`, `update gv_settlements set delta = 1000`]
}

export async function run(db, { assert, as, user }) {
  const service = sql => as('service_role', null, () => db.query(sql))
  const rows = async (role, id, sql) => (await as(role, id, () => db.query(sql))).rows
  const rejects = (role, id, sql, pattern) => assert.rejects(as(role, id, () => db.query(sql)), pattern, `${role} : ${sql}`)

  // Schéma : type, tables, revanche, index.
  const states = await db.query(`select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'gv_room_state' order by e.enumsortorder`)
  assert.deepEqual(states.rows.map(r => r.enumlabel), ['open', 'ready', 'racing', 'done', 'expired', 'cancelled'])
  const rls = await db.query(`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname in (${TABLES.map(t => `'${t}'`).join(', ')})`)
  assert.equal(rls.rows.length, 6)
  for (const r of rls.rows) assert.equal(r.relrowsecurity, true, `RLS sur ${r.relname}`)
  const indexes = (await db.query(`select indexdef from pg_indexes where schemaname = 'public' and tablename = 'gv_rooms'`)).rows.map(r => r.indexdef)
  for (const cols of ['(code)', '(state, expires_at)', '(state, sector_deadline)']) assert.ok(indexes.some(d => d.endsWith(cols)), `index gv_rooms ${cols}`)

  // Données de test, écrites par service_role.
  for (const id of [HOST, GUEST, THIRD, FOURTH]) await user(id)
  await service(`insert into gv_players (id, nickname, friend_code) values ('${HOST}', 'Hote', 'HOST01'), ('${GUEST}', 'Invite', 'GUES02'), ('${THIRD}', 'Tiers', 'THIR03')`)
  await service(`insert into gv_rooms (id, code, host, guest, cap, stake, seed, state) values ('${ROOM}', 'ABCDEFGH', '${HOST}', '${GUEST}', 15, 100, 'graine', 'racing')`)
  await service(`insert into gv_lineups (room, player, cars) values ('${ROOM}', '${HOST}', '[1, 2, 3]'), ('${ROOM}', '${GUEST}', '[4, 5, 6]')`)
  await service(`insert into gv_moves (room, sector, player, car, stance, nitro) values
    ('${ROOM}', 0, '${HOST}', 0, 'attaque', true), ('${ROOM}', 0, '${GUEST}', 1, 'gestion', false), ('${ROOM}', 1, '${GUEST}', 2, 'normal', false)`)
  await service(`insert into gv_settlements (room, player, delta, reason) values ('${ROOM}', '${HOST}', 180, 'win'), ('${ROOM}', '${GUEST}', 0, 'loss')`)

  // Contraintes de valeur.
  for (const stake of [0, 50, 100, 250, 500]) await service(`insert into gv_rooms (code, host, cap, stake, seed) values ('STAKE${stake}', '${HOST}', 9, ${stake}, 's')`)
  for (const stake of [75, -50, 1000]) await rejects('service_role', null, `insert into gv_rooms (code, host, cap, stake, seed) values ('BAD${stake}', '${HOST}', 9, ${stake}, 's')`, /check constraint/)
  for (const cap of [9, 15, 22]) await service(`insert into gv_rooms (code, host, cap, stake, seed) values ('CAP${cap}', '${HOST}', ${cap}, 0, 's')`)
  for (const cap of [0, 10, 23]) await rejects('service_role', null, `insert into gv_rooms (code, host, cap, stake, seed) values ('BADCAP${cap}', '${HOST}', ${cap}, 0, 's')`, /check constraint/)
  await rejects('service_role', null, `insert into gv_rooms (code, host, cap, stake, seed) values ('ABCDEFGH', '${HOST}', 9, 0, 's')`, /unique constraint/)
  await service(`insert into gv_rooms (code, host, cap, stake, seed, rematch_of) values ('REMATCH1', '${HOST}', 15, 100, 's', '${ROOM}')`)
  await rejects('service_role', null, `insert into gv_rooms (code, host, cap, stake, seed, rematch_of) values ('REMATCH2', '${HOST}', 15, 100, 's', gen_random_uuid())`, /foreign key/)
  const move = (sector, car, stance) => `insert into gv_moves (room, sector, player, car, stance, nitro) values ('${ROOM}', ${sector}, '${THIRD}', ${car}, '${stance}', false)`
  for (const [sector, car, stance] of [[5, 0, 'normal'], [-1, 0, 'normal'], [2, 3, 'normal'], [2, -1, 'normal'], [2, 0, 'prudence']]) await rejects('service_role', null, move(sector, car, stance), /check constraint/)
  await rejects('service_role', null, `insert into gv_rounds (room, sector, result) values ('${ROOM}', 5, '{}')`, /check constraint/)
  await rejects('service_role', null, `insert into gv_players (id, nickname, friend_code) values ('${FOURTH}', 'Double', 'HOST01')`, /unique constraint "gv_players_friend_code_key"/)
  for (const code of ['abc123', 'ABC12', 'ABC-12', 'ABC1234']) await rejects('service_role', null, `update gv_players set friend_code = '${code}' where id = '${THIRD}'`, /check constraint/)
  for (const nickname of ['A', 'A'.repeat(21)]) await rejects('service_role', null, `update gv_players set nickname = '${nickname}' where id = '${THIRD}'`, /check constraint/)
  await service(`update gv_players set friend_code = 'AB12CD', nickname = 'AB' where id = '${THIRD}'`)
  await service(`update gv_players set nickname = '${'B'.repeat(20)}' where id = '${THIRD}'`)

  // Droits : anon ne lit rien, personne d'autre que service_role n'écrit.
  for (const table of TABLES) {
    for (const role of ['anon', 'authenticated']) {
      for (const privilege of ['insert', 'update', 'delete']) {
        const { rows: [r] } = await db.query(`select has_table_privilege($1, $2, $3) as ok`, [role, `public.${table}`, privilege])
        assert.equal(r.ok, false, `${role} ${privilege} ${table}`)
      }
    }
    const { rows: [r] } = await db.query(`select has_table_privilege('anon', $1, 'select') as ok`, [`public.${table}`])
    assert.equal(r.ok, false, `anon select ${table}`)
    await rejects('anon', null, `select * from ${table}`, /permission denied/)
    for (const sql of WRITES[table]) {
      await rejects('authenticated', HOST, sql, /permission denied/)
      await rejects('anon', null, sql, /permission denied/)
    }
    await rejects('authenticated', HOST, `delete from ${table}`, /permission denied/)
  }

  // Salles : l'hôte et l'invité voient leur salle, son écurie et ses résultats ; le tiers ne voit rien.
  for (const id of [HOST, GUEST]) {
    assert.deepEqual((await rows('authenticated', id, `select code from gv_rooms where id = '${ROOM}'`)).map(r => r.code), ['ABCDEFGH'])
    assert.equal((await rows('authenticated', id, `select * from gv_lineups`)).length, 2)
  }
  assert.equal((await rows('authenticated', GUEST, `select * from gv_rooms`)).length, 1, 'les salles de l’hôte seul restent privées')
  for (const table of ['gv_rooms', 'gv_lineups', 'gv_moves', 'gv_settlements']) assert.equal((await rows('authenticated', THIRD, `select * from ${table}`)).length, 0, `tiers ${table}`)

  // Joueurs : soi-même et l'adversaire d'une salle commune, pas le tiers.
  const seen = async id => (await rows('authenticated', id, `select id from gv_players order by id`)).map(r => r.id)
  assert.deepEqual(await seen(HOST), [HOST, GUEST])
  assert.deepEqual(await seen(GUEST), [HOST, GUEST])
  assert.deepEqual(await seen(THIRD), [THIRD])

  // Règlements : sa propre ligne seulement.
  const settled = async id => (await rows('authenticated', id, `select player, delta from gv_settlements`)).map(r => `${r.player}:${r.delta}`)
  assert.deepEqual(await settled(HOST), [`${HOST}:180`])
  assert.deepEqual(await settled(GUEST), [`${GUEST}:0`])

  // Coups secrets : l'adversaire reste caché tant que gv_rounds n'a pas la ligne du secteur.
  const moves = async id => (await rows('authenticated', id, `select sector, player from gv_moves order by sector, player`)).map(r => `${r.sector}:${r.player}`)
  assert.deepEqual(await moves(HOST), [`0:${HOST}`])
  assert.deepEqual(await moves(GUEST), [`0:${GUEST}`, `1:${GUEST}`])
  await service(`insert into gv_rounds (room, sector, result) values ('${ROOM}', 0, '{"winner": "A"}')`)
  assert.deepEqual(await moves(HOST), [`0:${HOST}`, `0:${GUEST}`], 'secteur 1 résolu, secteur 2 encore caché')
  assert.deepEqual(await moves(GUEST), [`0:${HOST}`, `0:${GUEST}`, `1:${GUEST}`])
  assert.equal((await rows('authenticated', THIRD, `select * from gv_moves`)).length, 0, 'tiers : coups invisibles même résolus')
  for (const id of [HOST, GUEST]) assert.equal((await rows('authenticated', id, `select * from gv_rounds`)).length, 1)
  assert.equal((await rows('authenticated', THIRD, `select * from gv_rounds`)).length, 0)

  // service_role écrit partout.
  await service(`update gv_rooms set sector = 1, state = 'done', winner = '${HOST}' where id = '${ROOM}'`)
  await service(`update gv_settlements set claimed_at = now() where room = '${ROOM}'`)
  await service(`delete from gv_moves where sector = 1`)
  await service(`delete from gv_rooms where code = 'REMATCH1'`)

  // Temps réel : salles et résultats seulement.
  const published = (await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by tablename`)).rows.map(r => r.tablename)
  assert.deepEqual(published, ['gv_rooms', 'gv_rounds'])
}
