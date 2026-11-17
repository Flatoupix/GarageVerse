// Logique serveur du versus V1 (docs/supabase.md § 7, docs/versus.md § 3 à § 5). Module pur : il ne connaît ni Deno ni le
// réseau. Chaque fonction reçoit un accès SQL, l'identifiant du joueur (null pour la tâche planifiée), le corps de la requête,
// une horloge et un hasard, et renvoie { ok: true, data } ou { ok: false, error } avec un code stable. Les erreurs métier ne
// lèvent jamais d'exception ; seule une panne de la base remonte. Les points d'entrée supabase/functions/<nom>/index.ts
// l'appellent en production, supabase/tests/versus-functions.test.mjs dans une base PGlite.
import {
  autoChoice, canAttack, checkVersusLineup, extraSlotFamily, replayVersus, stakeCheck, stances, VERSUS_STAKES,
  type Choice, type Duel, type Round, type Stance, type VersusEntry,
} from './game/rules.ts'

export type Row = Record<string, any>
export type Sql = (text: string, params?: unknown[]) => Promise<{ rows: Row[] }>
export interface Context { sql: Sql; player: string | null; body: unknown; now: () => Date; random: () => number }

export type ErrorCode =
  | 'UNAUTHORIZED' | 'INVALID_REQUEST' | 'INVALID_NICKNAME' | 'NOT_REGISTERED' | 'INVALID_LINEUP' | 'INVALID_STAKE'
  | 'STAKE_TOO_HIGH' | 'RATE_LIMITED' | 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'ROOM_EXPIRED' | 'OWN_ROOM' | 'NOT_YOUR_ROOM'
  | 'NOT_RACING' | 'WRONG_SECTOR' | 'ALREADY_PLAYED' | 'INVALID_MOVE' | 'DEADLINE_PASSED' | 'NOT_DUE' | 'NOT_FINISHED' | 'ALREADY_CLAIMED'
export type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: ErrorCode; message?: string }

export const ROOM_TTL_MS = 10 * 60_000
export const SECTOR_MS = 20_000
export const RATE_LIMIT = { rooms: 10, windowMs: 60 * 60_000 }
export const MAX_MISSED = 2
export const COMMISSION_PERCENT = 10
// Codes d'invitation sans caractères ambigus (ni 0, O, 1, I ni L) ; codes amis en majuscules et chiffres.
export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const FRIEND_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
export const SEED_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const DRAWS = 20

type Camp = 'player' | 'rival'
const CAMPS: Camp[] = ['player', 'rival']
// Course d'une salle : camp player = hôte, camp rival = invité, coups enregistrés secteur par secteur.
interface Race { seed: string; a: VersusEntry[]; b: VersusEntry[]; moves: Partial<Record<Camp, Choice>>[] }
export type RoundResult = Round & { points: Record<Camp, number> }

const ok = <T>(data: T): Result<T> => ({ ok: true, data })
const fail = (error: ErrorCode, message?: string): Result<never> => message ? { ok: false, error, message } : { ok: false, error }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)
const fields = (body: unknown): Row | undefined => body && typeof body === 'object' && !Array.isArray(body) ? body as Row : undefined
const json = (value: unknown) => typeof value === 'string' ? JSON.parse(value) : value
const time = (value: unknown) => new Date(value as string).getTime()
const iso = (value: unknown) => value == null ? null : new Date(value as string).toISOString()
const at = (ctx: Context, delay = 0) => new Date(ctx.now().getTime() + delay).toISOString()
const draw = (alphabet: string, length: number, random: () => number) =>
  Array.from({ length }, () => alphabet[Math.floor(random() * alphabet.length) % alphabet.length]).join('')

const inRoom = (room: Row, player: string | null) => player !== null && (room.host === player || room.guest === player)
const campOf = (room: Row, player: string): Camp => room.host === player ? 'player' : 'rival'
const playerOf = (room: Row, camp: Camp): string => camp === 'player' ? room.host : room.guest

