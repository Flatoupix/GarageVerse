import { t, tp } from '../i18n'
import type { TurnOutcome, TurnResult } from './turn'

export const turnFeedback = (outcome: TurnOutcome) => ({
  parfait: t('Parfait'), bien: t('Bien'), tot: t('Trop tôt'),
  mauvais: t('Mauvais côté'), tard: t('Trop tard'), rate: t('Raté'),
})[outcome]

export const turnSummary = (result: TurnResult) => t('{perfect} · {good} · {misses}', {
  perfect: tp('{n} Parfait', '{n} Parfaits', result.parfait),
  good: t('{n} Bien', { n: result.bien }),
  misses: tp('{n} Raté', '{n} Ratés', result.rate),
})
