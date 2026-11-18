const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export async function run(db, { assert, as, user }) {
  const [a, b, c] = [1, 2, 3].map(uuid)
  for (const id of [a, b, c]) await user(id)
  const write = (sql, params) => as('service_role', null, () => db.query(sql, params))
  const read = async (player, sql) => (await as('authenticated', player, () => db.query(sql))).rows
  const insert = 'insert into gv_friendships (requester, recipient) values ($1, $2)'
  await write("insert into gv_players (id, nickname, friend_code) values ($1, 'Pilote A', 'AAAA01'), ($2, 'Pilote B', 'BBBB02'), ($3, 'Pilote C', 'CCCC03')", [a, b, c])
  await write(insert, [a, b])

  for (const role of ['anon', 'authenticated']) {
    for (const sql of [insert, "update gv_friendships set state = 'accepted'", 'delete from gv_friendships']) {
      const params = sql === insert ? [a, c] : []
      await assert.rejects(as(role, a, () => db.query(sql, params)), /permission denied/)
    }
  }
  await assert.rejects(as('anon', null, () => db.query('select * from gv_friends()')), /permission denied/)
  await assert.rejects(write(insert, [b, a]), /unique constraint/)
  await assert.rejects(write(insert, [a, a]), /check constraint/)
  await assert.rejects(write("update gv_friendships set state = 'unknown'"), /check constraint/)

  assert.deepEqual(await read(c, 'select * from gv_friendships'), [])
  assert.deepEqual(await read(c, 'select * from gv_friends()'), [])
  for (const [player, outgoing, nickname, friend_code] of [[a, true, 'Pilote B', 'BBBB02'], [b, false, 'Pilote A', 'AAAA01']]) {
    const [row] = await read(player, 'select * from gv_friendships')
    assert.deepEqual(await read(player, 'select * from gv_friends()'), [
      { id: row.id, state: 'pending', outgoing, nickname, friend_code },
    ])
  }
}
