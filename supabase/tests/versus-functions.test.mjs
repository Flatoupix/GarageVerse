// Fonctions serveur du versus V1 (supabase/functions/_shared/versus.ts), sur la base PGlite migrée et sous le rôle service_role.
// Duel complet identique à replayVersus, coups refusés, délais et absences, règlements, réclamation unique, revanche,
// limite de salles par heure, écuries et mises invalides. Lancé par node src/game/supabase.check.cjs.
import * as versus from '../functions/_shared/versus.ts'
import { autoChoice, replayVersus, VERSUS_STAKES } from '../functions/_shared/game/rules.ts'
import { vehicles } from '../functions/_shared/game/data.ts'

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const plain = id => ({ id, prep: { stage: 0, parts: [] } })
// La Twizy (endurance 3) ne court qu'un secteur avant surchauffe : jamais d'Attaque possible.
const HOST_CARS = ['clio', 'twingo', 'twizy'].map(plain)
const GUEST_CARS = ['deuch', 'r4l', 'fiat500'].map(plain)
const plainJson = value => JSON.parse(JSON.stringify(value))
const roundOf = duel => i => plainJson({ ...duel.rounds[i], points: pointsAfter(duel, i) })
const pointsAfter = (duel, i) => {
  const points = { player: 0, rival: 0 }
  for (const round of duel.rounds.slice(0, i + 1)) if (round.winner !== 'tie') points[round.winner]++
  return points
}

export async function run(db, { assert, user }) {
  const [A, B, C, D, E] = [1, 2, 3, 4, 5].map(uuid)
  for (const id of [A, B, C, D, E]) await user(id)
  // Les fonctions écrivent comme en production : avec les droits de service_role.
  await db.exec('set role service_role')
  try { await scenarios(db, assert, { A, B, C, D, E }) } finally { await db.exec('reset role') }
}

