import { playRound, type Choice, type Duel, type Rng, type Round } from './rules'

export type PilotMode = 'auto' | 'manuel'

export interface RacePilot {
  mode: PilotMode
  turn?: boolean
  automaticFrom?: number
}

export type PilotSummary = PilotMode | 'mixed'

// Mode figé au lancement d'une course : le manuel exige le mode timing expérimental.
export function racePilot(mode: PilotMode | undefined, timingMode?: boolean, turnMode?: boolean): RacePilot {
  return timingMode && mode === 'manuel' ? { mode: 'manuel', turn: turnMode === true } : { mode: 'auto' }
}

// Mode réellement joué, d'après les secteurs résolus : un geste de timing ou de virage signe un secteur manuel.
export const roundPilot = (round: Round & { timing?: unknown; direction?: unknown }): PilotMode =>
  round.timing || round.direction ? 'manuel' : 'auto'
export function pilotSummary(rounds: Round[]): PilotSummary {
  const modes = new Set(rounds.map(roundPilot))
  return modes.has('manuel') ? (modes.has('auto') ? 'mixed' : 'manuel') : 'auto'
}

export function sectorPilot(pilot: RacePilot | undefined, index: number): PilotMode {
  return pilot?.mode === 'manuel' && index < (pilot.automaticFrom ?? Infinity) ? 'manuel' : 'auto'
}

// Le premier secteur automatique est définitif, même après une reprise.
export function switchToAutomatic(pilot: RacePilot, index: number): RacePilot {
  return pilot.mode === 'manuel' && pilot.automaticFrom === undefined ? { ...pilot, automaticFrom: index } : pilot
}

export function playPilotRound(duel: Duel & { pilot?: RacePilot }, choice: Choice, rng: Rng, manual?: () => Round): Round {
  if (sectorPilot(duel.pilot, duel.rounds.length) === 'auto') return playRound(duel, choice, rng)
  if (!manual) throw new Error('Résultat du pilotage manuel manquant')
  return manual()
}
