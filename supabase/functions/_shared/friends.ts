import type { Context, Sql } from './versus.ts'

type Failure =
  | 'UNAUTHORIZED' | 'INVALID_REQUEST' | 'NOT_REGISTERED' | 'INVALID_FRIEND_CODE' | 'UNKNOWN_FRIEND_CODE'
  | 'SELF_REQUEST' | 'ALREADY_FRIENDS' | 'ALREADY_REQUESTED' | 'PENDING_LIMIT' | 'FRIEND_LIMIT' | 'FRIENDSHIP_UNAVAILABLE'

const fail = (error: Failure) => ({ ok: false as const, error })
const ok = () => ({ ok: true as const, data: null })
export type FriendResult = ReturnType<typeof fail> | ReturnType<typeof ok>

const fields = (body: unknown) => body && typeof body === 'object' ? body as Record<string, unknown> : {}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function withPlayers(sql: Sql, a: string, b: string, change: () => Promise<FriendResult>) {
  await sql('begin isolation level read committed')
  try {
    await sql('set local role service_role')
    // Toutes les mutations d’un joueur prennent le même verrou, même pour des paires différentes.
    // L’ordre porte sur les clés de verrou pour rester stable même en cas de collision de hachage.
    const { rows } = await sql(`select distinct hashtext(id::text) as key
      from unnest(array[$1::uuid, $2::uuid]) as players(id) order by key`, [a, b])
    for (const { key } of rows) await sql('select pg_advisory_xact_lock(1731, $1::int)', [key])
    const result = await change()
    await sql('commit')
    return result
  } catch (error) {
    await sql('rollback')
    throw error
  }
}

async function atFriendLimit(sql: Sql, a: string, b: string) {
  const { rows } = await sql(`select 1
    from unnest(array[$1::uuid, $2::uuid]) as players(id)
    where (select count(*) from gv_friendships
      where state = 'accepted' and players.id in (requester, recipient)) >= 50`, [a, b])
  return rows.length > 0
}

async function accept(sql: Sql, id: string, a: string, b: string) {
  if (await atFriendLimit(sql, a, b)) return fail('FRIEND_LIMIT')
  await sql("update gv_friendships set state = 'accepted' where id = $1", [id])
  return ok()
}

export async function requestFriend({ sql, player, body }: Context) {
  if (!player) return fail('UNAUTHORIZED')
  const { code } = fields(body)
  const trimmed = typeof code === 'string' ? code.trim() : ''
  if (!/^[A-Za-z0-9]{6}$/.test(trimmed)) return fail('INVALID_FRIEND_CODE')
  const { rows: [requester] } = await sql('select id from gv_players where id = $1', [player])
  if (!requester) return fail('NOT_REGISTERED')
  const { rows: [recipient] } = await sql('select id from gv_players where friend_code = $1', [trimmed.toUpperCase()])
  if (!recipient) return fail('UNKNOWN_FRIEND_CODE')
  const other: string = recipient.id
  if (player === other) return fail('SELF_REQUEST')

  return withPlayers(sql, player, other, async () => {
    const { rows: [existing] } = await sql(`select id, requester, state from gv_friendships
      where least(requester, recipient) = least($1::uuid, $2::uuid)
        and greatest(requester, recipient) = greatest($1::uuid, $2::uuid)`, [player, other])
    if (existing?.state === 'accepted') return fail('ALREADY_FRIENDS')
    if (existing?.requester === player) return fail('ALREADY_REQUESTED')
    if (existing) return accept(sql, existing.id, player, other)
    if (await atFriendLimit(sql, player, other)) return fail('FRIEND_LIMIT')
    const { rows: [pending] } = await sql(`select count(*)::int as total from gv_friendships
      where requester = $1 and state = 'pending'`, [player])
    if (pending!.total >= 10) return fail('PENDING_LIMIT')
    await sql('insert into gv_friendships (requester, recipient) values ($1, $2)', [player, other])
    return ok()
  })
}

export async function answerFriend({ sql, player, body }: Context) {
  if (!player) return fail('UNAUTHORIZED')
  const { id, action } = fields(body)
  if (typeof id !== 'string' || !uuid.test(id) || (action !== 'accept' && action !== 'refuse' && action !== 'remove')) {
    return fail('INVALID_REQUEST')
  }
  const find = async () => (await sql(`select requester, recipient, state from gv_friendships
    where id = $1 and $2 in (requester, recipient)`, [id, player])).rows[0]
  const pair = await find()
  if (!pair) return fail('FRIENDSHIP_UNAVAILABLE')

  return withPlayers(sql, pair.requester, pair.recipient, async () => {
    const current = await find()
    const allowed = action === 'remove' ? current?.state === 'accepted' : current?.state === 'pending' && current.recipient === player
    if (!current || !allowed) return fail('FRIENDSHIP_UNAVAILABLE')
    if (action === 'accept') return accept(sql, id, current.requester, current.recipient)
    await sql('delete from gv_friendships where id = $1', [id])
    return ok()
  })
}
