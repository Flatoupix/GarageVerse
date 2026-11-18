export const TURN_LEAD_MS = 1600

export type TurnDirection = 'gauche' | 'droite'
export const turnModifiers = { parfait: 2, bien: 1, tot: 0, tard: -1, mauvais: -1, rate: -1 }
export type TurnOutcome = keyof typeof turnModifiers
export interface TurnNote { direction: TurnDirection; at: number }
export interface TurnJudgment { outcome: TurnOutcome; modifier: number }
export interface TurnResult { parfait: number; bien: number; rate: number; modifier: number }
export interface TurnSettings {
  count: number
  lead: number
  perfect: number
  good: number
  acceptance: number
  spacing: number
  min: number
  max: number
  modifiers: Record<TurnOutcome, number>
}
export interface TurnSequence { notes: TurnNote[]; settings: TurnSettings }

function hashTurn(key: string) {
  let hash = 2166136261
  for (const character of key) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619)
  return hash >>> 0
}

export function turnSequence(circuitId: string, sectorIndex: number, rivalId: string, overrides: Partial<TurnSettings> = {}): TurnSequence {
  const difficulty = hashTurn(rivalId) / 0xffffffff
  const settings: TurnSettings = {
    count: 3,
    lead: TURN_LEAD_MS,
    perfect: Math.round(100 - 35 * difficulty),
    good: Math.round(230 - 75 * difficulty),
    acceptance: Math.round(410 - 80 * difficulty),
    spacing: 1050,
    min: -2,
    max: 2,
    modifiers: turnModifiers,
    ...overrides,
  }
  const notes: TurnNote[] = []
  const spacing = Math.max(settings.spacing, 2 * settings.acceptance + 250)
  let at = settings.lead
  for (let i = 0; i < settings.count; i++) {
    const hash = hashTurn(JSON.stringify([circuitId, sectorIndex, rivalId, i]))
    at += i === 0 ? -(hash % 181) : spacing + (hash % 181)
    notes.push({ direction: hash & 256 ? 'gauche' : 'droite', at })
  }
  return { notes, settings }
}

// Les fenêtres sont symétriques et leurs bornes sont incluses.
export function judgeTurn(note: TurnNote, input: TurnDirection | null,
  elapsed: number, settings: TurnSettings): TurnJudgment | null {
  const offset = elapsed - note.at
  let outcome: TurnOutcome
  if (offset > settings.acceptance) outcome = 'rate'
  else if (input === null || offset < -settings.acceptance) return null
  else if (input !== note.direction) outcome = 'mauvais'
  else if (Math.abs(offset) <= settings.perfect) outcome = 'parfait'
  else if (Math.abs(offset) <= settings.good) outcome = 'bien'
  else outcome = offset < 0 ? 'tot' : 'tard'
  return { outcome, modifier: settings.modifiers[outcome] }
}

export function advanceTurns(sequence: TurnSequence, judgments: TurnJudgment[], input: TurnDirection | null, elapsed: number): TurnJudgment[] {
  const { notes, settings } = sequence
  let next = judgments
  // Un appui ne juge qu’une note. Les fenêtres disjointes écartent les doubles appuis.
  while (next.length < notes.length) {
    const result = judgeTurn(notes[next.length], input, elapsed, settings)
    if (!result) break
    if (next === judgments) next = [...judgments]
    next.push(result)
    if (result.outcome !== 'rate') break
  }
  return next
}

export function summarizeTurns(judgments: TurnJudgment[], settings: TurnSettings): TurnResult {
  const result = { parfait: 0, bien: 0, rate: 0, modifier: 0 }
  for (const { outcome, modifier } of judgments) {
    if (outcome === 'parfait' || outcome === 'bien' || outcome === 'rate') result[outcome]++
    result.modifier += modifier
  }
  result.modifier = Math.max(settings.min, Math.min(settings.max, result.modifier))
  return result
}
