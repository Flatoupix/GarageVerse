<script setup lang="ts">
import { locale, locales, setLocale, t, tp, type Locale } from './i18n'
import { VERSUS_OPEN } from './game/features'
import { defineAsyncComponent, computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { enableEffects, hasMusic, refreshMusicVisibility, setMusicTrack, unlockAudio } from './audio'
import { debugTap, type DebugTaps } from './game/debug'
import { carSprite, edition, trackBackdrop } from './game/art'
import type { Rival, StatKey } from './game/data'
import { floatText, mountFx, pop, themeFx, tone, tween } from './game/fx'
import { act, buzz, pendingSeries, notify, persist, reducedMotion, save, sound, storageWarning, systemReduced, toast } from './game/store'
import { applyTheme, theme, themeGroups, themes, unlocked, type Theme } from './game/theme'
import { cardBackOf, cardBacks } from './game/cardback'
import type { CardBackId } from './game/save'
import { glossary, glossaryOpen, glossarySections, openHelp, vHelp } from './game/help'
import MechanicGuide from './components/MechanicGuide.vue'
import ReleaseNotes from './components/ReleaseNotes.vue'
import GameDaveSplash from './components/GameDaveSplash.vue'
import { replayTutorial, tutorialAction } from './game/tutorial'
import BoosterView from './views/BoosterView.vue'
import SectorRun from './components/SectorRun.vue'
import TimingGauge from './components/TimingGauge.vue'
import TurnControl from './components/TurnControl.vue'
import { turnSequence } from './game/turn'
import { shiftsPerSector, timingWindow, type TimingResult } from './game/timing'
import { timingFeedback } from './game/timing-text'
import GameLogo from './components/GameLogo.vue'
import CarSheet from './views/CarSheet.vue'
import GarageView from './views/GarageView.vue'
import HomeView from './views/HomeView.vue'
import PartSheet from './views/PartSheet.vue'
import RaceView from './views/RaceView.vue'
import ShopView from './views/ShopView.vue'
import ShowroomView from './views/ShowroomView.vue'

import { offlineReady } from './game/offline'
import { LEGACY_KEY, newSave, readSave, SAVE_KEY } from './game/save'

type Screen = 'home' | 'shop' | 'booster' | 'garage' | 'race' | 'showroom' | 'versus'
type Setting = 'turnMode' | 'timingMode' | 'touchHelp' | 'sound' | 'music' | 'reducedMotion' | 'vibration'

function initialScreen(): Screen {
  if (save.versus?.active || (VERSUS_OPEN && new URLSearchParams(location.search).has('versus'))) return 'versus'
  if (save.duel && !save.night) return 'race'
  if (save.sealed || (save.opening && save.opening.view !== 'recap')) return 'booster'
  return 'home'
}
const VersusView = defineAsyncComponent(() => import('./views/VersusView.vue'))
const networkAvailable = ref(navigator.onLine)
function updateNetwork() { networkAvailable.value = navigator.onLine }
onMounted(() => {
  window.addEventListener('online', updateNetwork)
  window.addEventListener('offline', updateNetwork)
})
onUnmounted(() => {
  window.removeEventListener('online', updateNetwork)
  window.removeEventListener('offline', updateNetwork)
})
const screen = ref<Screen>(initialScreen())
const settings = ref<HTMLDialogElement>()
const timingDemo = ref<HTMLDialogElement>()
const timingDemoOpen = ref(false)
const demoWindows = Array.from({ length: shiftsPerSector.ligne }, (_, shift) =>
  timingWindow('ligne', 'demo', 0, 6, 1, 0, 0, shift))
const demoArts = { player: edition('r4l').art, rival: edition('deuch').art }
const demoSprites = { player: carSprite('r4l'), rival: carSprite('deuch') }
const demoGauge = ref<InstanceType<typeof TimingGauge>>()
const demoFeedback = ref<{ tag: string; good: boolean; count: number } | null>(null)
function demoJudgment(result: TimingResult) {
  demoFeedback.value = {
    tag: timingFeedback(result.zone), good: result.modifier >= 0, count: (demoFeedback.value?.count ?? 0) + 1,
  }
}
function showTimingDemo() {
  demoFeedback.value = null
  timingDemo.value?.showModal()
  timingDemoOpen.value = true
}
const turnDemo = ref<HTMLDialogElement>()
const turnDemoOpen = ref(false)
const demoTurns = turnSequence('demo', 0, 'demo', { perfect: 100, good: 230, acceptance: 410 })
const turnAttempt = ref(0)
function showTurnDemo() {
  turnDemo.value?.showModal()
  turnAttempt.value++
  turnDemoOpen.value = true
}
const saveFile = ref<HTMLInputElement>()
const transferMessage = ref('')
function transferFeedback(text: string, error = false) {
  transferMessage.value = text
  sound(error ? 'error' : 'collect')
  const box = settings.value?.getBoundingClientRect()
  if (box) floatText({ x: box.left + box.width / 2, y: box.top + 70 }, error ? t('Échec') : t('Sauvegarde'), error ? tone.rose : tone.cyan, 16)
}
function exportSave() {
  let url: string | undefined
  try {
    url = URL.createObjectURL(new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `garageverse-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    transferFeedback(t('Ta sauvegarde a été exportée.'))
  } catch { transferFeedback(t('Impossible d’exporter ta sauvegarde. Réessaie.'), true) }
  finally { if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000) }
}
async function importSave(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const raw = await file.text()
    const data = JSON.parse(raw)
    const object = (value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value)
    if (!object(data) || data.version !== 2 || !object(data.cars) || !object(data.parts) ||
        !object(data.tickets) || !object(data.preferences) || !Array.isArray(data.lineup) ||
        !Number.isFinite(data.credits)) throw new Error('format')
    const restored = readSave(raw)
    if (!window.confirm(t('Importer cette sauvegarde ? Tu vas remplacer ta partie actuelle.'))) return
    // Écrire avant de remplacer la partie : un stockage indisponible laisse le garage intact.
    localStorage.setItem(SAVE_KEY, JSON.stringify(restored))
    Object.assign(save, restored)
    applyTheme(save.preferences.theme)
    themeFx(save.preferences.theme)
    inspected.value = null
    screen.value = initialScreen()
    transferFeedback(t('Ta sauvegarde a été importée.'))
  } catch { transferFeedback(t('Import impossible : choisis une sauvegarde GarageVerse valide et vérifie que le stockage est disponible.'), true) }
}
// Remise à zéro complète : nouvelle partie, réglages compris. Le rechargement repart d'un état propre.
function resetGame() {
  if (!window.confirm(t('Tout remettre à zéro ? Voitures, pièces, crédits, progression et réglages seront effacés. Exporte ta sauvegarde avant si tu veux la garder.'))) return
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(newSave()))
    localStorage.removeItem(LEGACY_KEY)
    location.reload()
  } catch { transferFeedback(t('Remise à zéro impossible : le stockage du navigateur est indisponible.'), true) }
}
type SettingsTab = 'parameters' | 'themes' | 'help'
const settingsTab = ref<SettingsTab>('parameters')
const settingsTabs: { id: SettingsTab; label: string }[] = [
  { id: 'parameters', label: t('Paramètres') }, { id: 'themes', label: t('Thèmes') }, { id: 'help', label: t('Aide') },
]
function showSettings(tab: SettingsTab = 'parameters') {
  openHelp.value = null
  selectSettingsTab(tab)
  if (!settings.value?.open) settings.value?.showModal()
}
function selectSettingsTab(tab: SettingsTab) {
  settingsTab.value = tab
  document.getElementById('settings-content')?.scrollTo(0, 0)
}
function settingsTabKey(event: KeyboardEvent, index: number) {
  const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1
  if (next < 0) return
  event.preventDefault()
  const tab = settingsTabs[next]!
  selectSettingsTab(tab.id)
  document.getElementById('settings-tab-' + tab.id)?.focus()
}
let debugTaps: DebugTaps = { count: 0, lastTap: null }
function brandClick() {
  go('home')
  // Raccourci de test, actif aussi dans le jeu publié : 14 appuis rapides sur le logo.
  const result = debugTap(debugTaps, performance.now())
  debugTaps = result.state
  if (result.triggered && !save.versus) { act(s => { s.credits += 1000 }, 'Debug : +1 000 crédits'); sound('debugCredits') }
}
// Showroom caché : 7 appuis rapides sur le numéro de version, en bas des Réglages.
let showroomTaps: DebugTaps = { count: 0, lastTap: null }
function versionTap() {
  const result = debugTap(showroomTaps, performance.now(), 7)
  showroomTaps = result.state
  if (!result.triggered) return
  settings.value?.close()
  go('showroom')
  sound('legend')
}
const bubble = ref<HTMLElement>()
const sheet = ref<HTMLDialogElement>()
const inspected = ref<{ kind: 'car' | 'part'; id: string; circuit?: Rival['circuit']; suggestedStat?: StatKey; showCard?: boolean } | null>(null)
const tabs: { id: Screen; label: string; icon: string }[] = [
  // Tracés 24 × 24 : maison, sachet de cartes, porte de garage, drapeau à damier.
  { id: 'home', label: t('Accueil'), icon: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5' },
  { id: 'shop', label: t('Boosters'), icon: 'M6 3.5h12v17H6zM6 7h12M6 17h12M12 9.8l.9 1.8 2 .3-1.5 1.4.4 2-1.8-.9-1.8.9.4-2-1.5-1.4 2-.3z' },
  { id: 'garage', label: t('Garage'), icon: 'M3 20V9.5L12 4l9 5.5V20M6.5 20v-8h11v8M6.5 14.7h11M6.5 17.4h11' },
  { id: 'race', label: t('Course'), icon: 'M5 21V3.5M5 4.5h14v9H5M9.7 4.5v9M14.3 4.5v9M5 9h14' },
]

watch(() => save.opening?.collected, collected => { if (collected) tutorialAction(0, 2) })
watch(() => save.preferences.sound, enableEffects, { immediate: true })
watch(
  () => save.preferences.music && hasMusic ? (screen.value === 'race' && save.duel ? 'race' : 'garage') : undefined,
  setMusicTrack,
  { immediate: true },
)

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
    `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`, delta > 0 ? tone.gold : tone.rose, 18)
  if (delta > 0) sound('coin')
  pop(wallet.value, 1.18)
  stopCredits = tween(shownCredits.value, now, 600, v => { shownCredits.value = v }, () => { creditMove.value = null })
})

function onAudioGesture() {
  if (save.preferences.sound || (hasMusic && save.preferences.music)) unlockAudio()
}

function onControlClick(event: MouseEvent) {
  onAudioGesture()
  if (!(event.target instanceof Element)) return
  const control = event.target.closest('button, [role="radio"], label:is(.setting, .theme-option, .nitro-toggle, .missing-toggle) input')
  if (control && !control.matches(':disabled, [aria-disabled="true"]')) { sound('tap'); buzz(6) }
}

onMounted(() => {
  document.addEventListener('click', closeHelp)
  document.addEventListener('click', onControlClick, true)
  document.addEventListener('pointerup', onAudioGesture, true)
  document.addEventListener('keydown', onAudioGesture, true)
  document.addEventListener('visibilitychange', refreshMusicVisibility)
  document.addEventListener('keydown', onKey, true)
  addEventListener('scroll', onScroll, true)
  addEventListener('resize', onResize)
  if (fx.value) mountFx(fx.value)
})

function go(destination: Screen) {
  toast.value = null
  if (destination === 'shop' || destination === 'booster') tutorialAction(0, 1)
  if (destination === 'race') tutorialAction(2, 3)
  if (screen.value === 'versus' && destination !== 'versus') {
    const url = new URL(location.href)
    url.searchParams.delete('versus')
    history.replaceState(history.state, '', url)
  }
  screen.value = destination
  window.scrollTo(0, 0)
  void nextTick(() => document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true }))
}

function inspect(kind: 'car' | 'part', id: string, circuit?: Rival['circuit'], suggestedStat?: StatKey) {
  inspected.value = { kind, id, circuit, suggestedStat, showCard: screen.value === 'booster' || (screen.value === 'garage' && !circuit && !suggestedStat) }
  if (!sheet.value?.open) sheet.value?.showModal()
  sheet.value?.scrollTo(0, 0)
}

// Plein écran : API Fullscreen (Android, ordinateur) ; sur iPhone, seule l'app ajoutée à l'écran d'accueil s'ouvre sans barre.
const installed = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const canFullscreen = document.fullscreenEnabled
const fullscreen = ref(Boolean(document.fullscreenElement))
document.addEventListener('fullscreenchange', () => { fullscreen.value = Boolean(document.fullscreenElement) })

async function toggleFullscreen() {
  if (!canFullscreen) { showSettings(); return }
  try {
    if (document.fullscreenElement) return await document.exitFullscreen()
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    await (window.screen.orientation as { lock?: (o: string) => Promise<void> }).lock?.('portrait').catch(() => {})
  } catch {
    // Le navigateur peut refuser sans geste utilisateur valide : on reste en fenêtre.
  }
}

// Version du jeu (semver), lue dans package.json au build et affichée en bas des Réglages.
const appVersion = __APP_VERSION__
const releaseNotes = ref<InstanceType<typeof ReleaseNotes>>()
// Splash GAMEDAVE à chaque lancement ; les navigateurs pilotés par un outil de test (orchestrateur) le sautent.
const splash = ref(!navigator.webdriver)
function showReleaseNotes() {
  settings.value?.close()
  releaseNotes.value?.openAll()
}
// Liste des Réglages rangée par groupes ; chaque thème n'apparaît qu'une fois.
const themeLists = themeGroups.map(group => ({ title: group.title, items: themes.filter(th => group.ids.includes(th.id)) }))
const expandedGroups = ref<string[]>([themeLists.find(group => group.items.some(th => th.id === theme.value))!.title])
function toggleThemeGroup(title: string) {
  expandedGroups.value = expandedGroups.value.includes(title) ? expandedGroups.value.filter(open => open !== title) : [...expandedGroups.value, title]
}
// Un thème débloqué en cours de partie est annoncé une fois.
const openThemes = computed(() => themes.filter(th => unlocked(save, th.id)).map(th => th.id))
watch(openThemes, (now, before) => {
  const fresh = themes.find(th => now.includes(th.id) && !before.includes(th.id))
  if (fresh) setTimeout(() => { notify(t('Thème « {name} » débloqué dans les Réglages', { name: t(fresh.name) })); sound('legend') }, 2700)
})

// Aide rapide : la bulle passe au premier plan (au-dessus des fiches ouvertes) et se ferme au toucher suivant.
const helpEntry = computed(() => openHelp.value && glossary[openHelp.value.key])
const bubbleStyle = computed(() => {
  const at = openHelp.value
  if (!at) return undefined
  const half = Math.min(150, innerWidth * 0.45)
  return {
    left: `${Math.min(Math.max(at.x, half + 8), innerWidth - half - 8)}px`,
    ...(at.above ? { bottom: `${Math.max(8, innerHeight - at.y + 8)}px`, top: 'auto' } : { top: `${Math.max(8, at.y + 8)}px`, bottom: 'auto' }),
    maxHeight: `${Math.max(120, (at.above ? at.y : innerHeight - at.y) - 24)}px`,
  }
})
// Dans une fiche ouverte, la bulle se place dans la fiche : sinon le dialogue modal la rendrait inerte.
const bubbleHost = computed(() => openHelp.value?.from.closest('dialog[open]') ?? 'body')
// Attendre que la bulle ait rejoint la fiche ou la page avant de l'afficher.
watch(openHelp, async value => {
  await nextTick()
  const el = bubble.value as (HTMLElement & { showPopover?: () => void; hidePopover?: () => void }) | undefined
  if (!el?.showPopover) return
  try { if (value) { el.hidePopover!(); el.showPopover() } else el.hidePopover!() } catch { /* déjà dans l'état voulu */ }
})
function closeHelp(event: Event) {
  if (openHelp.value && !bubble.value?.contains(event.target as Node)) openHelp.value = null
}
function dismissHelp(focus = false) {
  const from = openHelp.value?.from
  openHelp.value = null
  if (focus) from?.focus()
}
const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && openHelp.value) { event.preventDefault(); dismissHelp(true) } }
const onScroll = (event: Event) => { if (!bubble.value?.contains(event.target as Node)) openHelp.value = null }
const onResize = () => { openHelp.value = null }
onUnmounted(() => {
  document.removeEventListener('click', closeHelp)
  document.removeEventListener('click', onControlClick, true)
  document.removeEventListener('pointerup', onAudioGesture, true)
  document.removeEventListener('keydown', onAudioGesture, true)
  document.removeEventListener('visibilitychange', refreshMusicVisibility)
  setMusicTrack()
  document.removeEventListener('keydown', onKey, true)
  removeEventListener('scroll', onScroll, true)
  removeEventListener('resize', onResize)
})
function showLexicon() {
  openHelp.value = null
  glossaryOpen.value = true
}
watch(glossaryOpen, open => { if (open) { showSettings('help'); glossaryOpen.value = false } })

function chooseTheme(id: Theme) {
  if (id === theme.value || !unlocked(save, id)) return
  save.preferences.theme = id
  applyTheme(id)
  themeFx(id)
  persist()
}

// Dos des cartes : quatre au choix, l'Autoroute par défaut.
const currentBack = computed(() => cardBackOf(save.preferences.cardBack).id)
function chooseCardBack(id: CardBackId) {
  if (id === currentBack.value) return
  save.preferences.cardBack = id
  persist()
}

function toggleSetting(key: Setting) {
  save.preferences[key] = !save.preferences[key]
  if (save.preferences[key] && (key === 'music' || key === 'sound')) onAudioGesture()
  persist()
}
</script>

<template>
  <div class="app-shell" :class="{ 'motion-reduced': reducedMotion }">
    <div class="sky" aria-hidden="true"><div class="sky-grid"></div></div>
    <header class="topbar">
      <button class="brand" type="button" :aria-label="t('GarageVerse, accueil')" @click="brandClick">
        <span class="brand-mark" aria-hidden="true">GV</span><GameLogo v-if="theme === 'neon'" size="bar" :flicker="false" /><span v-else>GARAGE<span class="brand-accent">VERSE</span></span>
      </button>
      <div class="wallet">
        <span ref="wallet" class="credits" :class="creditMove" :aria-label="tp('{n} crédit', '{n} crédits', save.credits)"><span aria-hidden="true">₡ {{ shownCredits }}</span></span>
        <button v-if="!installed" type="button" class="settings-button fullscreen-button" :aria-label="fullscreen ? t('Quitter le plein écran') : t('Plein écran')"
          :aria-pressed="fullscreen" @click="toggleFullscreen">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path v-if="fullscreen" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/><path v-else d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>
          </svg>
        </button>
        <button type="button" class="settings-button" :aria-label="t('Réglages')" @click="showSettings()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6m8 0v6m-6 0v6"/></svg>
        </button>
      </div>
    </header>

    <p v-if="storageWarning" class="storage-warning" role="alert">{{ t('La sauvegarde locale est indisponible. La collection peut être perdue au rechargement.') }}</p>

    <MechanicGuide />
    <ReleaseNotes ref="releaseNotes" :ready="!splash" />
    <GameDaveSplash v-if="splash" @done="splash = false" />

    <HomeView v-if="screen === 'home'" @go="go" />
    <ShopView v-else-if="screen === 'shop'" @open="go('booster')" />
    <BoosterView v-else-if="screen === 'booster'" @garage="go('garage')" @shop="go('shop')" @inspect="inspect" />
    <GarageView v-else-if="screen === 'garage'" @inspect="inspect" />
    <ShowroomView v-else-if="screen === 'showroom'" @close="go('home')" />
    <main v-else-if="screen === 'versus'" class="race">
      <VersusView v-if="networkAvailable" @back="go('home')" />
      <section v-else>
        <button class="button quiet" @click="go('home')">{{ t('← Accueil') }}</button>
        <h1>Versus</h1><p role="status">{{ t('Connexion nécessaire') }}</p>
      </section>
    </main>
    <RaceView v-else @inspect="inspect" @go="go" />

    <nav class="tabbar" :aria-label="t('Navigation principale')">
      <button v-for="tab in tabs" :key="tab.id" type="button" :aria-current="screen === tab.id || (tab.id === 'home' && screen === 'versus') || (tab.id === 'shop' && screen === 'booster') ? 'page' : undefined"
        @click="go(tab.id)">
        <span class="tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="tab.icon" /></svg></span>{{ tab.label }}
        <span v-if="tab.id === 'garage' && pendingSeries.length" class="tab-dot" :aria-label="t('Récompense de série à récupérer')"></span>
        <span v-if="tab.id === 'race' && save.duel" class="tab-dot" :aria-label="t('course en cours')"></span>
      </button>
    </nav>

    <canvas ref="fx" class="fx-canvas" aria-hidden="true"></canvas>
    <div v-if="toast" :key="toast.text" class="toast" :class="toast.tone" role="status">{{ toast.text }}</div>

    <Teleport :to="bubbleHost">
    <div ref="bubble" popover="manual" class="help-bubble" :style="bubbleStyle" role="dialog" :aria-label="t('Explication')">
      <template v-if="helpEntry">
        <button type="button" class="help-close" :aria-label="t('Fermer l’explication')" @click="dismissHelp(true)">×</button>
        <b>{{ t(helpEntry.term) }}</b>
        <p>{{ t(helpEntry.text) }}</p>
        <button type="button" class="link" @click="showLexicon">{{ t('Tout le lexique') }}</button>
      </template>
    </div>
    </Teleport>

    <dialog ref="settings" class="modal settings-modal" :aria-label="t('Réglages')">
      <form method="dialog"><button class="close-modal" :aria-label="t('Fermer les réglages')">×</button></form>
      <h2>{{ t('Réglages') }}</h2>
      <div class="settings-tabs" role="tablist" :aria-label="t('Réglages')">
        <button v-for="(tab, index) in settingsTabs" :id="'settings-tab-' + tab.id" :key="tab.id" type="button" role="tab"
          :aria-selected="settingsTab === tab.id" :aria-controls="'settings-panel-' + tab.id" :tabindex="settingsTab === tab.id ? 0 : -1"
          @click="selectSettingsTab(tab.id)" @keydown="settingsTabKey($event, index)">{{ tab.label }}</button>
      </div>
      <div id="settings-content" class="settings-content">
        <div v-show="settingsTab === 'parameters'" id="settings-panel-parameters" role="tabpanel" aria-labelledby="settings-tab-parameters">
          <fieldset class="language-picker">
            <legend>{{ t('Langue') }}</legend>
            <label v-for="l in locales" :key="l.id" class="setting"><span :lang="l.id">{{ l.name }}</span>
              <input type="radio" name="language" :value="l.id" :checked="locale === l.id" @change="setLocale(l.id as Locale)" /></label>
          </fieldset>
          <label class="setting"><span>{{ t('Mode timing (expérimental)') }}</span><input type="checkbox" :checked="save.preferences.timingMode" @change="toggleSetting('timingMode')" /></label>
          <label class="setting"><span>{{ t('Direction dans les virages (expérimental)') }}</span><input type="checkbox"
            :checked="save.preferences.timingMode && save.preferences.turnMode" :disabled="!save.preferences.timingMode" @change="toggleSetting('turnMode')" /></label>
          <button type="button" class="button ghost wide" @click="showTurnDemo">{{ t('Démo des virages') }}</button>
          <button type="button" class="button ghost wide" @click="showTimingDemo">{{ t('Démo du passage de vitesses') }}</button>
          <button type="button" class="button ghost" @click="replayTutorial(); settings?.close(); sheet?.close(); go('home')">{{ t('Revoir le tutoriel') }}</button>
          <section class="save-transfer" :aria-label="t('Sauvegarde')">
            <p v-if="offlineReady"><span v-help="'offline'">{{ t('Disponible hors ligne') }}</span></p>
            <p><span v-help="'exportSave'">{{ t('Export de sauvegarde') }}</span> · <span v-help="'importSave'">{{ t('Import de sauvegarde') }}</span></p>
            <button type="button" class="button ghost" @click="exportSave">{{ t('Exporter la sauvegarde') }}</button>
            <button type="button" class="button ghost" @click="saveFile?.click()">{{ t('Importer une sauvegarde') }}</button>
            <input ref="saveFile" type="file" accept=".json,application/json" hidden @change="importSave" />
            <button type="button" class="button quiet" @click="resetGame">{{ t('Réinitialiser la partie') }}</button>
            <p v-if="transferMessage" role="status">{{ transferMessage }}</p>
          </section>
          <label v-if="hasMusic" class="setting"><span>{{ t('Musique') }}</span><input type="checkbox" :checked="save.preferences.music" @change="toggleSetting('music')" /></label>
          <label class="setting"><span>{{ t('Bruitages') }}</span><input type="checkbox" :checked="save.preferences.sound" @change="toggleSetting('sound')" /></label>
          <label class="setting"><span>{{ t('Mouvement réduit') }}</span><input type="checkbox" :checked="reducedMotion" :disabled="systemReduced" @change="toggleSetting('reducedMotion')" /></label>
          <p v-if="systemReduced" class="setting-note">{{ t('Activé dans les réglages du système.') }}</p>
          <label class="setting"><span>{{ t('Aide en touchant les mots soulignés') }}</span><input type="checkbox" :checked="save.preferences.touchHelp !== false" @change="toggleSetting('touchHelp')" /></label>
          <label class="setting"><span>{{ t('Vibrations') }}</span><input type="checkbox" :checked="save.preferences.vibration" @change="toggleSetting('vibration')" /></label>
          <label v-if="canFullscreen && !installed" class="setting"><span>{{ t('Plein écran') }}</span><input type="checkbox" :checked="fullscreen" @change="toggleFullscreen" /></label>
          <p v-else-if="!installed" class="setting-note">{{ t('Plein écran sur iPhone : dans Safari, touche Partager puis « Sur l’écran d’accueil », et lance GarageVerse depuis son icône.') }}</p>
          <p class="setting-note app-version"><span @click="versionTap">GarageVerse v{{ appVersion }}</span> · <button type="button" class="link" @click="showReleaseNotes">{{ t('Notes de version') }}</button></p>
        </div>
        <div v-show="settingsTab === 'themes'" id="settings-panel-themes" role="tabpanel" aria-labelledby="settings-tab-themes">
          <fieldset class="theme-picker">
            <legend>{{ t('Thème') }}</legend>
            <div v-for="(group, groupIndex) in themeLists" :key="group.title" class="theme-group" role="group" :aria-label="t(group.title)">
              <h3 class="theme-group-title"><button type="button" :aria-expanded="expandedGroups.includes(group.title)" :aria-controls="'theme-group-' + groupIndex" @click="toggleThemeGroup(group.title)">{{ t(group.title) }} <span aria-hidden="true">{{ expandedGroups.includes(group.title) ? '⌄' : '›' }}</span></button></h3>
              <div v-show="expandedGroups.includes(group.title)" :id="'theme-group-' + groupIndex" class="theme-group-items">
              <label v-for="th in group.items" :key="th.id" class="theme-option" :class="{ chosen: theme === th.id, locked: !unlocked(save, th.id) }">
                <input type="radio" name="theme" :value="th.id" :checked="theme === th.id" :disabled="!unlocked(save, th.id)" @change="chooseTheme(th.id)" />
                <span class="theme-swatch" aria-hidden="true"><i v-for="c in th.swatch" :key="c" :style="{ background: c }"></i></span>
                <span class="theme-text"><b>{{ t(th.name) }}</b>
                  <small v-if="!unlocked(save, th.id) && th.unlock" class="theme-goal">🔒 {{ t(th.unlock.goal) }} · {{ th.unlock.progress(save).join(' / ') }}</small>
                </span>
              </label>
              </div>
            </div>
          </fieldset>
          <fieldset class="back-picker">
            <legend>{{ t('Dos des cartes') }}</legend>
            <label v-for="b in cardBacks" :key="b.id" class="back-option" :class="{ chosen: currentBack === b.id }">
              <input type="radio" name="cardback" :value="b.id" :checked="currentBack === b.id" @change="chooseCardBack(b.id)" />
              <span class="back-thumb" :style="{ backgroundImage: `url(${b.art})` }" aria-hidden="true"></span>
              <span>{{ t(b.name) }}</span>
            </label>
          </fieldset>
        </div>
        <div v-show="settingsTab === 'help'" id="settings-panel-help" role="tabpanel" aria-labelledby="settings-tab-help">
          <h2>{{ t('Lexique') }}</h2>
          <p class="lexicon-intro">{{ t('Touche un mot souligné en pointillé, partout dans le jeu, pour voir son explication.') }}</p>
          <section v-for="section in glossarySections" :key="section.title" class="lexicon-section">
            <h3>{{ t(section.title) }}</h3>
            <dl><template v-for="key in section.keys" :key="key"><dt>{{ t(glossary[key].term) }}</dt><dd>{{ t(glossary[key].text) }}</dd></template></dl>
          </section>
        </div>
      </div>
    </dialog>

    <dialog ref="timingDemo" class="modal timing-modal" :aria-label="t('Démo du passage de vitesses')" @close="timingDemoOpen = false">
      <form method="dialog"><button class="close-modal" :aria-label="t('Fermer')">×</button></form>
      <h2>{{ t('Démo du passage de vitesses') }}</h2>
      <SectorRun v-if="timingDemoOpen" live="sec" :step="0" :running="false" :arts="demoArts"
        :sprites="demoSprites" :backdrop="trackBackdrop('sec')" :feedback="demoFeedback" tappable @tap="demoGauge?.shift()">
        <TimingGauge ref="demoGauge" :windows="demoWindows" demo @judgment="demoJudgment" @restart="demoFeedback = null" />
      </SectorRun>
    </dialog>

    <dialog ref="turnDemo" class="modal timing-modal" :aria-label="t('Démo des virages')" @close="turnDemoOpen = false">
      <form method="dialog"><button class="close-modal" :aria-label="t('Fermer')">×</button></form>
      <h2>{{ t('Démo des virages') }}</h2>
      <TurnControl v-if="turnDemoOpen" :key="turnAttempt" :sequence="demoTurns" demo />
      <button type="button" class="button quiet wide turn-replay" @click="turnAttempt++">{{ t('Rejouer la séquence') }}</button>
    </dialog>

    <dialog ref="sheet" class="modal sheet-modal" :aria-label="inspected?.kind === 'car' ? t('Fiche voiture') : t('Fiche pièce')" @close="inspected = null">
      <form method="dialog"><button class="close-modal" :aria-label="t('Fermer')">×</button></form>
      <CarSheet v-if="inspected?.kind === 'car'" :id="inspected.id" :circuit="inspected.circuit" :suggested-stat="inspected.suggestedStat" :show-card="inspected.showCard"
        :key="`c-${inspected.id}`" @open="id => inspect('car', id)" @close="sheet?.close()" />
      <PartSheet v-else-if="inspected?.kind === 'part'" :id="inspected.id" :key="`p-${inspected.id}`" @open="(id, stat) => inspect('car', id, undefined, stat)" />
    </dialog>
  </div>
</template>

<style scoped>
.timing-modal h2 { padding-inline-end: 36px; overflow-wrap: anywhere; }
.turn-replay { margin-top: 8px; }
</style>
