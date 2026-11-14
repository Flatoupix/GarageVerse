// Règles de préparation et de course en secteurs. Fonctions pures, sans état d'interface.
import {
  partById, rivalById, sectorLabels, sectorStat, statLabels, vehicleById,
  type Condition, type Effect, type Part, type Rival, type Sector, type StatKey, type Stats, type Vehicle,
} from './data'

export interface Prep { stage: number; parts: string[]; upgrades?: Partial<Record<StatKey, number>> }

export const upgrades = {
  man: { label: 'Pneus et suspension', art: 'pneus-route', families: ['pneus', 'suspension'] },
  acc: { label: 'Transmission et nitro', art: 'boite-courte', families: ['transmission', 'special'] },
  vit: { label: 'Moteur et turbo', art: 'admission', families: ['moteur', 'suralim'] },
  end: { label: 'Freins et châssis', art: 'freins-endurance', families: ['freins', 'chassis'] },
} satisfies Record<StatKey, { label: string; art: string; families: string[] }>
export const upgradeKeys = Object.keys(upgrades) as StatKey[]
export const upgradePrices = [10, 15]
export const partUnlockLevel = upgradePrices.length
export const upgradeForFamily = (family: string) => upgradeKeys.find(key => upgrades[key].families.includes(family))

export const STAT_CAP = 12
export const SECTORS_PER_RACE = 5
export const OVERHEAT = 3

export function compatibility(part: Part, v: Vehicle): string | undefined {
  const r = part.requires
  if (!r) return
  if (r.drive && !r.drive.includes(v.drive)) return `Réservé aux transmissions ${r.drive.join(' ou ')}`
  if (r.engine && !r.engine.includes(v.engine)) return `Réservé aux moteurs ${r.engine.join(', ')}`
  if (r.notEngine?.includes(v.engine)) return `Incompatible avec un moteur ${v.engine}`
  if (r.tagsAny && !r.tagsAny.some(tag => v.tags.includes(tag))) return `Réservé aux catégories ${r.tagsAny.join(', ')}`
}

const installed = (prep: Prep) => prep.parts.map(id => partById.get(id)).filter((p): p is Part => Boolean(p))
const sum = (effects: Effect[], type: Effect['type']) => effects.filter(e => e.type === type).reduce((n, e) => n + e.value, 0)

export function effectsOf(v: Vehicle, prep: Prep): Effect[] {
  return [...v.signature.effects, ...installed(prep).flatMap(p => p.effects ?? [])]
}

export function potential(v: Vehicle, stage: number) {
  return Math.max(2, 12 - v.cost) + stage + sum(v.signature.effects, 'potential')
}
export const prepUsed = (prep: Prep) => installed(prep).reduce((n, p) => n + p.cost, 0)

export function bestStat(v: Vehicle): StatKey {
  return (Object.keys(v.stats) as StatKey[]).reduce((best, key) => v.stats[key] > v.stats[best] ? key : best)
}

export function statsOf(v: Vehicle, prep: Prep): Stats {
  const out = { ...v.stats }
  if (prep.stage >= 2) out[bestStat(v)]++
  for (const key of upgradeKeys) out[key] += prep.upgrades?.[key] ?? 0
  for (const part of installed(prep)) for (const [key, value] of Object.entries(part.stats ?? {})) out[key as StatKey] += value
  for (const key of Object.keys(out) as StatKey[]) out[key] = Math.max(1, Math.min(STAT_CAP, out[key]))
  return out
}

export function engagements(v: Vehicle, prep: Prep) {
  return 1 + Math.floor(statsOf(v, prep).end / 4) + sum(effectsOf(v, prep), 'stamina')
}

export const statUse: Record<StatKey, string> = {
  acc: 'Détermine ton score au départ.',
  man: 'Détermine ton score dans les virages.',
  vit: 'Détermine ton score en ligne droite.',
  end: 'Compte dans les secteurs d’endurance. À 4, 8 et 12, la voiture gagne un secteur avant surchauffe.',
}

export function circuitPriorities(circuit: Rival['circuit']) {
  const count = new Map<Sector, number>()
  for (const sector of circuit.sectors) count.set(sector, (count.get(sector) ?? 0) + 1)
  return [...count].map(([sector, times]) => ({ sector, stat: sectorStat[sector], times }))
    .sort((a, b) => b.times - a.times)
}

export interface Racer { id: string; vehicle: Vehicle; prep: Prep; stats: Stats; effects: Effect[]; uses: number }
export function racer(id: string, prep: Prep): Racer {
  const vehicle = vehicleById.get(id)
  if (!vehicle) throw new Error(`Véhicule inconnu : ${id}`)
  return { id, vehicle, prep, stats: statsOf(vehicle, prep), effects: effectsOf(vehicle, prep), uses: engagements(vehicle, prep) }
}