async function scenarios(db, assert, { A, B, C, D, E }) {
  let clock = Date.parse('2026-11-18T10:00:00.000Z')
  const tick = ms => { clock += ms }
  let state = 7
  const lcg = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32)
  // Hasard qui rend d'abord n zéros, ou qui épelle une graine, puis reprend le générateur.
  const zeros = n => () => n-- > 0 ? 0 : lcg()
  const spelled = text => { const values = [...text].map(c => (versus.SEED_ALPHABET.indexOf(c) + 0.5) / versus.SEED_ALPHABET.length); return () => values.length ? values.shift() : lcg() }
  const sql = (text, params = []) => db.query(text, params)
  const call = (fn, player, body, random = lcg) => fn({ sql, player, body, now: () => new Date(clock), random })
  const expectOk = async (label, promise) => { const r = await promise; assert.equal(r.ok, true, `${label} : ${JSON.stringify(r)}`); return r.data }
  const expectError = async (label, code, promise) => { const r = await promise; assert.equal(r.ok, false, `${label} : ${JSON.stringify(r)}`); assert.equal(r.error, code, label) }
  const iso = ms => new Date(ms).toISOString()
  const row = async (text, params) => (await db.query(text, params)).rows[0]
  const settled = async room => Object.fromEntries((await db.query('select player, delta, reason from gv_settlements where room = $1', [room])).rows.map(r => [r.player, [r.delta, r.reason]]))
  const claimAll = async (room, expected) => {
    for (const [player, [delta, reason]] of Object.entries(expected)) {
      assert.deepEqual(await expectOk('claimSettlement', call(versus.claimSettlement, player, { room })), { room, delta, reason })
      await expectError('réclamation en double', 'ALREADY_CLAIMED', call(versus.claimSettlement, player, { room }))
    }
  }
  const hostBody = (extra = {}) => ({ cap: 9, stake: 0, credits: 0, lineup: HOST_CARS, ...extra })

  // ——— Inscription ———
  for (const nickname of [undefined, 'A', 'B'.repeat(21), '   ', 42]) await expectError(`pseudo ${nickname}`, 'INVALID_NICKNAME', call(versus.register, A, { nickname }))
  await expectError('inscription sans joueur', 'UNAUTHORIZED', call(versus.register, null, { nickname: 'Hôte' }))
  const host = await expectOk('inscription', call(versus.register, A, { nickname: '  Hôte   du jour ' }, () => 0))
  assert.deepEqual(host, { id: A, nickname: 'Hôte du jour', friend_code: 'AAAAAA', created: true })
  assert.deepEqual(await expectOk('inscription bis', call(versus.register, A, { nickname: 'Autre' })), { ...host, created: false })
  // Code ami déjà pris : nouveau tirage.
  const guest = await expectOk('inscription invité', call(versus.register, B, { nickname: 'Invité' }, zeros(6)))
  assert.match(guest.friend_code, /^[A-Z0-9]{6}$/)
  assert.notEqual(guest.friend_code, host.friend_code)
  await expectOk('pseudo de 2', call(versus.register, D, { nickname: 'De' }))
  await expectOk('pseudo de 20', call(versus.register, E, { nickname: 'E'.repeat(20) }))
  for (const fn of [versus.createRoom, versus.joinRoom, versus.submitMove, versus.claimSettlement]) {
    await expectError(`${fn.name} non inscrit`, 'NOT_REGISTERED', call(fn, C, {}))
  }

  // ——— Corps, écuries et mises invalides ———
  for (const body of [null, 'texte', [1]]) {
    for (const fn of [versus.createRoom, versus.joinRoom, versus.submitMove, versus.claimSettlement]) {
      await expectError(`${fn.name} corps ${JSON.stringify(body)}`, 'INVALID_REQUEST', call(fn, A, body))
    }
  }
  await expectError('resolveDue sans salle', 'INVALID_REQUEST', call(versus.resolveDue, A, {}))
  const expensive = vehicles.filter(v => v.cost === 7).slice(0, 3).map(v => plain(v.id))
  const badLineups = [
    HOST_CARS.slice(0, 2), 'clio', [plain('clio'), plain('clio'), plain('twingo')], [null, plain('clio'), plain('twingo')],
    [{ id: 'clio', prep: { stage: 3, parts: [], upgrades: { acc: 2, vit: 2, man: 2, end: 2 }, extraSlot: 'constructor' } }, plain('twingo'), plain('twizy')],
    [plain('clio'), plain('twingo'), plain('nexiste-pas')], [{ id: 'clio', prep: { stage: 4, parts: [] } }, plain('twingo'), plain('twizy')],
    [{ id: 'clio', prep: { stage: 0, parts: ['pneus-route'] } }, plain('twingo'), plain('twizy')], [{ id: 'clio' }, plain('twingo'), plain('twizy')],
  ]
  for (const lineup of badLineups) await expectError(`écurie ${JSON.stringify(lineup)}`, 'INVALID_LINEUP', call(versus.createRoom, A, hostBody({ lineup })))
  await expectError('plafond inconnu', 'INVALID_LINEUP', call(versus.createRoom, A, hostBody({ cap: 10 })))
  await expectError('plafond dépassé', 'INVALID_LINEUP', call(versus.createRoom, A, hostBody({ cap: 15, lineup: expensive })))
  await expectError('mise hors palier', 'INVALID_STAKE', call(versus.createRoom, A, hostBody({ stake: 75, credits: 10000 })))
  await expectError('mise trop haute', 'STAKE_TOO_HIGH', call(versus.createRoom, A, hostBody({ stake: 100, credits: 200 })))
  await expectError('mise sans crédits déclarés', 'STAKE_TOO_HIGH', call(versus.createRoom, A, hostBody({ stake: 50, credits: undefined })))
  await expectError('crédits invalides', 'INVALID_REQUEST', call(versus.createRoom, A, hostBody({ stake: 50, credits: 'beaucoup' })))
  assert.equal((await row('select count(*)::int as n from gv_rooms')).n, 0, 'aucune salle créée par un appel refusé')

  // ——— Règlements (montants purs) ———
  assert.deepEqual(versus.payouts(100, { kind: 'race', winner: 'player' }), { player: { delta: 180, reason: 'win' }, rival: { delta: 0, reason: 'loss' } })
  assert.deepEqual(versus.payouts(50, { kind: 'race', winner: null }), { player: { delta: 50, reason: 'tie' }, rival: { delta: 50, reason: 'tie' } })
  assert.deepEqual(versus.payouts(250, { kind: 'forfeit', winner: 'rival' }), { player: { delta: 0, reason: 'forfeit' }, rival: { delta: 500, reason: 'win' } })
  for (const stake of VERSUS_STAKES) assert.equal(versus.payouts(stake, { kind: 'race', winner: 'rival' }).rival.delta, Math.floor(2 * stake * 0.9))
  for (const kind of ['race', 'forfeit']) for (const winner of ['player', 'rival', null]) {
    const out = versus.payouts(0, { kind, winner })
    assert.deepEqual([out.player.delta, out.rival.delta], [0, 0], `mise 0 · ${kind} ${winner}`)
  }

  // ——— Création, code d'invitation, expiration ———
  const first = (await expectOk('createRoom', call(versus.createRoom, A, hostBody(), () => 0))).room
  assert.equal(first.state, 'open')
  assert.equal(first.code, 'AAAAAAAA')
  assert.equal(first.seed, null, 'graine cachée tant que la salle attend')
  assert.equal(first.expires_at, iso(clock + 10 * 60_000))
  assert.equal((await row('select seed from gv_rooms where id = $1', [first.id])).seed, 'a'.repeat(20), 'graine tirée par le hasard injecté')
  assert.deepEqual((await row('select cars from gv_lineups where room = $1 and player = $2', [first.id, A])).cars, HOST_CARS)
  // Code d'invitation déjà pris : nouveau tirage, toujours sans caractère ambigu.
  const second = (await expectOk('createRoom, collision de code', call(versus.createRoom, A, hostBody({ stake: 50, credits: 400 }), zeros(28)))).room
  assert.notEqual(second.code, first.code)
  assert.match(second.code, /^[A-HJKMNP-Z2-9]{8}$/)
  await expectError('code inconnu', 'ROOM_NOT_FOUND', call(versus.joinRoom, B, { code: 'ZZZZZZZZ', lineup: GUEST_CARS }))
  await expectError('sa propre salle', 'OWN_ROOM', call(versus.joinRoom, A, { code: first.code, lineup: GUEST_CARS }))
  await expectError('écurie de l’invité', 'INVALID_LINEUP', call(versus.joinRoom, B, { code: first.code, lineup: GUEST_CARS.slice(1) }))
  await expectError('salle ouverte, pas encore expirée', 'NOT_DUE', call(versus.resolveDue, A, { room: second.id }))
  await expectError('resolveDue d’un tiers', 'NOT_YOUR_ROOM', call(versus.resolveDue, D, { room: second.id }))
  await expectError('réclamation avant la fin', 'NOT_FINISHED', call(versus.claimSettlement, A, { room: second.id }))
  await expectError('réclamation d’un tiers', 'NOT_YOUR_ROOM', call(versus.claimSettlement, B, { room: second.id }))
  tick(10 * 60_000)
  await expectError('salle expirée', 'ROOM_EXPIRED', call(versus.joinRoom, B, { code: first.code, lineup: GUEST_CARS }))
  assert.equal((await row('select state from gv_rooms where id = $1', [first.id])).state, 'expired')
  // Tâche planifiée (sans joueur ni salle) : rattrape les salles oubliées.
  const swept = await expectOk('tâche planifiée', call(versus.resolveDue, null, {}))
  assert.deepEqual(swept.rooms, [second.id])
  assert.equal((await row('select state from gv_rooms where id = $1', [second.id])).state, 'expired')
  assert.deepEqual(await settled(first.id), { [A]: [0, 'refund'] })
  assert.deepEqual(await settled(second.id), { [A]: [50, 'refund'] }, 'expirée sans invité : l’hôte récupère sa mise')
  await claimAll(second.id, { [A]: [50, 'refund'] })
  assert.deepEqual((await expectOk('tâche planifiée, rien à faire', call(versus.resolveDue, null, {}))).rooms, [])

  // ——— Duel complet entre deux joueurs ———
  tick(60 * 60_000)
  const duelRoom = (await expectOk('createRoom mise 100', call(versus.createRoom, A, hostBody({ stake: 100, credits: 1000 })))).room
  await expectError('mise trop haute pour l’invité', 'STAKE_TOO_HIGH', call(versus.joinRoom, B, { code: duelRoom.code, lineup: GUEST_CARS, credits: 300 }))
  const started = (await expectOk('joinRoom', call(versus.joinRoom, B, { code: duelRoom.code.toLowerCase(), lineup: GUEST_CARS, credits: 400 }))).room
  assert.deepEqual([started.state, started.guest, started.sector, started.sector_deadline], ['racing', B, 0, iso(clock + 20_000)])
  assert.equal(typeof started.seed, 'string')
  await expectError('salle pleine', 'ROOM_FULL', call(versus.joinRoom, D, { code: duelRoom.code, lineup: GUEST_CARS }))
  await expectError('coup d’un tiers', 'NOT_YOUR_ROOM', call(versus.submitMove, D, { room: duelRoom.id, sector: 0, car: 0 }))
  await expectError('réclamation en course', 'NOT_FINISHED', call(versus.claimSettlement, A, { room: duelRoom.id }))
  await expectError('resolveDue avant le délai', 'NOT_DUE', call(versus.resolveDue, B, { room: duelRoom.id }))
  for (const bad of [{ car: 3 }, { car: -1 }, { car: 1.5 }, { car: 0, stance: 'prudence' }, { car: 0, nitro: 'oui' }]) {
    await expectError(`coup ${JSON.stringify(bad)}`, 'INVALID_MOVE', call(versus.submitMove, A, { room: duelRoom.id, sector: 0, ...bad }))
  }
  await expectError('Attaque impossible', 'INVALID_MOVE', call(versus.submitMove, A, { room: duelRoom.id, sector: 0, car: 2, stance: 'attaque' }))

  const seed = started.seed
  const legal = (duel, camp, want) => ({ car: want.car, nitro: want.nitro && duel[camp].nitro > 0, stance: want.stance })
  const HOST_PLAN = [
    { car: 0, stance: 'attaque', nitro: true }, { car: 1, stance: 'normal', nitro: false }, { car: 2, stance: 'gestion', nitro: true },
    { car: 0, stance: 'normal', nitro: false }, { car: 1, stance: 'gestion', nitro: false },
  ]
  const GUEST_PLAN = [
    { car: 2, stance: 'normal', nitro: true }, { car: 0, stance: 'attaque', nitro: false }, { car: 1, stance: 'normal', nitro: true },
    { car: 2, stance: 'gestion', nitro: false }, { car: 0, stance: 'normal', nitro: false },
  ]
  const moves = []
  for (let sector = 0; sector < 5; sector++) {
    const before = replayVersus({ seed, a: HOST_CARS, b: GUEST_CARS, moves })
    const a = legal(before, 'player', HOST_PLAN[sector]), b = legal(before, 'rival', GUEST_PLAN[sector])
    if (before.player.nitro === 0) await expectError('nitro épuisée', 'INVALID_MOVE', call(versus.submitMove, A, { room: duelRoom.id, sector, car: a.car, nitro: true }))
    const [[early, earlyMove], [late, lateMove]] = sector % 2 ? [[B, b], [A, a]] : [[A, a], [B, b]]
    const waiting = await expectOk(`secteur ${sector}, 1er coup`, call(versus.submitMove, early, { room: duelRoom.id, sector, ...earlyMove }))
    assert.deepEqual([waiting.resolved, waiting.round, waiting.room.sector], [false, null, sector])
    await expectError('coup en double', 'ALREADY_PLAYED', call(versus.submitMove, early, { room: duelRoom.id, sector, ...earlyMove }))
    await expectError('mauvais secteur', 'WRONG_SECTOR', call(versus.submitMove, late, { room: duelRoom.id, sector: sector + 1, ...lateMove }))
    assert.equal((await row('select count(*)::int as n from gv_rounds where room = $1', [duelRoom.id])).n, sector, 'pas de résultat avant les deux coups')
    tick(3000)
    const resolved = await expectOk(`secteur ${sector}, 2e coup`, call(versus.submitMove, late, { room: duelRoom.id, sector, ...lateMove }))
    moves.push({ a, b })
    const expected = replayVersus({ seed, a: HOST_CARS, b: GUEST_CARS, moves })
    assert.equal(resolved.resolved, true)
    assert.deepEqual(plainJson(resolved.round), roundOf(expected)(sector), `secteur ${sector} identique à replayVersus`)
    if (sector < 4) assert.deepEqual([resolved.room.state, resolved.room.sector, resolved.room.sector_deadline], ['racing', sector + 1, iso(clock + 20_000)])
    tick(4000)
  }
  const final = replayVersus({ seed, a: HOST_CARS, b: GUEST_CARS, moves })
  const stored = (await db.query('select sector, result from gv_rounds where room = $1 order by sector', [duelRoom.id])).rows
  assert.deepEqual(stored.map(r => r.result), final.rounds.map((_, i) => roundOf(final)(i)), 'gv_rounds identique à replayVersus')
  const ended = await row('select state, winner, sector_deadline from gv_rooms where id = $1', [duelRoom.id])
  const winnerId = final.winner === 'player' ? A : final.winner === 'rival' ? B : null
  assert.deepEqual([ended.state, ended.winner, ended.sector_deadline], ['done', winnerId, null])
  assert.equal((await row('select count(*)::int as n from gv_moves where room = $1 and auto', [duelRoom.id])).n, 0)
  await expectError('coup après l’arrivée', 'NOT_RACING', call(versus.submitMove, A, { room: duelRoom.id, sector: 4, car: 0 }))
  const duelPay = winnerId
    ? { [winnerId]: [180, 'win'], [winnerId === A ? B : A]: [0, 'loss'] }
    : { [A]: [100, 'tie'], [B]: [100, 'tie'] }
  assert.deepEqual(await settled(duelRoom.id), duelPay, 'victoire : 2 × mise moins 10 % ; défaite : 0')
  await expectError('réclamation d’un tiers', 'NOT_YOUR_ROOM', call(versus.claimSettlement, D, { room: duelRoom.id }))
  await claimAll(duelRoom.id, duelPay)

  // ——— Revanche : mêmes plafond et mise, quel que soit le corps ———
  await expectError('revanche d’un tiers', 'NOT_YOUR_ROOM', call(versus.createRoom, D, hostBody({ rematch_of: duelRoom.id })))
  await expectError('revanche d’une salle inconnue', 'ROOM_NOT_FOUND', call(versus.createRoom, B, hostBody({ rematch_of: uuid(999) })))
  await expectError('revanche mal formée', 'INVALID_REQUEST', call(versus.createRoom, B, hostBody({ rematch_of: 'abc' })))
  const rematch = (await expectOk('revanche', call(versus.createRoom, B, { cap: 22, stake: 500, credits: 400, lineup: GUEST_CARS, rematch_of: duelRoom.id }))).room
  assert.deepEqual([rematch.cap, rematch.stake, rematch.rematch_of, rematch.host, rematch.state], [9, 100, duelRoom.id, B, 'open'])
  await expectError('revanche d’une salle non terminée', 'NOT_FINISHED', call(versus.createRoom, B, hostBody({ rematch_of: rematch.id })))
  await expectError('revanche, mise trop haute', 'STAKE_TOO_HIGH', call(versus.createRoom, A, hostBody({ credits: 100, rematch_of: duelRoom.id })))

  // ——— Délais : l'IA joue pour l'absent, deux absences valent abandon ———
  tick(60 * 60_000)
  const late = (await expectOk('createRoom mise 250', call(versus.createRoom, A, hostBody({ stake: 250, credits: 1000 })))).room
  const lateSeed = (await expectOk('joinRoom', call(versus.joinRoom, B, { code: late.code, lineup: GUEST_CARS, credits: 1000 }))).room.seed
  const hostMove = { car: 1, stance: 'normal', nitro: false }
  await expectOk('coup de l’hôte', call(versus.submitMove, A, { room: late.id, sector: 0, ...hostMove }))
  tick(19_999)
  await expectError('1 ms avant le délai', 'NOT_DUE', call(versus.resolveDue, A, { room: late.id }))
  tick(1)
  await expectError('coup reçu après le délai', 'DEADLINE_PASSED', call(versus.submitMove, B, { room: late.id, sector: 0, car: 0 }))
  const lateStart = replayVersus({ seed: lateSeed, a: HOST_CARS, b: GUEST_CARS, moves: [] })
  const firstAuto = await expectOk('délai dépassé', call(versus.resolveDue, A, { room: late.id }))
  assert.deepEqual([firstAuto.resolved, firstAuto.room.sector, firstAuto.room.missed], [true, 1, { [A]: 0, [B]: 1 }])
  const autoMove = await row('select car, stance, nitro, auto from gv_moves where room = $1 and sector = 0 and player = $2', [late.id, B])
  assert.deepEqual(autoMove, { ...autoChoice(lateStart, lateSeed, 'rival'), auto: true }, 'coup de l’IA enregistré avec auto = true')
  await expectError('délai déjà traité', 'NOT_DUE', call(versus.resolveDue, B, { room: late.id }))
  await expectError('coup du secteur passé', 'WRONG_SECTOR', call(versus.submitMove, B, { room: late.id, sector: 0, car: 0 }))
  tick(20_000)
  const forfeit = await expectOk('seconde absence', call(versus.resolveDue, null, { room: late.id }))
  assert.deepEqual([forfeit.room.state, forfeit.room.winner, forfeit.room.missed], ['done', A, { [A]: 1, [B]: 2 }])
  const lateRace = replayVersus({ seed: lateSeed, a: HOST_CARS, b: GUEST_CARS, moves: [{ a: hostMove, b: null }, { a: null, b: null }] })
  const lateRounds = (await db.query('select result from gv_rounds where room = $1 order by sector', [late.id])).rows.map(r => r.result)
  assert.deepEqual(lateRounds, [0, 1].map(roundOf(lateRace)), 'secteurs joués par l’IA identiques à replayVersus')
  assert.equal((await row('select count(*)::int as n from gv_moves where room = $1 and auto', [late.id])).n, 3)
  assert.deepEqual(await settled(late.id), { [A]: [500, 'win'], [B]: [0, 'forfeit'] }, 'abandon : 2 × mise sans commission')
  await claimAll(late.id, { [A]: [500, 'win'], [B]: [0, 'forfeit'] })

  // Joue toute une salle avec les coups que l'IA aurait choisis (submitMove des deux côtés), à partir de la graine connue.
  const playOut = async (room, roomSeed, a, b) => {
    const race = replayVersus({ seed: roomSeed, a, b, moves: Array.from({ length: 5 }, () => ({ a: null, b: null })) })
    for (let sector = 0; sector < 5; sector++) {
      const { player, rival } = race.rounds[sector]
      await expectOk('coup hôte', call(versus.submitMove, A, { room, sector, car: player.car, nitro: player.nitro, stance: player.stance }))
      await expectOk('coup invité', call(versus.submitMove, B, { room, sector, car: rival.car, nitro: rival.nitro, stance: rival.stance }))
    }
    return race
  }

  // ——— Égalité parfaite : chacun récupère sa mise ———
  // Graine choisie pour que la course finisse à égalité (mêmes points et même total), épelée par le hasard injecté.
  let tieSeed
  for (let n = 0; n < 200_000 && !tieSeed; n++) {
    const candidate = n.toString(36).padStart(20, '0')
    if (replayVersus({ seed: candidate, a: GUEST_CARS, b: GUEST_CARS, moves: Array.from({ length: 5 }, () => ({ a: null, b: null })) }).winner === 'tie') tieSeed = candidate
  }
  assert.ok(tieSeed, 'une graine donne une égalité')
  tick(60 * 60_000)
  const tie = (await expectOk('createRoom égalité', call(versus.createRoom, A, hostBody({ stake: 50, credits: 200, lineup: GUEST_CARS }), spelled(tieSeed)))).room
  await expectOk('joinRoom égalité', call(versus.joinRoom, B, { code: tie.code, lineup: GUEST_CARS, credits: 200 }))
  assert.equal((await row('select seed from gv_rooms where id = $1', [tie.id])).seed, tieSeed)
  await playOut(tie.id, tieSeed, GUEST_CARS, GUEST_CARS)
  assert.deepEqual(await row('select state, winner from gv_rooms where id = $1', [tie.id]), { state: 'done', winner: null })
  assert.deepEqual(await settled(tie.id), { [A]: [50, 'tie'], [B]: [50, 'tie'] })
  await claimAll(tie.id, { [A]: [50, 'tie'], [B]: [50, 'tie'] })

  // ——— Mise 0 : rien à verser ———
  const free = (await expectOk('createRoom mise 0', call(versus.createRoom, A, hostBody()))).room
  const freeSeed = (await expectOk('joinRoom mise 0', call(versus.joinRoom, B, { code: free.code, lineup: GUEST_CARS }))).room.seed
  const freeRace = await playOut(free.id, freeSeed, HOST_CARS, GUEST_CARS)
  const freeRow = await row('select state, winner from gv_rooms where id = $1', [free.id])
  assert.deepEqual(freeRow, { state: 'done', winner: freeRace.winner === 'player' ? A : freeRace.winner === 'rival' ? B : null })
  for (const [delta] of Object.values(await settled(free.id))) assert.equal(delta, 0)

  // ——— Limite : 10 salles créées par heure glissante ———
  tick(60 * 60_000)
  const start = clock
  for (let i = 0; i < 10; i++) { await expectOk(`salle ${i + 1}/10`, call(versus.createRoom, E, hostBody())); tick(60_000) }
  await expectError('11e salle dans l’heure', 'RATE_LIMITED', call(versus.createRoom, E, hostBody()))
  clock = start + 60 * 60_000 + 1
  await expectOk('la 1re salle sort de la fenêtre', call(versus.createRoom, E, hostBody()))
  await expectError('fenêtre de nouveau pleine', 'RATE_LIMITED', call(versus.createRoom, E, hostBody()))
}
