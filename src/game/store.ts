import { computed, reactive, ref, watch } from 'vue'
import { touchHelpEnabled } from './help'
import { playCue, type Cue } from '../feedback'
import { series, vehicles } from './data'
import { seriesComplete, LEGACY_KEY, refreshDaily, readSave, SAVE_KEY, type Save } from './save'

function load(): Save {
  try { return readSave(localStorage.getItem(SAVE_KEY), localStorage.getItem(LEGACY_KEY)) } catch { storageWarning.value = true; return readSave(null) }
}

export const storageWarning = ref(false)
// Aucune partie enregistrée avant ce lancement : nouveau joueur, accueilli par le tutoriel plutôt que par les notes de version.
export const firstLaunch = (() => { try { return !localStorage.getItem(SAVE_KEY) && !localStorage.getItem(LEGACY_KEY) } catch { return false } })()
export const save = reactive(load()) as Save
watch(() => save.preferences.touchHelp, value => { touchHelpEnabled.value = value !== false }, { immediate: true })
export const toast = ref<{ text: string; tone: 'info' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

// Une autre fenêtre peut terminer une opération Versus pendant que celle-ci est suspendue.
export function refreshVersusSave() {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return
  let stored: Save | null
  try { stored = JSON.parse(raw) } catch { return }
  if (!stored) return
  if (stored.version === 2 && JSON.stringify(stored.versus ?? null) !== JSON.stringify(save.versus)) {
    Object.assign(save, readSave(raw))
  }
}
window.addEventListener('storage', event => {
  if (event.key === SAVE_KEY) refreshVersusSave()
})

export function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
    storageWarning.value = false
  } catch {
    storageWarning.value = true
  }
}

export function notify(text: string, tone: 'info' | 'error' = 'info') {
  toast.value = { text, tone }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 2600)
}

// Exécute une action de jeu : un texte retourné est un refus affiché au joueur, sinon on sauvegarde.
export function act(action: (s: Save) => string | undefined | void, success?: string, cue?: Cue) {
  const problem = action(save)
  if (typeof problem === 'string') { notify(problem, 'error'); sound('error'); buzz([12, 40, 12]); return false }
  persist()
  if (success) notify(success)
  if (cue) sound(cue)
  return true
}

export function sound(cue: Cue) { if (save.preferences.sound) playCue(cue) }
export function buzz(pattern: number | number[]) { if (save.preferences.vibration && !reducedMotion.value) navigator.vibrate?.(pattern) }

const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
export const systemReduced = ref(systemMotion.matches)
systemMotion.addEventListener('change', event => { systemReduced.value = event.matches })
export const reducedMotion = computed(() => systemReduced.value || save.preferences.reducedMotion)

// Téléphone (moins de 650 px de large) : 4 et 5 voitures par ligne passent en vue planche.
const phone = window.matchMedia('(max-width: 649px)')
export const narrow = ref(phone.matches)
phone.addEventListener('change', event => { narrow.value = event.matches })

export const ownedCount = computed(() => vehicles.filter(v => save.cars[v.id]).length)

export const dailySelected = ref(false)
// Passage de minuit : le défi et le booster du jour se renouvellent sans recharger la page.
setInterval(() => { const before = save.daily.date; refreshDaily(save); if (before !== save.daily.date) persist() }, 30_000)
window.addEventListener('focus', () => {
  try { refreshVersusSave() } catch { storageWarning.value = true; return }
  refreshDaily(save)
  persist()
})

export const completedSeries = computed(() => series.filter(entry => seriesComplete(save, entry)))
export const pendingSeries = computed(() => completedSeries.value.filter(entry => !save.series.includes(entry.id)))
