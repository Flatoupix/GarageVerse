import { ref, watch } from 'vue'
import { completedSeries, persist, save } from './store'
import { t } from '../i18n'
import { tutorialSteps, type Discovery, type ManualDiscovery } from './save'

export const helpSettingTip = t('Tu peux activer « Aide en touchant les mots soulignés » dans les Réglages. Le lexique reste accessible dans les Réglages, onglet Aide.')

export const discovery = ref<Exclude<Discovery, ManualDiscovery> | null>(null)
export function tutorialAction(from: number, to: number) {
  // La Nuit sans fin ne fait pas avancer le tutoriel de la première partie.
  if (save.night || save.tutorial.status !== 'active' || save.tutorial.step < from || save.tutorial.step >= to) return
  save.tutorial.step = to
  persist()
}
export function nextTutorial() {
  if (save.tutorial.step === tutorialSteps - 1) save.tutorial.status = 'done'
  else save.tutorial.step++
  persist()
}
export function discover(key: NonNullable<typeof discovery.value>) {
  if (save.tutorial.status === 'active' || save.tutorial.seen.includes(key) || discovery.value) return
  discovery.value = key
}
// Une découverte n'est marquée vue qu'une fois lue : un rechargement avant « Compris » la remontre.
export function understoodDiscovery() {
  const key = discovery.value
  if (key && !save.tutorial.seen.includes(key)) { save.tutorial.seen.push(key); persist() }
  discovery.value = null
}
export function skipTutorial() {
  save.tutorial.status = 'skipped'
  discovery.value = null
  persist()
}
export function replayTutorial() {
  save.tutorial.step = 0
  save.tutorial.status = 'active'
  discovery.value = null
  persist()
}

watch(() => [completedSeries.value.length, save.tutorial.status, discovery.value], () => {
  if (completedSeries.value.length) discover('series')
}, { immediate: true })