// Toute la fonction dans une transaction : un résultat (même une erreur métier, décidée avant toute écriture, ou une salle
// expirée qu'on vient de clore) valide, une exception annule.
async function transaction<T>(sql: Sql, fn: () => Promise<Result<T>>): Promise<Result<T>> {
  await sql('begin')
  try {
    const result = await fn()
    await sql('commit')
    return result
  } catch (error) {
    await sql('rollback').catch(() => undefined)
    throw error
  }
}

async function playerRow(ctx: Context, lock = false): Promise<Row | undefined> {
  if (!isUuid(ctx.player)) return
  const { rows } = await ctx.sql(`select id, nickname, friend_code, created_at from gv_players where id = $1${lock ? ' for update' : ''}`, [ctx.player])
  return rows[0]
}
const unknownPlayer = (ctx: Context) => fail(isUuid(ctx.player) ? 'NOT_REGISTERED' : 'UNAUTHORIZED')

async function lockRoom(ctx: Context, id: string): Promise<Row | undefined> {
  return (await ctx.sql('select * from gv_rooms where id = $1 for update', [id])).rows[0]
}

const playerView = (row: Row, created: boolean) => ({ id: row.id, nickname: row.nickname, friend_code: row.friend_code, created })

// La graine reste cachée tant que la salle attend son invité : elle fixe toute la chance de la course.
function roomView(room: Row) {
  return {
    id: room.id, code: room.code, host: room.host, guest: room.guest ?? null, cap: room.cap, stake: room.stake, state: room.state,
    seed: room.state === 'open' ? null : room.seed, sector: room.sector, sector_deadline: iso(room.sector_deadline),
    missed: json(room.missed) ?? {}, winner: room.winner ?? null, rematch_of: room.rematch_of ?? null, expires_at: iso(room.expires_at),
  }
}

// Réponse de submitMove et resolveDue : la salle, et le secteur s'il vient d'être résolu.
const sectorView = (room: Row, round: RoundResult | null) => ok({ room: roomView(room), resolved: round !== null, round })

// ——— Entrées ———

// Pseudo : texte libre borné (2 à 20 caractères), espaces resserrés, pas de caractère de contrôle.
function nicknameOf(value: unknown): string | undefined {
  if (typeof value !== 'string') return
  const nickname = value.replace(/\s+/g, ' ').trim()
  const length = [...nickname].length
  if (length < 2 || length > 20 || /[\u0000-\u001f\u007f]/.test(nickname)) return
  return nickname
}

// Écurie envoyée par le jeu : seuls les champs connus sont gardés, puis revérifiés par les règles du jeu.
function lineupOf(value: unknown, cap: unknown): VersusEntry[] | string {
  if (!Array.isArray(value) || value.length !== 3) return 'Choisis trois voitures'
  const entries: VersusEntry[] = []
  for (const item of value) {
    const entry = fields(item), prep = fields(entry?.prep)
    if (!entry || typeof entry.id !== 'string' || !prep) return 'Écurie mal formée'
    const clean: VersusEntry['prep'] = { stage: prep.stage, parts: prep.parts }
    if (prep.upgrades !== undefined) clean.upgrades = prep.upgrades
    if (prep.extraSlot !== undefined) {
      if (typeof prep.extraSlot !== 'string' || !Object.hasOwn(extraSlotFamily, prep.extraSlot)) return 'Atelier supplémentaire invalide'
      clean.extraSlot = prep.extraSlot as NonNullable<VersusEntry['prep']['extraSlot']>
    }
    entries.push({ id: entry.id, prep: clean })
  }
  let problem: string | undefined
  try { problem = checkVersusLineup(entries, cap as number) } catch { problem = 'Écurie mal formée' }
  return problem ?? entries
}

// Mise : un palier connu, au plus 25 % des crédits déclarés par le jeu (absents : 0).
function stakeProblem(stake: unknown, credits: unknown): Result<never> | undefined {
  if (typeof stake !== 'number' || !(VERSUS_STAKES as readonly number[]).includes(stake)) return fail('INVALID_STAKE', `Mise inconnue : choisis ${VERSUS_STAKES.join(', ')} crédits`)
  const declared = credits ?? 0
  if (typeof declared !== 'number' || !Number.isFinite(declared) || declared < 0) return fail('INVALID_REQUEST', 'Crédits déclarés invalides')
  const problem = stakeCheck(stake, declared)
  if (problem) return fail('STAKE_TOO_HIGH', problem)
}

