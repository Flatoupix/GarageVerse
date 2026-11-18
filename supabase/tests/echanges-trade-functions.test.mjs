import { answerTrade, claimTrade, proposeTrade, resolveTrades, setShowcase } from '../functions/_shared/trades.ts'

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const day = 86_400_000
const card = { stage: 3, parts: ['turbo'], editions: ['base'], upgrades: { acc: 1 } }
const offer = { give: { cars: {}, credits: 20 }, want: { cars: ['car'], credits: 5 } }

export async function run(db, { assert, user }) {
  const [a, b, c] = await Promise.all([1, 2, 3].map(n => user(uuid(n))))
  await db.query("insert into gv_players (id, nickname, friend_code) values ($1, 'Pilote A', 'AAAA01'), ($2, 'Pilote B', 'BBBB02'), ($3, 'Pilote C', 'CCCC03')", [a, b, c])
  await db.query("insert into gv_friendships (requester, recipient, state) values ($1, $2, 'accepted'), ($1, $3, 'pending')", [a, b, c])
  let time = Date.parse('2026-11-18T00:00:00Z')
  const context = (player, body, sql = (text, params) => db.query(text, params)) => ({
    sql, player, body, now: () => new Date(time), random: () => 0,
  })
  const propose = (player, recipient, payload = offer) => proposeTrade(context(player, { recipient, ...payload }))
  const answer = (player, id, action, payload = {}) => answerTrade(context(player, { id, action, ...payload }))
  const claim = (player, id) => claimTrade(context(player, { id }))
  const state = async id => (await db.query('select * from gv_trades where id = $1', [id])).rows[0]
  const rejected = async (pending, error) => {
    const result = await pending
    assert.equal(result.ok, false)
    assert.equal(result.error, error)
    assert.ok(result.status >= 400 && result.status < 500)
  }
  const success = async pending => {
    const result = await pending
    assert.equal(result.ok, true, JSON.stringify(result))
    return result.data
  }

  await rejected(propose(a, c), 'NOT_FRIENDS')
  await rejected(propose(a, b), 'CAR_NOT_IN_SHOWCASE')
  await rejected(propose(a, b, { ...offer, want: { cars: ['car', 'car'], credits: 0 } }), 'INVALID_OFFER')
  await success(setShowcase(context(b, { cars: { car: card } })))
  const first = await success(propose(a, b))
  assert.equal(+((await state(first.id)).expires_at), time + day)
  await rejected(answer(c, first.id, 'accept'), 'TRADE_UNAVAILABLE')
  await rejected(answer(b, first.id, 'cancel'), 'TRADE_UNAVAILABLE')
  time += 60_000
  const counter = await success(answer(b, first.id, 'counter', {
    give: { cars: { car: card }, credits: 0 }, want: { cars: [], credits: 10 },
  }))
  assert.equal((await state(first.id)).state, 'countered')
  assert.equal((await state(counter.id)).previous_id, first.id)
  assert.equal(+(await state(counter.id)).expires_at, time + day)
  await rejected(answer(b, first.id, 'accept'), 'TRADE_NOT_OPEN')
  await success(answer(a, counter.id, 'refuse'))

  const cancelled = await success(propose(a, b))
  await success(answer(a, cancelled.id, 'cancel'))
  assert.equal((await state(cancelled.id)).state, 'declined')

  const open = []
  for (let i = 0; i < 10; i++) open.push(await success(propose(a, b)))
  await rejected(propose(a, b), 'OPEN_TRADE_LIMIT')
  const [completed, returned, expired] = open
  // PGlite partage une session. Les appels se chevauchent avant le verrou, puis les transactions s'exécutent en série.
  let tail = Promise.resolve()
  const accepting = () => {
    let release
    const sql = async (text, params) => {
      if (text.startsWith('begin')) {
        const previous = tail
        tail = new Promise(resolve => { release = resolve })
        await previous
      }
      try {
        return await db.query(text, params)
      } finally {
        if (text === 'commit' || text === 'rollback') release()
      }
    }
    return answerTrade(context(b, { id: completed.id, action: 'accept' }, sql))
  }
  const results = await Promise.all([accepting(), accepting()])
  assert.equal(results.filter(result => result.ok).length, 1)
  assert.equal(results.find(result => !result.ok).error, 'TRADE_NOT_OPEN')
  assert.equal((await state(completed.id)).state, 'accepted')
  await rejected(claim(c, completed.id), 'TRADE_UNAVAILABLE')
  const receipt = await success(claim(a, completed.id))
  assert.deepEqual(receipt.goods, { cars: { car: { ...card, parts: [] } }, credits: 5 })
  assert.deepEqual(await success(claim(a, completed.id)), receipt)
  assert.equal((await state(completed.id)).state, 'accepted')
  assert.deepEqual((await success(claim(b, completed.id))).goods, { cars: {}, credits: 20 })
  assert.equal((await state(completed.id)).state, 'done')
  assert.deepEqual(await success(claim(a, completed.id)), receipt)
  assert.equal((await db.query('select * from gv_trade_claims where trade_id = $1', [completed.id])).rows.length, 2)

  time += 60_000
  await success(answer(b, returned.id, 'accept'))
  const returnedReceipt = await success(claim(b, returned.id))
  time += day - 60_000
  const due = () => resolveTrades(context(null, {}))
  assert.ok((await due()).some(row => row.id === expired.id && row.state === 'expired'))
  assert.equal((await state(returned.id)).state, 'accepted')
  time += 60_000
  assert.deepEqual(await due(), [{ id: returned.id, state: 'returned' }])
  assert.deepEqual(await success(claim(b, returned.id)), returnedReceipt)
  await rejected(claim(a, returned.id), 'TRADE_NOT_ACCEPTED')
  assert.deepEqual(await due(), [])
}
