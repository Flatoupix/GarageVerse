<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { persist, reducedMotion, save, storageWarning, systemReduced, toast } from './game/store'
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

function go(destination: Screen) {
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
        <span class="credits" aria-label="Crédits"><span aria-hidden="true">₡</span> {{ save.credits }}</span>
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

    <div v-if="toast" class="toast" :class="toast.tone" role="status">{{ toast.text }}</div>

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