function choiceOf(body: Row): Choice | undefined {
  const { car, nitro = false, stance = 'normal' } = body
  if (!Number.isInteger(car) || car < 0 || car > 2) return
  if (typeof nitro !== 'boolean' || typeof stance !== 'string' || !Object.hasOwn(stances, stance)) return
  return { car, nitro, stance: stance as Stance }
}

// ——— Course ———

async function loadRace(ctx: Context, room: Row): Promise<Race> {
  const { rows: lineups } = await ctx.sql('select player, cars from gv_lineups where room = $1', [room.id])
  const cars = (player: string) => json(lineups.find(l => l.player === player)?.cars) as VersusEntry[]
  const { rows } = await ctx.sql('select sector, player, car, stance, nitro from gv_moves where room = $1 and sector <= $2', [room.id, room.sector])
  const moves: Race['moves'] = Array.from({ length: room.sector + 1 }, () => ({}))
  for (const move of rows) moves[move.sector][campOf(room, move.player)] = { car: move.car, nitro: move.nitro, stance: move.stance }
  return { seed: room.seed, a: cars(room.host), b: cars(room.guest), moves }
}

// Rejoue les `sectors` premiers secteurs avec le moteur du jeu : la course du serveur est par construction celle de replayVersus.
function replay(race: Race, sectors: number): Duel {
  const moves = race.moves.slice(0, sectors).map(m => ({ a: m.player ?? null, b: m.rival ?? null }))
  return replayVersus({ seed: race.seed, a: race.a, b: race.b, moves })
}

async function insertMove(ctx: Context, room: Row, player: string, choice: Choice, auto: boolean) {
  await ctx.sql('insert into gv_moves (room, sector, player, car, stance, nitro, auto, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8)',
    [room.id, room.sector, player, choice.car, choice.stance ?? 'normal', choice.nitro, auto, at(ctx)])
}

// Montants à appliquer à la sauvegarde, où la mise a déjà été retirée (docs/versus.md § 5).
export function payouts(stake: number, outcome: { kind: 'race' | 'forfeit'; winner: Camp | null }): Record<Camp, { delta: number; reason: string }> {
  const other = (camp: Camp): Camp => camp === 'player' ? 'rival' : 'player'
  const { kind, winner } = outcome
  if (!winner) {
    const reason = kind === 'race' ? 'tie' : 'refund'
    return { player: { delta: stake, reason }, rival: { delta: stake, reason } }
  }
  const pot = 2 * stake
  const prize = kind === 'race' ? Math.floor(pot * (100 - COMMISSION_PERCENT) / 100) : pot
  return { [winner]: { delta: prize, reason: 'win' }, [other(winner)]: { delta: 0, reason: kind === 'race' ? 'loss' : 'forfeit' } } as Record<Camp, { delta: number; reason: string }>
}

async function finish(ctx: Context, room: Row, missed: Record<string, number>, kind: 'race' | 'forfeit', winner: Camp | null) {
  const { rows: [done] } = await ctx.sql(`update gv_rooms set state = 'done', winner = $2, sector_deadline = null, missed = $3::text::jsonb where id = $1 returning *`,
    [room.id, winner ? playerOf(room, winner) : null, JSON.stringify(missed)])
  const amounts = payouts(room.stake, { kind, winner })
  for (const camp of CAMPS) {
    await ctx.sql('insert into gv_settlements (room, player, delta, reason) values ($1, $2, $3, $4) on conflict do nothing',
      [room.id, playerOf(room, camp), amounts[camp].delta, amounts[camp].reason])
  }
  return done
}

// Salle ouverte sans invité au-delà de son expiration : close, l'hôte récupère sa mise.
async function expire(ctx: Context, room: Row) {
  const { rows: [expired] } = await ctx.sql(`update gv_rooms set state = 'expired', sector_deadline = null where id = $1 returning *`, [room.id])
  await ctx.sql(`insert into gv_settlements (room, player, delta, reason) values ($1, $2, $3, 'refund') on conflict do nothing`, [room.id, room.host, room.stake])
  return expired
}

