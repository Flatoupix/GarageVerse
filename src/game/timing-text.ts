import { t } from '../i18n'
import type { TimingResult, TimingZone } from './timing'

export function timingFeedback(zone: TimingZone) {
  return zone === 'perfect' ? t('Parfait') : zone === 'green' ? t('Bon') : zone === 'orange' ? t('Moyen') : t('Raté')
}

export const signedTiming = (value: number) => value >= 0 ? `+${value}` : `−${Math.abs(value)}`

export function timingSummary(shifts?: TimingResult[]) {
  const counts = (['perfect', 'green', 'orange', 'red'] as const).flatMap(zone => {
    const count = shifts?.filter(shift => shift.zone === zone).length ?? 0
    return count ? [t('{n} {judgment}', { n: count, judgment: timingFeedback(zone) })] : []
  })
  const label = t('Timing du passage')
  return counts.length ? t('{label} · {summary}', { label, summary: counts.join(' · ') }) : label
}
