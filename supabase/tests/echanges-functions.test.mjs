import { answerFriend, requestFriend } from '../functions/_shared/friends.ts'

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const code = n => `AM${String(n).padStart(4, '0')}`

export async function run(db, { assert, as, user }) {
  for (let n = 1; n <= 64; n++) await user(uuid(n))
  await as('service_role', null, async () => {
    const sql = (text, params = []) => db.query(text, params)
    for (let n = 1; n <= 63; n++) {
      await sql("insert into gv_players (id, nickname, friend_code) values ($1, 'Pilote', $2)", [uuid(n), code(n)])
    }
    const call = (fn, player, body) => fn({ sql, player: player === null ? null : uuid(player), body })
    const request = (from, to) => call(requestFriend, from, { code: code(to) })
    const answer = (from, id, action) => call(answerFriend, from, { id, action })
    const refuse = async (result, error) => assert.deepEqual(await result, { ok: false, error })
    const succeed = async result => assert.deepEqual(await result, { ok: true, data: null })
    const pair = async (a, b) => (await sql('select id, state from gv_friendships where requester = $1 and recipient = $2', [uuid(a), uuid(b)])).rows[0]

    await refuse(request(null, 2), 'UNAUTHORIZED')
    await refuse(request(64, 2), 'NOT_REGISTERED')
    await refuse(call(requestFriend, 1, { code: 'abc' }), 'INVALID_FRIEND_CODE')
    await refuse(request(1, 64), 'UNKNOWN_FRIEND_CODE')
    await refuse(request(1, 1), 'SELF_REQUEST')
    await refuse(answer(1, 'bad', 'remove'), 'INVALID_REQUEST')
    await succeed(call(requestFriend, 1, { code: ' am0002 ' }))
    const { id } = await pair(1, 2)
    await refuse(request(1, 2), 'ALREADY_REQUESTED')
    await refuse(answer(1, id, 'accept'), 'FRIENDSHIP_UNAVAILABLE')
    await refuse(answer(1, id, 'refuse'), 'FRIENDSHIP_UNAVAILABLE')
    await refuse(answer(3, id, 'refuse'), 'FRIENDSHIP_UNAVAILABLE')
    await refuse(answer(2, id, 'remove'), 'FRIENDSHIP_UNAVAILABLE')
    await succeed(request(2, 1))
    assert.deepEqual(await pair(1, 2), { id, state: 'accepted' })
    assert.equal(await pair(2, 1), undefined)
    await refuse(request(1, 2), 'ALREADY_FRIENDS')
    await refuse(answer(2, id, 'refuse'), 'FRIENDSHIP_UNAVAILABLE')
    await refuse(answer(3, id, 'remove'), 'FRIENDSHIP_UNAVAILABLE')
    await succeed(answer(1, id, 'remove'))
    assert.equal(await pair(1, 2), undefined)
    await succeed(request(1, 2))
    await refuse(answer(2, id, 'accept'), 'FRIENDSHIP_UNAVAILABLE')
    await succeed(answer(2, (await pair(1, 2)).id, 'refuse'))

    for (let n = 2; n <= 11; n++) await succeed(request(1, n))
    await refuse(request(1, 12), 'PENDING_LIMIT')
    await succeed(request(12, 1))
    await succeed(request(1, 12)) // Une demande croisée ne crée aucune demande envoyée.
    await succeed(answer(2, (await pair(1, 2)).id, 'accept'))
    await succeed(request(1, 13))

    // Le joueur 1 a deux amis et des demandes d’un côté et de l’autre avant d’atteindre le plafond.
    await succeed(request(63, 1))
    await sql("insert into gv_friendships (requester, recipient, state) select $1, id, 'accepted' from gv_players where friend_code between $2 and $3", [uuid(1), code(14), code(61)])
    await refuse(request(1, 62), 'FRIEND_LIMIT')
    await refuse(request(62, 1), 'FRIEND_LIMIT')
    await refuse(request(1, 63), 'FRIEND_LIMIT')
    await refuse(request(3, 1), 'FRIEND_LIMIT')
    await refuse(answer(1, (await pair(63, 1)).id, 'accept'), 'FRIEND_LIMIT')
    await refuse(answer(3, (await pair(1, 3)).id, 'accept'), 'FRIEND_LIMIT')
    await succeed(answer(12, (await pair(12, 1)).id, 'remove'))
    await succeed(answer(1, (await pair(63, 1)).id, 'accept'))
  })
}
