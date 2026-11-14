<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { floatText, mountFx, pop, tween } from './game/fx'
import { buzz, persist, reducedMotion, save, sound, storageWarning, systemReduced, toast } from './game/store'
import BoosterView from './views/BoosterView.vue'
import CarSheet from './views/CarSheet.vue'
import GarageView from './views/GarageView.vue'
import HomeView from './views/HomeView.vue'
import PartSheet from './views/PartSheet.vue'
import RaceView from './views/RaceView.vue'
import ShopView from './views/ShopView.vue'

type Screen = 'home' | 'shop' | 'booster' | 'garage' | 'race'
type Setting = keyof typeof save.preferences

const screen = ref<Screen>(save.duel ? 'race' : save.sealed || (save.opening && save.opening.view !== 'recap') ? 'booster' : 'home')
const settings = ref<HTMLDialogElement>()
const sheet = ref<HTMLDialogElement>()
const inspected = ref<{ kind: 'car' | 'part'; id: string } | null>(null)
const tabs: { id: Screen; label: string; icon: string }[] = [
  { id: 'home', label: 'Accueil', icon: '◐' }, { id: 'shop', label: 'Boosters', icon: '▱' },
  { id: 'garage', label: 'Garage', icon: '▦' }, { id: 'race', label: 'Course', icon: '⟶' },
]

// Crédits : le compteur défile et un montant flottant signale chaque gain ou dépense.
const fx = ref<HTMLCanvasElement>()
const wallet = ref<HTMLElement>()
const shownCredits = ref(save.credits)
const creditMove = ref<'gain' | 'spend' | null>(null)
let stopCredits = () => {}
watch(() => save.credits, (now, before) => {
  stopCredits()
  const delta = now - before
  creditMove.value = delta > 0 ? 'gain' : 'spend'
  floatText({ x: (wallet.value?.getBoundingClientRect().left ?? 0) + 30, y: (wallet.value?.getBoundingClientRect().bottom ?? 40) + 22 },
    `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`, delta > 0 ? '#ffb347' : '#ff5fd2', 18)
  if (delta > 0) sound('coin')
  pop(wallet.value, 1.18)
  stopCredits = tween(shownCredits.value, now, 600, v => { shownCredits.value = v }, () => { creditMove.value = null })
})

onMounted(() => {
  if (fx.value) mountFx(fx.value)
  // Retour tactile et sonore discret sur chaque commande.
  document.addEventListener('click', event => {
    const control = (event.target as Element).closest?.('button, [role="radio"], label.setting, label.nitro-toggle, label.missing-toggle')
    if (control && !(control as HTMLButtonElement).disabled) { sound('tap'); buzz(6) }
  }, true)
})

function go(destination: Screen) {
  toast.value = null
  screen.value = destination
  window.scrollTo(0, 0)
  void nextTick(() => document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true }))
}

function inspect(kind: 'car' | 'part', id: string) {
  inspected.value = { kind, id }
  if (!sheet.value?.open) sheet.value?.showModal()
  sheet.value?.scrollTo(0, 0)
}

// Plein écran : API Fullscreen (Android, ordinateur) ; sur iPhone, seule l'app ajoutée à l'écran d'accueil s'ouvre sans barre.
const installed = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const canFullscreen = document.fullscreenEnabled
const fullscreen = ref(Boolean(document.fullscreenElement))
document.addEventListener('fullscreenchange', () => { fullscreen.value = Boolean(document.fullscreenElement) })

async function toggleFullscreen() {
  if (!canFullscreen) { settings.value?.showModal(); return }
  try {
    if (document.fullscreenElement) return await document.exitFullscreen()
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    await (window.screen.orientation as { lock?: (o: string) => Promise<void> }).lock?.('portrait').catch(() => {})
  } catch {
    // Le navigateur peut refuser sans geste utilisateur valide : on reste en fenêtre.
  }
}

function toggleSetting(key: Setting) {
  save.preferences[key] = !save.preferences[key]
  persist()
}
</script>

