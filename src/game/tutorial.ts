import { ref } from 'vue'
import { persist, save } from './store'
import { tutorialSteps, type Discovery } from './save'

export const discovery = ref<Discovery | null>(null)
export function tutorialAction(from: number, to: number) {
  if (save.tutorial.status !== 'active' || save.tutorial.step < from || save.tutorial.step >= to) return
  save.tutorial.step = to
  persist()
}
export function nextTutorial() {
  if (save.tutorial.step === tutorialSteps - 1) save.tutorial.status = 'done'
  else save.tutorial.step++
  persist()
}
export function discover(key: Discovery) {
  if (save.tutorial.status === 'active' || save.tutorial.seen.includes(key) || discovery.value) return
  discovery.value = key
  save.tutorial.seen.push(key)
  persist()
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
