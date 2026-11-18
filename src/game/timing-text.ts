import { t } from '../i18n'
import type { TimingZone } from './timing'

export function timingFeedback(zone: TimingZone) {
  return zone === 'perfect' ? t('Parfait') : zone === 'green' ? t('Bon') : zone === 'orange' ? t('Moyen') : t('Raté')
}

export const signedTiming = (value: number) => value >= 0 ? `+${value}` : `−${Math.abs(value)}`
