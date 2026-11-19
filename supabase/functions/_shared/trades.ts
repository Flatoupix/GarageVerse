import type { Context, Sql } from './versus.ts'
import { areFriends, withPlayers } from './friends.ts'
import { validOffer } from './game/trade-offer.ts'

const fail = (error: string, status: number) => ({ ok: false as const, error, status })
const ok = <T>(data: T) => ({ ok: true as const, data })
export type TradeResult = ReturnType<typeof fail> | ReturnType<typeof ok>
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (value: unknown): value is string => typeof value === 'string' && uuid.test(value)
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const fields = (body: unknown) => object(body) ? body : {}
const maxCars = 1_000
const maxSnapshotBytes = 16 * 1024
const maxCarsBytes = 1024 * 1024
const encoder = new TextEncoder()
const unavailable = () => fail('TRADE_UNAVAILABLE', 404)

async function transaction<T>(sql: Sql, change: () => Promise<T>) {
  await sql('begin isolation level read committed')
  try {
    await sql('set local role service_role')
    const result = await change()
    await sql('commit')
    return result
  } catch (error) {
    await sql('rollback')
    throw error
  }
}

function validSnapshots(cars: Record<string, unknown>) {
  const snapshots = Object.values(cars)
  return snapshots.length <= maxCars
    && snapshots.every(snapshot => object(snapshot) && encoder.encode(JSON.stringify(snapshot)).length <= maxSnapshotBytes)
    && encoder.encode(JSON.stringify(cars)).length <= maxCarsBytes
}

export async function setShowcase({ sql, player, body }: Context) {
  if (!player) return fail('UNAUTHORIZED', 401)
  const { cars } = fields(body)
  if (!object(cars) || !validOffer({ cars: Object.keys(cars), credits: 0 }) || !validSnapshots(cars)) {
    return fail('INVALID_SHOWCASE', 400)
  }
  return withPlayers(sql, player, player, async () => {
    const { rows } = await sql('select 1 from gv_players where id = $1', [player])
    if (!rows.length) return fail('NOT_REGISTERED', 403)
    await sql('delete from gv_showcase where player_id = $1', [player])
    await sql(`insert into gv_showcase (player_id, car_id, snapshot)
      select $1, key, value from jsonb_each($2::text::jsonb)`, [player, JSON.stringify(cars)])
    return ok(null)
  })
}

function readOffer(body: unknown) {
  const { give, want } = fields(body)
  if (!object(give) || !object(give.cars) || !validOffer({ cars: Object.keys(give.cars), credits: give.credits })
    || !validSnapshots(give.cars) || !validOffer(want) || want.cars.length > maxCars) return
  if (!Object.keys(give.cars).length && !give.credits && !want.cars.length && !want.credits) return
  return { cars: give.cars, credits: Number(give.credits), want }
}

async function createOffer(ctx: Context, proposer: string, recipient: string, offer: NonNullable<ReturnType<typeof readOffer>>, previous: string | null) {
  const { sql } = ctx
  if (!await areFriends(sql, proposer, recipient)) return fail('NOT_FRIENDS', 403)
  const now = ctx.now().toISOString()
  const { rows: limits } = await sql(`select 1 from gv_trades
    where proposer = $1 and state = 'open' and expires_at > $2
    limit 1 offset 9`, [proposer, now])
  if (limits.length) return fail('OPEN_TRADE_LIMIT', 409)
  const { rows: requested } = await sql(`select car_id, snapshot from gv_showcase
    where player_id = $1 and car_id in (select jsonb_array_elements_text($2::text::jsonb))`, [recipient, JSON.stringify(offer.want.cars)])
  if (requested.length !== offer.want.cars.length) return fail('CAR_NOT_IN_SHOWCASE', 409)
  const { rows: [trade] } = await sql(`insert into gv_trades (proposer, recipient, previous_id, created_at, expires_at)
    values ($1, $2, $3, $4::timestamptz, $4::timestamptz + interval '24 hours') returning id`, [proposer, recipient, previous, now])

  for (const { side, cars, credits } of [
    { side: 'proposer', cars: offer.cars, credits: offer.credits },
    { side: 'recipient', cars: Object.fromEntries(requested.map(row => [row.car_id, row.snapshot])), credits: offer.want.credits },
  ]) {
    // Les pièces montées restent au donneur. Le reste de l'instantané est conservé.
    await sql(`insert into gv_trade_items (trade_id, side, car_id, snapshot)
      select $1, $2, key, value || '{"parts":[]}'::jsonb from jsonb_each($3::text::jsonb)`, [trade!.id, side, JSON.stringify(cars)])
    if (credits) await sql('insert into gv_trade_items (trade_id, side, credits) values ($1, $2, $3)', [trade!.id, side, credits])
  }
  if (previous) await sql("update gv_trades set state = 'countered' where id = $1", [previous])
  return ok({ id: trade!.id, state: 'open' })
}