<template>
  <div class="app-shell" :class="{ 'motion-reduced': reducedMotion }">
    <div class="sky" aria-hidden="true"><div class="sky-grid"></div></div>
    <header class="topbar">
      <button class="brand" type="button" aria-label="GarageVerse, accueil" @click="go('home')">
        <span class="brand-mark" aria-hidden="true">GV</span><span>GARAGE<span class="brand-accent">VERSE</span></span>
      </button>
      <div class="wallet">
        <span ref="wallet" class="credits" :class="creditMove" :aria-label="`${save.credits} crédits`"><span aria-hidden="true">₡ {{ shownCredits }}</span></span>
        <button v-if="!installed" type="button" class="settings-button" :aria-label="fullscreen ? 'Quitter le plein écran' : 'Plein écran'"
          :aria-pressed="fullscreen" @click="toggleFullscreen">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path v-if="fullscreen" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/><path v-else d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>
          </svg>
        </button>
        <button type="button" class="settings-button" aria-label="Réglages" @click="settings?.showModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6m8 0v6m-6 0v6"/></svg>
        </button>
      </div>
    </header>

    <p v-if="storageWarning" class="storage-warning" role="alert">La sauvegarde locale est indisponible. La collection peut être perdue au rechargement.</p>

    <HomeView v-if="screen === 'home'" @go="go" />
    <ShopView v-else-if="screen === 'shop'" @open="go('booster')" />
    <BoosterView v-else-if="screen === 'booster'" @garage="go('garage')" @shop="go('shop')" @inspect="inspect" />
    <GarageView v-else-if="screen === 'garage'" @inspect="inspect" />
    <RaceView v-else @inspect="inspect" @go="go" />

    <nav class="tabbar" aria-label="Navigation principale">
      <button v-for="tab in tabs" :key="tab.id" type="button" :aria-current="screen === tab.id || (tab.id === 'shop' && screen === 'booster') ? 'page' : undefined"
        @click="go(tab.id)">
        <span class="tab-icon" aria-hidden="true">{{ tab.icon }}</span>{{ tab.label }}
        <span v-if="tab.id === 'race' && save.duel" class="tab-dot" aria-label="course en cours"></span>
      </button>
    </nav>

    <canvas ref="fx" class="fx-canvas" aria-hidden="true"></canvas>
    <div v-if="toast" :key="toast.text" class="toast" :class="toast.tone" role="status">{{ toast.text }}</div>

    <dialog ref="settings" class="modal settings-modal">
      <form method="dialog"><button class="close-modal" aria-label="Fermer les réglages">×</button></form>
      <h2>Réglages</h2>
      <label class="setting"><span>Son</span><input type="checkbox" :checked="save.preferences.sound" @change="toggleSetting('sound')" /></label>
      <label class="setting"><span>Mouvement réduit</span><input type="checkbox" :checked="reducedMotion" :disabled="systemReduced" @change="toggleSetting('reducedMotion')" /></label>
      <p v-if="systemReduced" class="setting-note">Activé dans les réglages du système.</p>
      <label class="setting"><span>Vibrations</span><input type="checkbox" :checked="save.preferences.vibration" @change="toggleSetting('vibration')" /></label>
      <label v-if="canFullscreen && !installed" class="setting"><span>Plein écran</span><input type="checkbox" :checked="fullscreen" @change="toggleFullscreen" /></label>
      <p v-else-if="!installed" class="setting-note">Plein écran sur iPhone : dans Safari, touche Partager puis « Sur l’écran d’accueil », et lance GarageVerse depuis son icône.</p>
    </dialog>

    <dialog ref="sheet" class="modal sheet-modal" aria-label="Détail de la carte" @close="inspected = null">
      <form method="dialog"><button class="close-modal" aria-label="Fermer">×</button></form>
      <CarSheet v-if="inspected?.kind === 'car'" :id="inspected.id" :key="`c-${inspected.id}`" @open="id => inspect('car', id)" />
      <PartSheet v-else-if="inspected?.kind === 'part'" :id="inspected.id" :key="`p-${inspected.id}`" @open="id => inspect('car', id)" />
    </dialog>
  </div>
</template>
