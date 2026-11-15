<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { enableEffects, hasMusic, refreshMusicVisibility, setMusicTrack, unlockAudio } from './audio'
import type { Rival, StatKey } from './game/data'
import { floatText, mountFx, pop, themeFx, tone, tween } from './game/fx'
import { buzz, pendingSeries, notify, persist, reducedMotion, save, sound, storageWarning, systemReduced, toast } from './game/store'
import { applyTheme, theme, themeGroups, themes, unlocked, type Theme } from './game/theme'
import { glossary, glossaryOpen, glossarySections, openHelp, vHelp } from './game/help'
import MechanicGuide from './components/MechanicGuide.vue'
import { replayTutorial, tutorialAction } from './game/tutorial'
import BoosterView from './views/BoosterView.vue'
import GameLogo from './components/GameLogo.vue'
import CarSheet from './views/CarSheet.vue'
import GarageView from './views/GarageView.vue'
import HomeView from './views/HomeView.vue'
import PartSheet from './views/PartSheet.vue'
import RaceView from './views/RaceView.vue'
import ShopView from './views/ShopView.vue'

import { offlineReady } from './game/offline'
import { readSave, SAVE_KEY } from './game/save'

type Screen = 'home' | 'shop' | 'booster' | 'garage' | 'race'
type Setting = 'touchHelp' | 'sound' | 'music' | 'reducedMotion' | 'vibration'

