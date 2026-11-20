import './i18n/localize-data'
import { registerOffline } from './game/offline'
import { createApp, h, ref } from 'vue'
import App from './App.vue'
import GarageLoading from './components/GarageLoading.vue'
import GameDaveSplash from './components/GameDaveSplash.vue'
import { audioAssets } from './audio'
import { essentialImages } from './game/art'
import { assets, startBackgroundLoading } from './game/asset-loading'
import { save } from './game/store'
import { themeFx } from './game/fx'
import { applyTheme } from './game/theme'

// Le thème choisi s'applique avant le premier rendu, sans flash du style par défaut.
applyTheme(save.preferences.theme)
themeFx(save.preferences.theme)

registerOffline()

const ready = ref(false)
// Splash GAMEDAVE à chaque lancement, joué pendant le chargement de l'essentiel ; les navigateurs pilotés par un outil de test le sautent.
const splash = ref(!navigator.webdriver)
const showProgress = ref(false)
const canSkip = ref(false)
const percent = ref(0)
const started = performance.now()
let shownAt: number | undefined
let readTimer: ReturnType<typeof setTimeout> | undefined

function openGarage() {
  if (ready.value) return
  clearTimeout(showTimer)
  clearTimeout(skipTimer)
  clearTimeout(deadline)
  clearTimeout(readTimer)
  ready.value = true
  startBackgroundLoading()
  essential.background()
}

const showTimer = setTimeout(() => { shownAt = performance.now(); showProgress.value = true }, 150)
const skipTimer = setTimeout(() => { canSkip.value = true }, 2000)
const deadline = setTimeout(openGarage, 8000)
const essential = assets.preload([...essentialImages(save), ...audioAssets], 'essential', ({ loaded, total }) => {
  percent.value = total ? Math.round(loaded / total * 100) : 100
})
void essential.done.then(() => {
  if (ready.value) return
  // Si l'écran est apparu, laisse-le au moins le temps d'être lu, dans le délai global.
  const now = performance.now()
  const remaining = shownAt !== undefined ? Math.min(shownAt + 200 - now, started + 8000 - now) : 0
  if (remaining > 0) readTimer = setTimeout(openGarage, remaining)
  else openGarage()
})

createApp({
  render: () => splash.value ? h(GameDaveSplash, { onDone: () => { splash.value = false } }) : ready.value ? h(App) : h(GarageLoading, { showProgress: showProgress.value, percent: percent.value, canSkip: canSkip.value, onSkip: openGarage }),
}).mount('#app')
