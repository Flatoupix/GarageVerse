import { t } from '../i18n'
import { floatText, palettes, ring, sparks, tone, type Target } from './fx'
import { buzz, sound } from './store'
import type { SoloDuel, TimingZone } from './timing'
import type { TurnOutcome } from './turn'

export type ManualGrade = 'perfect' | 'good' | 'fair' | 'miss'
export interface ManualFeedback { tag: string; grade: ManualGrade; count: number }

// La série des secteurs terminés suit la course quand on change d’onglet.
export const raceStreaks = new WeakMap<SoloDuel, number>()

export const shiftGrade: Record<TimingZone, ManualGrade> = {
  perfect: 'perfect', green: 'good', orange: 'fair', red: 'miss',
}
export const turnGrade: Record<TurnOutcome, ManualGrade> = {
  parfait: 'perfect', bien: 'good', tot: 'fair', tard: 'fair', mauvais: 'miss', rate: 'miss',
}

export function manualImpact(grade: ManualGrade, target: Target, label: Target, shift: boolean) {
  if (grade === 'perfect') {
    sparks(target, palettes.gold, 12, 0.48, 0.28)
    ring(target, tone.gold, 85, 0.24)
    floatText(label, t('Parfait !'), tone.gold, 15, 0.3)
    sound(shift ? 'gearShift' : 'coin')
    buzz(22)
  } else if (grade === 'good') {
    sparks(target, palettes.cyan, 7, 0.32, 0.21)
    sound('tap')
    buzz(12)
  } else if (grade === 'fair') {
    sparks(target, palettes.sun, 3, 0.18, 0.14)
    sound('tap')
  } else {
    sound('misfire')
    buzz([22, 45, 24])
  }
}