const screen = ref<Screen>(save.duel && !save.night ? 'race' : save.sealed || (save.opening && save.opening.view !== 'recap') ? 'booster' : 'home')
const settings = ref<HTMLDialogElement>()
const saveFile = ref<HTMLInputElement>()
const transferMessage = ref('')
function transferFeedback(text: string, error = false) {
  transferMessage.value = text
  sound(error ? 'error' : 'collect')
  const box = settings.value?.getBoundingClientRect()
  if (box) floatText({ x: box.left + box.width / 2, y: box.top + 70 }, error ? 'Échec' : 'Sauvegarde', error ? tone.rose : tone.cyan, 16)
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
    transferFeedback('Ta sauvegarde a été exportée.')
  } catch { transferFeedback('Impossible d’exporter ta sauvegarde. Réessaie.', true) }
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
    if (!window.confirm('Importer cette sauvegarde ? Tu vas remplacer ta partie actuelle.')) return
    // Écrire avant de remplacer la partie : un stockage indisponible laisse le garage intact.
    localStorage.setItem(SAVE_KEY, JSON.stringify(restored))
    Object.assign(save, restored)
    applyTheme(save.preferences.theme)
    themeFx(save.preferences.theme)
    inspected.value = null
    screen.value = save.duel && !save.night ? 'race' : save.sealed || (save.opening && save.opening.view !== 'recap') ? 'booster' : 'home'
    transferFeedback('Ta sauvegarde a été importée.')
  } catch { transferFeedback('Import impossible : choisis une sauvegarde GarageVerse valide et vérifie que le stockage est disponible.', true) }
}
const lexicon = ref<HTMLDialogElement>()
const bubble = ref<HTMLElement>()
const sheet = ref<HTMLDialogElement>()
const inspected = ref<{ kind: 'car' | 'part'; id: string; circuit?: Rival['circuit']; suggestedStat?: StatKey; showCard?: boolean } | null>(null)
const tabs: { id: Screen; label: string; icon: string }[] = [
  // Tracés 24 × 24 : maison, sachet de cartes, porte de garage, drapeau à damier.
  { id: 'home', label: 'Accueil', icon: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5' },
  { id: 'shop', label: 'Boosters', icon: 'M6 3.5h12v17H6zM6 7h12M6 17h12M12 9.8l.9 1.8 2 .3-1.5 1.4.4 2-1.8-.9-1.8.9.4-2-1.5-1.4 2-.3z' },
  { id: 'garage', label: 'Garage', icon: 'M3 20V9.5L12 4l9 5.5V20M6.5 20v-8h11v8M6.5 14.7h11M6.5 17.4h11' },
  { id: 'race', label: 'Course', icon: 'M5 21V3.5M5 4.5h14v9H5M9.7 4.5v9M14.3 4.5v9M5 9h14' },
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
  if (!canFullscreen) { settings.value?.showModal(); return }
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
// Liste des Réglages rangée par groupes ; chaque thème n'apparaît qu'une fois.
const themeLists = themeGroups.map(group => ({ title: group.title, items: themes.filter(t => group.ids.includes(t.id)) }))
// Un thème débloqué en cours de partie est annoncé une fois.
const openThemes = computed(() => themes.filter(t => unlocked(save, t.id)).map(t => t.id))
watch(openThemes, (now, before) => {
  const fresh = themes.find(t => now.includes(t.id) && !before.includes(t.id))
  if (fresh) setTimeout(() => { notify(`Thème « ${fresh.name} » débloqué dans les Réglages`); sound('legend') }, 2700)
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
watch(glossaryOpen, open => { if (open && !lexicon.value?.open) lexicon.value?.showModal() })

function chooseTheme(id: Theme) {
  if (id === theme.value || !unlocked(save, id)) return
  save.preferences.theme = id
  applyTheme(id)
  themeFx(id)
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
      <button class="brand" type="button" aria-label="GarageVerse, accueil" @click="go('home')">
        <span class="brand-mark" aria-hidden="true">GV</span><GameLogo v-if="theme === 'neon'" size="bar" :flicker="false" /><span v-else>GARAGE<span class="brand-accent">VERSE</span></span>
      </button>
      <div class="wallet">
        <span ref="wallet" class="credits" :class="creditMove" :aria-label="`${save.credits} crédits`"><span aria-hidden="true">₡ {{ shownCredits }}</span></span>
        <button type="button" class="settings-button help-button" aria-label="Lexique : comprendre les règles" @click="showLexicon">?</button>
        <button v-if="!installed" type="button" class="settings-button fullscreen-button" :aria-label="fullscreen ? 'Quitter le plein écran' : 'Plein écran'"
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

    <MechanicGuide />

    <HomeView v-if="screen === 'home'" @go="go" />
    <ShopView v-else-if="screen === 'shop'" @open="go('booster')" />
    <BoosterView v-else-if="screen === 'booster'" @garage="go('garage')" @shop="go('shop')" @inspect="inspect" />
    <GarageView v-else-if="screen === 'garage'" @inspect="inspect" />
    <RaceView v-else @inspect="inspect" @go="go" />

    <nav class="tabbar" aria-label="Navigation principale">
      <button v-for="tab in tabs" :key="tab.id" type="button" :aria-current="screen === tab.id || (tab.id === 'shop' && screen === 'booster') ? 'page' : undefined"
        @click="go(tab.id)">
        <span class="tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="tab.icon" /></svg></span>{{ tab.label }}
        <span v-if="tab.id === 'garage' && pendingSeries.length" class="tab-dot" aria-label="Récompense de série à récupérer"></span>
        <span v-if="tab.id === 'race' && save.duel" class="tab-dot" aria-label="course en cours"></span>
      </button>
    </nav>

    <canvas ref="fx" class="fx-canvas" aria-hidden="true"></canvas>
    <div v-if="toast" :key="toast.text" class="toast" :class="toast.tone" role="status">{{ toast.text }}</div>

    <Teleport :to="bubbleHost">
    <div ref="bubble" popover="manual" class="help-bubble" :style="bubbleStyle" role="dialog" aria-label="Explication">
      <template v-if="helpEntry">
        <button type="button" class="help-close" aria-label="Fermer l’explication" @click="dismissHelp(true)">×</button>
        <b>{{ helpEntry.term }}</b>
        <p>{{ helpEntry.text }}</p>
        <button type="button" class="link" @click="showLexicon">Tout le lexique</button>
      </template>
    </div>
    </Teleport>

    <dialog ref="lexicon" class="modal lexicon-modal" aria-label="Lexique" @close="glossaryOpen = false">
      <form method="dialog"><button class="close-modal" aria-label="Fermer le lexique">×</button></form>
      <h2>Lexique</h2>
      <p class="lexicon-intro">Touche un mot souligné en pointillé, partout dans le jeu, pour voir son explication.</p>
      <section v-for="section in glossarySections" :key="section.title" class="lexicon-section">
        <h3>{{ section.title }}</h3>
        <dl><template v-for="key in section.keys" :key="key"><dt>{{ glossary[key].term }}</dt><dd>{{ glossary[key].text }}</dd></template></dl>
      </section>
    </dialog>

    <dialog ref="settings" class="modal settings-modal">
      <form method="dialog"><button class="close-modal" aria-label="Fermer les réglages">×</button></form>
      <h2>Réglages</h2>
      <button type="button" class="button ghost" @click="replayTutorial(); settings?.close(); sheet?.close(); go('home')">Revoir le tutoriel</button>
      <section class="save-transfer" aria-label="Sauvegarde">
        <p v-if="offlineReady"><span v-help="'offline'">Disponible hors ligne</span></p>
        <p><span v-help="'exportSave'">Export de sauvegarde</span> · <span v-help="'importSave'">Import de sauvegarde</span></p>
        <button type="button" class="button ghost" @click="exportSave">Exporter la sauvegarde</button>
        <button type="button" class="button ghost" @click="saveFile?.click()">Importer une sauvegarde</button>
        <input ref="saveFile" type="file" accept=".json,application/json" hidden @change="importSave" />
        <p v-if="transferMessage" role="status">{{ transferMessage }}</p>
      </section>
      <fieldset class="theme-picker">
        <legend>Thème</legend>
        <div v-for="group in themeLists" :key="group.title" class="theme-group" role="group" :aria-label="group.title">
          <h3 class="theme-group-title">{{ group.title }}</h3>
          <label v-for="t in group.items" :key="t.id" class="theme-option" :class="{ chosen: theme === t.id, locked: !unlocked(save, t.id) }">
            <input type="radio" name="theme" :value="t.id" :checked="theme === t.id" :disabled="!unlocked(save, t.id)" @change="chooseTheme(t.id)" />
            <span class="theme-swatch" aria-hidden="true"><i v-for="c in t.swatch" :key="c" :style="{ background: c }"></i></span>
            <span class="theme-text"><b>{{ t.name }}</b>
              <small v-if="unlocked(save, t.id) || !t.unlock">{{ t.hint }}</small>
              <small v-else class="theme-goal">🔒 {{ t.unlock.goal }} · {{ t.unlock.progress(save).join(' / ') }}</small>
            </span>
          </label>
        </div>
      </fieldset>
      <label v-if="hasMusic" class="setting"><span>Musique</span><input type="checkbox" :checked="save.preferences.music" @change="toggleSetting('music')" /></label>
      <label class="setting"><span>Bruitages</span><input type="checkbox" :checked="save.preferences.sound" @change="toggleSetting('sound')" /></label>
      <label class="setting"><span>Mouvement réduit</span><input type="checkbox" :checked="reducedMotion" :disabled="systemReduced" @change="toggleSetting('reducedMotion')" /></label>
      <p v-if="systemReduced" class="setting-note">Activé dans les réglages du système.</p>
      <label class="setting"><span>Aide en touchant les mots soulignés</span><input type="checkbox" :checked="save.preferences.touchHelp !== false" @change="toggleSetting('touchHelp')" /></label>
      <label class="setting"><span>Vibrations</span><input type="checkbox" :checked="save.preferences.vibration" @change="toggleSetting('vibration')" /></label>
      <label v-if="canFullscreen && !installed" class="setting"><span>Plein écran</span><input type="checkbox" :checked="fullscreen" @change="toggleFullscreen" /></label>
      <p v-else-if="!installed" class="setting-note">Plein écran sur iPhone : dans Safari, touche Partager puis « Sur l’écran d’accueil », et lance GarageVerse depuis son icône.</p>
      <p class="setting-note app-version">GarageVerse v{{ appVersion }}</p>
    </dialog>

    <dialog ref="sheet" class="modal sheet-modal" :aria-label="inspected?.kind === 'car' ? 'Fiche voiture' : 'Fiche pièce'" @close="inspected = null">
      <form method="dialog"><button class="close-modal" aria-label="Fermer">×</button></form>
      <CarSheet v-if="inspected?.kind === 'car'" :id="inspected.id" :circuit="inspected.circuit" :suggested-stat="inspected.suggestedStat" :show-card="inspected.showCard"
        :key="`c-${inspected.id}`" @open="id => inspect('car', id)" @close="sheet?.close()" />
      <PartSheet v-else-if="inspected?.kind === 'part'" :id="inspected.id" :key="`p-${inspected.id}`" @open="(id, stat) => inspect('car', id, undefined, stat)" />
    </dialog>
  </div>
</template>