// Les deux coups du secteur en cours sont enregistrés : résultat publié dans gv_rounds, puis secteur suivant, abandon ou arrivée.
async function resolveSector(ctx: Context, room: Row, race: Race, missed: Record<string, number>) {
  const duel = replay(race, room.sector + 1)
  const round: RoundResult = { ...duel.rounds[room.sector], points: { player: duel.player.points, rival: duel.rival.points } }
  await ctx.sql('insert into gv_rounds (room, sector, result) values ($1, $2, $3::text::jsonb)', [room.id, room.sector, JSON.stringify(round)])
  const quitters = CAMPS.filter(camp => (missed[playerOf(room, camp)] ?? 0) >= MAX_MISSED)
  let next: Row
  if (quitters.length) next = await finish(ctx, room, missed, 'forfeit', quitters.length === 1 ? (quitters[0] === 'player' ? 'rival' : 'player') : null)
  else if (duel.rounds.length < duel.sectors.length) {
    next = (await ctx.sql('update gv_rooms set sector = $2, sector_deadline = $3, missed = $4::text::jsonb where id = $1 returning *',
      [room.id, room.sector + 1, at(ctx, SECTOR_MS), JSON.stringify(missed)])).rows[0]
  } else next = await finish(ctx, room, missed, 'race', duel.winner === 'tie' || !duel.winner ? null : duel.winner)
  return { room: next, round }
}

// ——— Fonctions ———

// Inscription : crée le joueur (pseudo, code ami unique) ou renvoie celui qui existe déjà.
export async function register(ctx: Context) {
  return transaction(ctx.sql, async () => {
    if (!isUuid(ctx.player)) return fail('UNAUTHORIZED')
    const existing = await playerRow(ctx)
    if (existing) return ok(playerView(existing, false))
    const nickname = nicknameOf(fields(ctx.body)?.nickname)
    if (!nickname) return fail('INVALID_NICKNAME', 'Pseudo de 2 à 20 caractères')
    for (let attempt = 0; attempt < DRAWS; attempt++) {
      const { rows: [created] } = await ctx.sql(`insert into gv_players (id, nickname, friend_code, created_at) values ($1, $2, $3, $4)
        on conflict do nothing returning id, nickname, friend_code`, [ctx.player, nickname, draw(FRIEND_ALPHABET, 6, ctx.random), at(ctx)])
      if (created) return ok(playerView(created, true))
      // Conflit : soit le code ami est pris (nouveau tirage), soit le même joueur vient de s'inscrire en parallèle.
      const again = await playerRow(ctx)
      if (again) return ok(playerView(again, false))
    }
    throw new Error(`Aucun code ami libre après ${DRAWS} tirages`)
  })
}

// Nouvelle salle 'open' (plafond, mise, écurie, crédits déclarés) ; avec rematch_of, plafond et mise de la salle d'origine.
export async function createRoom(ctx: Context) {
  return transaction(ctx.sql, async () => {
    // Verrou sur le joueur : deux créations simultanées ne contournent pas la limite par heure.
    if (!await playerRow(ctx, true)) return unknownPlayer(ctx)
    const body = fields(ctx.body)
    if (!body) return fail('INVALID_REQUEST')
    let { cap, stake } = body
    let rematch: string | null = null
    if (body.rematch_of != null) {
      if (!isUuid(body.rematch_of)) return fail('INVALID_REQUEST')
      const { rows: [origin] } = await ctx.sql('select host, guest, cap, stake, state from gv_rooms where id = $1', [body.rematch_of])
      if (!origin) return fail('ROOM_NOT_FOUND')
      if (!inRoom(origin, ctx.player)) return fail('NOT_YOUR_ROOM')
      if (origin.state !== 'done') return fail('NOT_FINISHED')
      cap = origin.cap
      stake = origin.stake
      rematch = body.rematch_of
    }
    const lineup = lineupOf(body.lineup, cap)
    if (typeof lineup === 'string') return fail('INVALID_LINEUP', lineup)
    const refused = stakeProblem(stake, body.credits)
    if (refused) return refused
    const now = ctx.now().getTime()
    const { rows: [recent] } = await ctx.sql('select count(*)::int as count from gv_rooms where host = $1 and created_at > $2',
      [ctx.player, new Date(now - RATE_LIMIT.windowMs).toISOString()])
    if (recent.count >= RATE_LIMIT.rooms) return fail('RATE_LIMITED', `Au plus ${RATE_LIMIT.rooms} salles par heure`)
    const seed = draw(SEED_ALPHABET, 20, ctx.random)
    for (let attempt = 0; attempt < DRAWS; attempt++) {
      const { rows: [room] } = await ctx.sql(`insert into gv_rooms (code, host, cap, stake, seed, rematch_of, expires_at, created_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (code) do nothing returning *`,
        [draw(INVITE_ALPHABET, 8, ctx.random), ctx.player, cap, stake, seed, rematch, at(ctx, ROOM_TTL_MS), at(ctx)])
      if (!room) continue
      await ctx.sql('insert into gv_lineups (room, player, cars) values ($1, $2, $3::text::jsonb)', [room.id, ctx.player, JSON.stringify(lineup)])
      return ok({ room: roomView(room) })
    }
    throw new Error(`Aucun code d'invitation libre après ${DRAWS} tirages`)
  })
}