export interface ScoreContext {
  sector: Sector; condition: Condition; lineup: Racer[]; opponent?: Racer
  behind: boolean; nitro: boolean; overheated: boolean
}
export interface ScoreLine { label: string; value: number }

const hasTag = (v: Vehicle, tag: string) => v.tags.includes(tag) || Boolean(v.culture?.aura.includes(tag))

// Modificateurs de terrain communs à toutes les voitures.
function terrain(v: Vehicle, condition: Condition): ScoreLine[] {
  const lines: ScoreLine[] = []
  if (condition === 'pluie') {
    if (v.drive === 'Intégrale') lines.push({ label: 'Pluie · intégrale', value: 1 })
    if (v.drive === 'Propulsion') lines.push({ label: 'Pluie · propulsion', value: -1 })
  }
  if (condition === 'terre') {
    if (hasTag(v, '4x4') || hasTag(v, 'Rallye')) lines.push({ label: 'Terre · tout-terrain', value: 1 })
    if (hasTag(v, 'Hypercar') || hasTag(v, 'Supercar')) lines.push({ label: 'Terre · garde au sol', value: -2 })
  }
  if (condition === 'ville') {
    if (hasTag(v, 'Citadine')) lines.push({ label: 'Ville · gabarit', value: 1 })
    if (hasTag(v, 'Hypercar') || hasTag(v, 'Muscle')) lines.push({ label: 'Ville · encombrement', value: -1 })
  }
  if (condition === 'nuit' && v.culture) lines.push({ label: 'Nuit · aura culturelle', value: 1 })
  return lines
}

export function score(r: Racer, ctx: ScoreContext): { total: number; lines: ScoreLine[] } {
  const stat = sectorStat[ctx.sector]
  const lines: ScoreLine[] = [{ label: statLabels[stat], value: r.stats[stat] }, ...terrain(r.vehicle, ctx.condition)]
  for (const effect of r.effects) {
    if (effect.type === 'boost') {
      if (effect.sectors && !effect.sectors.includes(ctx.sector)) continue
      if (effect.condition && effect.condition !== ctx.condition) continue
      lines.push({ label: 'Capacité ou pièce', value: effect.value })
    } else if (effect.type === 'comeback' && ctx.behind) {
      lines.push({ label: 'Retour en force', value: effect.value })
    } else if (effect.type === 'underdog' && ctx.opponent && ctx.opponent.vehicle.cost >= r.vehicle.cost + 4) {
      lines.push({ label: 'Outsider', value: effect.value })
    } else if (effect.type === 'aura') {
      const allies = ctx.lineup.filter(o => o !== r && hasTag(o.vehicle, effect.tag)).length
      if (allies) lines.push({ label: `Aura ${effect.tag}`, value: effect.value * allies })
    }
  }
  if (ctx.nitro) lines.push({ label: 'Nitro', value: 2 + sum(r.effects, 'nitroPower') })
  if (ctx.overheated) lines.push({ label: 'Surchauffe', value: -OVERHEAT })
  return { total: lines.reduce((n, l) => n + l.value, 0), lines }
}

export function circuitScores(r: Racer, circuit: Rival['circuit']) {
  const conditions = Object.entries(circuit.conditions) as [Condition, number][]
  const weight = conditions.reduce((total, [, chance]) => total + chance, 0)
  return circuitPriorities(circuit).map(({ sector, stat, times }) => ({ stat, times, sector, label: sectorLabels[sector],
    average: conditions.reduce((total, [condition, chance]) => total + chance * score(r, {
      sector, condition, lineup: [r], behind: false, nitro: false, overheated: false,
    }).total, 0) / weight,
  }))
}

// ——— Duel en cinq secteurs ———

export interface Side { lineup: Racer[]; used: number[]; nitro: number; points: number }
export interface Play { car: number; nitro: boolean; score: number; lines: ScoreLine[]; overheated: boolean }
export interface Round { sector: Sector; condition: Condition; player: Play; rival: Play; winner: 'player' | 'rival' | 'tie' }
export interface Duel {
  rivalId: string; sectors: Sector[]; conditions: Condition[]
  player: Side; rival: Side; rounds: Round[]; winner?: 'player' | 'rival' | 'tie'
}

export type Rng = () => number

function pick<T extends string>(weights: Partial<Record<T, number>>, rng: Rng): T {
  const entries = Object.entries(weights) as [T, number][]
  let roll = rng() * entries.reduce((n, [, w]) => n + w, 0)
  for (const [key, weight] of entries) if ((roll -= weight) < 0) return key
  return entries[entries.length - 1][0]
}

function side(lineup: { id: string; prep: Prep }[]): Side {
  const racers = lineup.map(entry => racer(entry.id, entry.prep))
  return { lineup: racers, used: racers.map(() => 0), nitro: 2 + racers.reduce((n, r) => n + sum(r.effects, 'nitro'), 0), points: 0 }
}

