import { partById, sectorStat, type Sector } from './data'
import { aiChoice, commitRound, playVersusRound, seededRng, STAT_CAP, upgradeForFamily, type Choice, type Duel, type Racer, type Rng, type Round, type ScoreLine } from './rules'

import type { RacePilot } from './pilot'
import type { TurnResult } from './turn'

export const timingModifiers = { red: -2, orange: -1, green: 0, perfect: 1 }
export type TimingZone = keyof typeof timingModifiers
export interface TimingResult { zone: TimingZone; modifier: number }
export interface TimingWindow { center: number; green: number; orange: number; duration: number }
// Les secteurs enregistrés avant la séquence de rythme conservent leur jugement unique.
type LegacyTurnResult = { outcome: 'bien' | 'tot' | 'mauvais' | 'tard'; modifier: number }
export interface TimingRound extends Round { timing?: TimingResult; direction?: TurnResult | LegacyTurnResult }
export interface SoloDuel extends Duel {
  rounds: TimingRound[]
  pilot?: RacePilot
  timingChoice?: Choice
  timingReview?: boolean
}

const profiles: Record<Sector, { duration: number; green: number; anchor: number }> = {
  depart: { duration: 1750, green: 0.14, anchor: 0.52 },
  virage: { duration: 2050, green: 0.13, anchor: 0.57 },
  ligne: { duration: 1900, green: 0.12, anchor: 0.69 },
  endurance: { duration: 2400, green: 0.105, anchor: 0.58 },
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function timingWindow(sector: Sector, seed: string, sectorIndex: number, stat: number, stage: number, parts: number, difficulty: number): TimingWindow {
  const profile = profiles[sector]
  const level = clamp(difficulty, 0, 1)
  const assist = Math.min(1.35, 1 + 0.15 * clamp(stat, 0, STAT_CAP) / STAT_CAP
    + 0.04 * clamp(stage, 0, 3) + 0.04 * clamp(parts, 0, 3))
  return {
    center: profile.anchor + (seededRng(JSON.stringify([seed, sectorIndex]))() - 0.5) * 0.16,
    green: profile.green * (1 - 0.2 * level) * assist,
    orange: 0.055 * assist,
    duration: profile.duration * (1 - 0.2 * level),
  }
}

export function timingBounds(window: TimingWindow) {
  const { center, green, orange } = window
  return [center - green / 2 - orange, center - green / 2, center - green / 6, center + green / 6,
    center + green / 2, center + green / 2 + orange] as const
}

export function classifyTiming(position: number, window: TimingWindow, modifiers: Record<TimingZone, number> = timingModifiers): TimingResult {
  const [left, greenStart, perfectStart, perfectEnd, greenEnd, right] = timingBounds(window)
  const zone = position >= perfectStart && position <= perfectEnd ? 'perfect'
    : position >= greenStart && position <= greenEnd ? 'green'
      : position >= left && position <= right ? 'orange' : 'red'
  return { zone, modifier: modifiers[zone] }
}

export function soloTimingWindow(duel: Duel, car: Racer): TimingWindow {
  const index = duel.rounds.length
  const sector = duel.sectors[index], stat = sectorStat[sector]
  const parts = car.prep.parts.filter(id => upgradeForFamily(partById.get(id)?.family ?? '') === stat).length
  const rivalStat = duel.rival.lineup.reduce((sum, racer) => sum + racer.stats[stat], 0) / duel.rival.lineup.length
  const seed = JSON.stringify([duel.rivalId, duel.sectors, duel.player.lineup.map(racer => racer.id)])
  return timingWindow(sector, seed, index, car.stats[stat], car.prep.stage, parts, rivalStat / STAT_CAP)
}

export function playTimingRound(duel: SoloDuel, choice: Choice, timing: TimingResult, rng: Rng): TimingRound {
  return playSoloModifiedRound(duel, choice, { label: 'Timing du passage', value: timing.modifier }, { timing }, rng)
}

export function playTurnRound(duel: SoloDuel, choice: Choice, direction: TurnResult, rng: Rng): TimingRound {
  return playSoloModifiedRound(duel, choice, { label: 'Direction', value: direction.modifier }, { direction }, rng)
}

function playSoloModifiedRound(duel: SoloDuel, choice: Choice, line: ScoreLine,
  feedback: Pick<TimingRound, 'timing' | 'direction'>, rng: Rng): TimingRound {
  const rivalChoice = aiChoice(duel, 'rival', rng)
  // Le moteur tire d'abord la chance du joueur. Deux milieux d'intervalle donnent une forme du jour nulle.
  // On conserve ensuite les vrais tirages du rival et on applique le secteur corrigé à la course réelle.
  const preview = {
    ...duel, rounds: [...duel.rounds],
    player: { ...duel.player, used: [...duel.player.used] },
    rival: { ...duel.rival, used: [...duel.rival.used] },
  }
  let draws = 0
  const round = Object.assign(playVersusRound(preview, choice, rivalChoice, () => draws++ < 2 ? 0.5 : rng()), feedback)
  round.player.score += line.value
  round.player.lines.push(line)
  const difference = round.player.score - round.rival.score
    || duel.player.lineup[choice.car].stats.end - duel.rival.lineup[rivalChoice.car].stats.end
  round.winner = difference > 0 ? 'player' : difference < 0 ? 'rival' : 'tie'
  commitRound(duel, round)
  return round
}
