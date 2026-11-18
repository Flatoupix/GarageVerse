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
export interface TimingRound extends Round { timing?: TimingResult; shifts?: TimingResult[]; direction?: TurnResult | LegacyTurnResult }
export interface SoloDuel extends Duel {
  rounds: TimingRound[]
  pilot?: RacePilot
  timingChoice?: Choice
  timingReview?: boolean
}

export const shiftsPerSector: Record<Sector, number> = { depart: 2, ligne: 3, endurance: 2, virage: 2 }
export const TIMING_RISE_MS: Record<Sector, number> = { depart: 900, ligne: 1000, virage: 1050, endurance: 1200 }
export const TIMING_RETURN_MS = 220
export const TIMING_MIN_RISE_MS = 800
export const TIMING_DIFFICULTY_FACTOR = 0.12
export const TIMING_MIN_GREEN_START = 0.28

const profiles: Record<Sector, { green: number; anchor: number }> = {
  depart: { green: 0.15, anchor: 0.54 },
  virage: { green: 0.14, anchor: 0.57 },
  ligne: { green: 0.13, anchor: 0.65 },
  endurance: { green: 0.19, anchor: 0.58 },
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function timingWindow(sector: Sector, seed: string, sectorIndex: number, stat: number, stage: number, parts: number, difficulty: number, shiftIndex = 0): TimingWindow {
  const profile = profiles[sector]
  const level = clamp(difficulty, 0, 1)
  const assist = Math.min(1.35, 1 + 0.15 * clamp(stat, 0, STAT_CAP) / STAT_CAP
    + 0.04 * clamp(stage, 0, 3) + 0.04 * clamp(parts, 0, 3))
  const finalStraight = sector === 'ligne' && shiftIndex === shiftsPerSector.ligne - 1
  const green = profile.green * (finalStraight ? 0.72 : 1) * (1 - 0.2 * level) * assist
  // Les décalages séparent les fenêtres voisines, même si leurs tirages se ressemblent.
  const offset = (shiftIndex - (shiftsPerSector[sector] - 1) / 2) * 0.09
  const jitter = (seededRng(JSON.stringify([seed, sectorIndex, shiftIndex]))() - 0.5) * 0.08
  return {
    center: Math.max(TIMING_MIN_GREEN_START + green / 2, profile.anchor + offset + jitter),
    green,
    orange: 0.055 * assist,
    duration: Math.max(TIMING_MIN_RISE_MS, TIMING_RISE_MS[sector] * (1 - TIMING_DIFFICULTY_FACTOR * level)),
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

export function soloTimingWindow(duel: Duel, car: Racer, shiftIndex = 0): TimingWindow {
  const index = duel.rounds.length
  const sector = duel.sectors[index], stat = sectorStat[sector]
  const parts = car.prep.parts.filter(id => upgradeForFamily(partById.get(id)?.family ?? '') === stat).length
  const rivalStat = duel.rival.lineup.reduce((sum, racer) => sum + racer.stats[stat], 0) / duel.rival.lineup.length
  const seed = JSON.stringify([duel.rivalId, duel.sectors, duel.player.lineup.map(racer => racer.id)])
  return timingWindow(sector, seed, index, car.stats[stat], car.prep.stage, parts, rivalStat / STAT_CAP, shiftIndex)
}

export function summarizeShifts(shifts: readonly TimingResult[]): TimingResult {
  const mean = shifts.reduce((sum, { zone }) => sum + timingModifiers[zone], 0) / Math.max(1, shifts.length)
  const modifier = Math.sign(mean) * Math.ceil(Math.abs(mean) - 0.5) || 0
  const zone = modifier === 1 ? 'perfect' : modifier === 0 ? 'green' : modifier === -1 ? 'orange' : 'red'
  return { zone, modifier }
}

export function playTimingRound(duel: SoloDuel, choice: Choice, result: TimingResult | TimingResult[], rng: Rng, rivalChoice?: Choice): TimingRound {
  const feedback = Array.isArray(result) ? { timing: summarizeShifts(result), shifts: [...result] } : { timing: result }
  return playSoloModifiedRound(duel, choice, { label: 'Timing du passage', value: feedback.timing.modifier }, feedback, rng, rivalChoice)
}

export function playTurnRound(duel: SoloDuel, choice: Choice, direction: TurnResult, rng: Rng, rivalChoice?: Choice): TimingRound {
  return playSoloModifiedRound(duel, choice, { label: 'Direction', value: direction.modifier }, { direction }, rng, rivalChoice)
}

function playSoloModifiedRound(duel: SoloDuel, choice: Choice, line: ScoreLine,
  feedback: Pick<TimingRound, 'timing' | 'shifts' | 'direction'>, rng: Rng, rivalChoice: Choice = aiChoice(duel, 'rival', rng)): TimingRound {
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