// L'invité rejoint par le code : écurie et mise vérifiées, la course démarre, 20 s pour le premier secteur.
export async function joinRoom(ctx: Context) {
  return transaction(ctx.sql, async () => {
    if (!await playerRow(ctx)) return unknownPlayer(ctx)
    const body = fields(ctx.body)
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
    if (!body || !code) return fail('INVALID_REQUEST')
    const { rows: [room] } = await ctx.sql('select * from gv_rooms where code = $1 for update', [code])
    if (!room) return fail('ROOM_NOT_FOUND')
    if (room.host === ctx.player) return fail('OWN_ROOM')
    if (room.guest) return fail('ROOM_FULL')
    if (room.state !== 'open' || time(room.expires_at) <= ctx.now().getTime()) {
      if (room.state === 'open') await expire(ctx, room)
      return fail('ROOM_EXPIRED')
    }
    const lineup = lineupOf(body.lineup, room.cap)
    if (typeof lineup === 'string') return fail('INVALID_LINEUP', lineup)
    const refused = stakeProblem(room.stake, body.credits)
    if (refused) return refused
    const { rows: [started] } = await ctx.sql(`update gv_rooms set guest = $2, state = 'racing', sector = 0, sector_deadline = $3, missed = $4::text::jsonb
      where id = $1 returning *`, [room.id, ctx.player, at(ctx, SECTOR_MS), JSON.stringify({ [room.host]: 0, [ctx.player as string]: 0 })])
    await ctx.sql('insert into gv_lineups (room, player, cars) values ($1, $2, $3::text::jsonb)', [room.id, ctx.player, JSON.stringify(lineup)])
    return ok({ room: roomView(started) })
  })
}

// Coup du secteur en cours, une fois par joueur ; le second coup résout le secteur.
export async function submitMove(ctx: Context) {
  return transaction(ctx.sql, async () => {
    if (!await playerRow(ctx)) return unknownPlayer(ctx)
    const player = ctx.player as string
    const body = fields(ctx.body)
    if (!body || !isUuid(body.room) || !Number.isInteger(body.sector)) return fail('INVALID_REQUEST')
    const choice = choiceOf(body)
    if (!choice) return fail('INVALID_MOVE', 'Voiture 0 à 2, consigne normal, attaque ou gestion, nitro oui ou non')
    const room = await lockRoom(ctx, body.room)
    if (!room) return fail('ROOM_NOT_FOUND')
    if (!inRoom(room, player)) return fail('NOT_YOUR_ROOM')
    if (room.state !== 'racing') return fail('NOT_RACING')
    if (body.sector !== room.sector) return fail('WRONG_SECTOR')
    const race = await loadRace(ctx, room)
    const camp = campOf(room, player)
    const played = race.moves[room.sector]
    if (played[camp]) return fail('ALREADY_PLAYED')
    if (time(room.sector_deadline) <= ctx.now().getTime()) return fail('DEADLINE_PASSED')
    const side = replay(race, room.sector)[camp]
    if (choice.nitro && side.nitro <= 0) return fail('INVALID_MOVE', 'Plus de nitro')
    if (choice.stance === 'attaque' && !canAttack(side, choice.car)) return fail('INVALID_MOVE', 'Attaque impossible : il faut deux secteurs d’endurance')
    await insertMove(ctx, room, player, choice, false)
    played[camp] = choice
    if (!played.player || !played.rival) return sectorView(room, null)
    const next = await resolveSector(ctx, room, race, json(room.missed) ?? {})
    return sectorView(next.room, next.round)
  })
}

