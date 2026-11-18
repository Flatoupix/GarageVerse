import { t } from '../i18n'
import type { TurnOutcome } from './turn'

export const turnFeedback = (outcome: TurnOutcome) => ({
  bien: t('Bien placé'), tot: t('Trop tôt'), mauvais: t('Mauvais côté'), tard: t('Trop tard'),
})[outcome]
