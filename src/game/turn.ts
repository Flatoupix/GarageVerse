export type TurnDirection = 'gauche' | 'droite'
export interface TurnWindow { start: number; end: number }
export const turnModifiers = { bien: 1, tot: 0, mauvais: -1, tard: -1 }
export type TurnOutcome = keyof typeof turnModifiers
export interface TurnResult { outcome: TurnOutcome; modifier: number }

export function expectedTurn(circuitId: string, sectorIndex: number): TurnDirection {
  let hash = sectorIndex
  for (const character of circuitId) hash = Math.imul(hash, 31) + character.codePointAt(0)!
  return (hash & 1) === 0 ? 'gauche' : 'droite'
}

// Le temps est mesuré depuis le début de l’approche. Les deux bornes sont incluses.
export function classifyTurn(expected: TurnDirection, input: TurnDirection | null, elapsed: number, window: TurnWindow): TurnOutcome | null {
  if (elapsed > window.end) return 'tard'
  if (input === null) return null
  if (input !== expected) return 'mauvais'
  return elapsed < window.start ? 'tot' : 'bien'
}

export function resolveTurn(previous: TurnResult | null, expected: TurnDirection, input: TurnDirection | null,
  elapsed: number, window: TurnWindow, modifiers: Record<TurnOutcome, number> = turnModifiers): TurnResult | null {
  if (previous) return previous
  const outcome = classifyTurn(expected, input, elapsed, window)
  return outcome === null ? null : { outcome, modifier: modifiers[outcome] }
}