export async function proposeTrade(ctx: Context) {
  const { sql, player, body } = ctx
  if (!player) return fail('UNAUTHORIZED', 401)
  const { recipient } = fields(body)
  const offer = readOffer(body)
  if (!isUuid(recipient) || recipient.toLowerCase() === player || !offer) return fail('INVALID_OFFER', 400)
  return withPlayers(sql, player, recipient, () => createOffer(ctx, player, recipient, offer, null))
}

async function lockTrade(sql: Sql, id: string, player: string) {
  const { rows: [trade] } = await sql('select * from gv_trades where id = $1 and $2 in (proposer, recipient) for update', [id, player])
  return trade
}

export async function answerTrade(ctx: Context) {
  const { sql, player, body } = ctx
  if (!player) return fail('UNAUTHORIZED', 401)
  const { id, action } = fields(body)
  if (!isUuid(id) || (action !== 'accept' && action !== 'refuse' && action !== 'cancel' && action !== 'counter')) {
    return fail('INVALID_REQUEST', 400)
  }

  // Les mutations d'offre prennent les verrous des deux joueurs avant le verrou de l'échange.
  const { rows: [pair] } = await sql('select proposer, recipient from gv_trades where id = $1 and $2 in (proposer, recipient)', [id, player])
  if (!pair || (action === 'cancel' ? pair.proposer !== player : pair.recipient !== player)) return unavailable()
  return withPlayers(sql, pair.proposer, pair.recipient, async () => {
    const trade = await lockTrade(sql, id, player)
    if (!trade || trade.state !== 'open') return fail('TRADE_NOT_OPEN', 409)
    const now = ctx.now()
    if (new Date(trade.expires_at) <= now) {
      await sql("update gv_trades set state = 'expired' where id = $1", [id])
      return fail('TRADE_EXPIRED', 409)
    }
    if (action === 'counter') {
      const offer = readOffer(body)
      if (!offer) return fail('INVALID_OFFER', 400)
      return createOffer(ctx, player, trade.proposer, offer, id)
    }
    if (action === 'accept') {
      if (!await areFriends(sql, player, trade.proposer)) return fail('NOT_FRIENDS', 403)
      await sql(`update gv_trades set state = 'accepted', expires_at = $2::timestamptz + interval '24 hours' where id = $1`, [id, now.toISOString()])
      return ok({ id, state: 'accepted' })
    }
    await sql("update gv_trades set state = 'declined' where id = $1", [id])
    return ok({ id, state: 'declined' })
  })
}

export async function claimTrade(ctx: Context) {
  const { sql, player, body } = ctx
  if (!player) return fail('UNAUTHORIZED', 401)
  const { id } = fields(body)
  if (!isUuid(id)) return fail('INVALID_REQUEST', 400)
  return transaction(sql, async () => {
    const trade = await lockTrade(sql, id, player)
    if (!trade) return unavailable()
    const side = player === trade.proposer ? 'recipient' : 'proposer'
    const receipt = async () => {
      const { rows } = await sql(`select car_id, snapshot, credits from gv_trade_items
        where trade_id = $1 and side = $2 order by car_id`, [id, side])
      return ok({
        id: trade.id, side,
        goods: {
          cars: Object.fromEntries(rows.filter(row => row.car_id !== null).map(row => [row.car_id, row.snapshot])),
          credits: rows.find(row => row.credits !== null)?.credits ?? 0,
        },
      })
    }
    const { rows: existing } = await sql('select 1 from gv_trade_claims where trade_id = $1 and player_id = $2', [id, player])
    if (existing.length) return receipt()
    if (trade.state !== 'accepted') return fail('TRADE_NOT_ACCEPTED', 409)
    const now = ctx.now()
    if (new Date(trade.expires_at) <= now) {
      await sql("update gv_trades set state = 'returned' where id = $1", [id])
      return fail('TRADE_RETURNED', 409)
    }
    await sql('insert into gv_trade_claims (trade_id, player_id, claimed_at) values ($1, $2, $3)', [id, player, now.toISOString()])
    // Le reçu est stable. Le lot indiqué ne devient livrable que lorsque les deux réceptions sont confirmées.
    await sql(`update gv_trades set state = 'done' where id = $1
      and (select count(*) from gv_trade_claims where trade_id = $1) = 2`, [id])
    return receipt()
  })
}

export async function resolveTrades(ctx: Context) {
  return transaction(ctx.sql, async () => {
    const { rows } = await ctx.sql(`update gv_trades set state = case when state = 'accepted' then 'returned' else 'expired' end
      where state in ('open', 'accepted') and expires_at <= $1 returning id, state`, [ctx.now().toISOString()])
    return rows.map(({ id, state }) => ({ id, state }))
  })
}