export function rivalLineup(rival: Rival) {
  return rival.lineup.map(entry => ({ id: entry.id, prep: { stage: entry.stage, parts: entry.parts } }))
}

export function createRace(rivalId: string, circuit: Rival['circuit'], player: { id: string; prep: Prep }[],
  opponent: { id: string; prep: Prep }[], rng: Rng): Duel {
  return {
    rivalId, sectors: [...circuit.sectors], conditions: circuit.sectors.map(() => pick(circuit.conditions, rng)),
    player: side(player), rival: side(opponent), rounds: [],
  }
}

export function createDuel(rivalId: string, lineup: { id: string; prep: Prep }[], rng: Rng): Duel {
  const rival = rivalById.get(rivalId)
  if (!rival) throw new Error(`Rival inconnu : ${rivalId}`)
  return createRace(rivalId, rival.circuit, lineup, rivalLineup(rival), rng)
}

export const overheated = (s: Side, car: number) => s.used[car] >= s.lineup[car].uses

export function evaluate(duel: Duel, who: 'player' | 'rival', car: number, nitro: boolean, against?: number): Play {
  const me = duel[who], other = duel[who === 'player' ? 'rival' : 'player']
  const index = duel.rounds.length
  const hot = overheated(me, car)
  const { total, lines } = score(me.lineup[car], {
    sector: duel.sectors[index], condition: duel.conditions[index], lineup: me.lineup,
    opponent: against === undefined ? undefined : other.lineup[against],
    behind: me.points < other.points, nitro: nitro && me.nitro > 0, overheated: hot,
  })
  return { car, nitro: nitro && me.nitro > 0, score: total, lines, overheated: hot }
}

// L'IA connaît les mêmes informations que le joueur : écuries, secteurs et conditions annoncées.
export function aiChoice(duel: Duel, who: 'player' | 'rival', rng: Rng): { car: number; nitro: boolean } {
  const index = duel.rounds.length
  const foe = who === 'player' ? 'rival' : 'player'
  const me = duel[who], other = duel[foe]
  const threat = Math.max(...other.lineup.map((_, car) => evaluate(duel, foe, car, false).score))
  const future = duel.sectors.slice(index + 1)
  let best = { car: 0, value: -Infinity }
  me.lineup.forEach((r, car) => {
    const here = evaluate(duel, who, car, false).score
    const left = r.uses - me.used[car]
    const later = future.length ? future.reduce((n, s) => n + r.stats[sectorStat[s]], 0) / future.length : 0
    const scarcity = left <= 1 ? 0.45 : 0.15
    const value = here - (here >= threat ? 0 : 1.5) - later * scarcity + (rng() - 0.5) * 1.6
    if (value > best.value) best = { car, value }
  })
  const here = evaluate(duel, who, best.car, false).score
  const margin = here - threat
  const closing = index >= duel.sectors.length - 2
  const nitro = me.nitro > 0 && margin >= -2 && margin <= 1 && (closing || me.nitro > 1 || rng() < 0.4)
  return { car: best.car, nitro }
}

export function playRound(duel: Duel, choice: { car: number; nitro: boolean }, rng: Rng): Round {
  if (duel.winner || duel.rounds.length >= duel.sectors.length) throw new Error('Course terminée')
  const ai = aiChoice(duel, 'rival', rng)
  const player = evaluate(duel, 'player', choice.car, choice.nitro, ai.car)
  const rival = evaluate(duel, 'rival', ai.car, ai.nitro, choice.car)
  let winner: Round['winner'] = player.score > rival.score ? 'player' : rival.score > player.score ? 'rival' : 'tie'
  if (winner === 'tie') {
    const a = duel.player.lineup[choice.car].stats.end, b = duel.rival.lineup[ai.car].stats.end
    winner = a > b ? 'player' : b > a ? 'rival' : 'tie'
  }
  const index = duel.rounds.length
  const round: Round = { sector: duel.sectors[index], condition: duel.conditions[index], player, rival, winner }
  for (const [who, play] of [['player', player], ['rival', rival]] as const) {
    duel[who].used[play.car]++
    if (play.nitro) duel[who].nitro--
  }
  if (winner !== 'tie') duel[winner].points++
  duel.rounds.push(round)
  if (duel.rounds.length === duel.sectors.length) {
    const p = duel.player.points, r = duel.rival.points
    if (p !== r) duel.winner = p > r ? 'player' : 'rival'
    else {
      const total = (who: 'player' | 'rival') => duel.rounds.reduce((n, x) => n + x[who].score, 0)
      duel.winner = total('player') > total('rival') ? 'player' : total('rival') > total('player') ? 'rival' : 'tie'
    }
  }
  return round
}

export function lineupCost(ids: string[]) {
  return ids.reduce((n, id) => n + (vehicleById.get(id)?.cost ?? 0), 0)
}