// Délai dépassé : l'IA joue pour chaque absent (coup auto, absence comptée), puis le secteur se résout. Salle ouverte expirée : close.
async function resolveRoom(ctx: Context, id: string) {
  const room = await lockRoom(ctx, id)
  if (!room) return fail('ROOM_NOT_FOUND')
  if (ctx.player !== null && !inRoom(room, ctx.player)) return fail('NOT_YOUR_ROOM')
  const now = ctx.now().getTime()
  if (room.state === 'open') {
    if (time(room.expires_at) > now) return fail('NOT_DUE')
    return sectorView(await expire(ctx, room), null)
  }
  if (room.state !== 'racing' || time(room.sector_deadline) > now) return fail('NOT_DUE')
  const race = await loadRace(ctx, room)
  const duel = replay(race, room.sector)
  const played = race.moves[room.sector]
  const missed: Record<string, number> = { ...json(room.missed) }
  for (const camp of CAMPS) {
    if (played[camp]) continue
    const choice = autoChoice(duel, race.seed, camp)
    const player = playerOf(room, camp)
    await insertMove(ctx, room, player, choice, true)
    played[camp] = choice
    missed[player] = (missed[player] ?? 0) + 1
  }
  const next = await resolveSector(ctx, room, race, missed)
  return sectorView(next.room, next.round)
}

// Appel d'un joueur de la salle (fin de son compte à rebours) ou de la tâche planifiée (player null). Sans salle, la tâche
// planifiée traite toutes les salles en retard, chacune dans sa transaction.
export async function resolveDue(ctx: Context) {
  const body = fields(ctx.body) ?? {}
  if (ctx.player !== null && !isUuid(ctx.player)) return fail('UNAUTHORIZED')
  if (body.room === undefined && ctx.player === null) {
    const now = at(ctx)
    const { rows } = await ctx.sql(`select id from gv_rooms where (state = 'racing' and sector_deadline <= $1) or (state = 'open' and expires_at <= $1)
      order by created_at limit 100`, [now])
    const rooms: string[] = []
    for (const { id } of rows) if ((await transaction(ctx.sql, () => resolveRoom(ctx, id))).ok) rooms.push(id)
    return ok({ rooms })
  }
  if (!isUuid(body.room)) return fail('INVALID_REQUEST')
  const id = body.room
  return transaction(ctx.sql, () => resolveRoom(ctx, id))
}

// Règlement de la salle pour le joueur, une seule fois.
export async function claimSettlement(ctx: Context) {
  return transaction(ctx.sql, async () => {
    if (!await playerRow(ctx)) return unknownPlayer(ctx)
    const body = fields(ctx.body)
    if (!body || !isUuid(body.room)) return fail('INVALID_REQUEST')
    const room = await lockRoom(ctx, body.room)
    if (!room) return fail('ROOM_NOT_FOUND')
    if (!inRoom(room, ctx.player)) return fail('NOT_YOUR_ROOM')
    if (room.state === 'open' && time(room.expires_at) <= ctx.now().getTime()) await expire(ctx, room)
    const { rows: [settlement] } = await ctx.sql('select delta, reason, claimed_at from gv_settlements where room = $1 and player = $2 for update', [room.id, ctx.player])
    if (!settlement) return fail('NOT_FINISHED')
    if (settlement.claimed_at) return fail('ALREADY_CLAIMED')
    await ctx.sql('update gv_settlements set claimed_at = $3 where room = $1 and player = $2', [room.id, ctx.player, at(ctx)])
    return ok({ room: room.id, delta: settlement.delta, reason: settlement.reason })
  })
}
