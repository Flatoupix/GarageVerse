import { t } from '../i18n'
import { rivalStepMap } from './data'
import { perfectSteps, unlockedRivalSteps, type Save } from './save'

export function perfectStepsText(save: Save, rivalId: string) {
  const unlocked = unlockedRivalSteps(save, rivalId)
  const steps = rivalStepMap.get(rivalId) ?? []
  const perfect = perfectSteps(save, rivalId).map((won, i) => won && unlocked.includes(steps[i].id))
  const labels = [t('Essais'), t('Qualifs'), t('Finale')]
  return {
    stars: perfect.map(won => won ? '★' : '☆').join(''),
    label: perfect.map((won, i) => t('{step} : {status}', {
      step: labels[i],
      status: won ? t('parfaite') : t('non parfaite'),
    })).join(t(' ; ')),
  }
}
