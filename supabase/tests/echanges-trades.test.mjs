const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const tables = ['gv_showcase', 'gv_trades', 'gv_trade_items', 'gv_trade_claims']

export async function run(db, { assert, as, user }) {
  const [a, b, c] = await Promise.all([1, 2, 3].map(n => user(uuid(n))))
  await db.query("insert into gv_players (id, nickname, friend_code) values ($1, 'Pilote A', 'AAAA01'), ($2, 'Pilote B', 'BBBB02'), ($3, 'Pilote C', 'CCCC03')", [a, b, c])
  await db.query("insert into gv_friendships (requester, recipient, state) values ($1, $2, 'accepted'), ($1, $3, 'pending')", [a, b, c])
  await db.query("insert into gv_showcase values ($1, 'car', '{}')", [a])
  const { rows: [trade] } = await db.query('insert into gv_trades (proposer, recipient) values ($1, $2) returning *', [a, b])
  assert.equal(+trade.expires_at - +trade.created_at, 86_400_000)
  await db.query("insert into gv_trade_items (trade_id, side, credits) values ($1, 'proposer', 10)", [trade.id])
  await db.query('insert into gv_trade_claims (trade_id, player_id) values ($1, $2)', [trade.id, a])

  for (const player of [a, b, c]) {
    for (const table of tables) {
      const { rows } = await as('authenticated', player, () => db.query(`select * from ${table}`))
      assert.equal(rows.length, player === c ? 0 : 1)
    }
  }
  for (const role of ['anon', 'authenticated']) {
    for (const [table, column] of [['gv_showcase', 'snapshot'], ['gv_trades', 'state'], ['gv_trade_items', 'trade_id'], ['gv_trade_claims', 'trade_id']]) {
      for (const sql of [`insert into ${table} default values`, `update ${table} set ${column} = ${column}`, `delete from ${table}`]) {
        await assert.rejects(as(role, a, () => db.query(sql)), /permission denied/)
      }
    }
  }
  await assert.rejects(db.query("update gv_trades set state = 'unknown'"), /check constraint/)
  await assert.rejects(db.query('update gv_trades set recipient = proposer'), /check constraint/)
  await assert.rejects(db.query('update gv_trade_items set credits = 0'), /check constraint/)
  await assert.rejects(db.query("update gv_trade_items set car_id = 'car', snapshot = '{}'"), /check constraint/)
  await assert.rejects(db.query('insert into gv_trade_claims (trade_id, player_id) values ($1, $2)', [trade.id, a]), /unique constraint/)
}
