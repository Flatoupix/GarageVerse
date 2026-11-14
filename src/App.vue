<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { boosterOrder, boosters, cardDetails, editionIds, type BoosterId, type EditionId } from './catalog'
import { collect, emptySave, ownedCopies, readSave, SAVE_KEY, tear } from './collection'
import { playCue } from './feedback'
import CardFace from './components/CardFace.vue'
import PackArt from './components/PackArt.vue'
import RevealStack from './components/RevealStack.vue'
import TearPack from './components/TearPack.vue'

type Screen = 'home' | 'booster' | 'garage'
type Setting = keyof ReturnType<typeof emptySave>['preferences']

const save = ref(emptySave())
const storageWarning = ref(false)
try { save.value = readSave(localStorage.getItem(SAVE_KEY)) } catch { storageWarning.value = true }

const screen = ref<Screen>(save.value.active ? 'booster' : 'home')
const activeId = computed(() => save.value.active)
const opening = computed(() => activeId.value ? save.value.openings[activeId.value] : undefined)
const faceUp = computed(() => opening.value?.view === 'face')
const recap = computed(() => opening.value?.view === 'recap')
const tearing = ref(false)
const stackEntering = ref(false)
const flipping = ref(false)
const cinematic = ref(false)
const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const systemReduced = ref(systemMotion.matches)
const reduced = computed(() => systemReduced.value || save.value.preferences.reducedMotion)
const settings = ref<HTMLDialogElement>()
const detail = ref<HTMLDialogElement>()
const selectedEdition = ref<EditionId>()
const selectedDetails = computed(() => selectedEdition.value && cardDetails(selectedEdition.value))
const mainHeading = ref<HTMLElement>()
const copies = computed(() => ownedCopies(save.value))
const nextBooster = computed(() => boosterOrder.find(id => !save.value.openings[id]?.collected))
const featuredBooster = computed(() => activeId.value ?? nextBooster.value ?? 'after-hours')
const showMissing = ref(false)
const groupedCopies = computed(() => {
  const counts = new Map<EditionId, number>()
  for (const { editionId } of copies.value) counts.set(editionId, (counts.get(editionId) ?? 0) + 1)
  return counts
})
const garageEditions = computed(() => showMissing.value ? editionIds : editionIds.filter(id => groupedCopies.value.has(id)))
const selectedVariants = computed(() => selectedEdition.value
  ? editionIds.filter(id => cardDetails(id).edition.cardId === selectedDetails.value?.edition.cardId && groupedCopies.value.has(id))
  : [])
const upcomingEditions = computed(() => opening.value?.editions.filter(id => !groupedCopies.value.has(id)).length ?? 0)
let tearTimer: ReturnType<typeof setTimeout> | undefined
let stackTimer: ReturnType<typeof setTimeout> | undefined

function onMotionChange(event: MediaQueryListEvent) {
  systemReduced.value = event.matches
  if (event.matches) cinematic.value = false
}
onMounted(() => systemMotion.addEventListener('change', onMotionChange))
onUnmounted(() => {
  systemMotion.removeEventListener('change', onMotionChange)
  clearTimeout(tearTimer)
  clearTimeout(stackTimer)
})

function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save.value))
    storageWarning.value = false
  } catch {
    storageWarning.value = true
  }
}

function go(destination: Screen) {
  if (destination !== 'booster') {
    flipping.value = false
    cinematic.value = false
  }
  screen.value = destination
  window.scrollTo(0, 0)
  void nextTick(() => mainHeading.value?.focus({ preventScroll: true }))
}

function startBooster(id: BoosterId) {
  if (save.value.openings[id]?.collected) return
  if (id !== activeId.value) {
    clearTimeout(tearTimer)
    clearTimeout(stackTimer)
    tearing.value = false
    stackEntering.value = false
    save.value.active = id
    flipping.value = false
    cinematic.value = false
    persist()
  }
  for (const editionId of boosters[id].editions) {
    const { edition } = cardDetails(editionId)
    for (const url of [edition.artwork, edition.drift?.backdrop, edition.drift?.car]) {
      if (url) new Image().src = url
    }
  }
  go('booster')
}

function openPack() {
  const id = activeId.value
  if (!id || opening.value) return
  tear(save.value, id)
  persist()
  if (save.value.preferences.sound) playCue('tear')
  if (save.value.preferences.vibration && !reduced.value) navigator.vibrate?.(25)
  if (reduced.value) {
    focusRevealAction()
    return
  }
  tearing.value = true
  tearTimer = setTimeout(() => {
    tearing.value = false
    stackEntering.value = !reduced.value
    focusRevealAction()
    stackTimer = setTimeout(() => { stackEntering.value = false }, 420)
  }, 405)
}

function focusRevealAction() {
  void nextTick(() => {
    document.querySelector<HTMLButtonElement>('.stack-actions .primary')?.focus({ preventScroll: true })
  })
}

function flipCard() {
  const id = activeId.value
  const current = opening.value
  if (!id || !current || faceUp.value || current.revealed >= current.editions.length) return
  const special = Boolean(cardDetails(current.editions[current.revealed]).edition.drift)
  current.revealed++
  current.view = 'face'
  flipping.value = !reduced.value
  cinematic.value = special && !reduced.value
  persist()
  focusRevealAction()
  if (save.value.preferences.sound) playCue(special ? 'drift' : 'flip')
  if (special && save.value.preferences.vibration && !reduced.value) navigator.vibrate?.([22, 45, 35])
}

function nextCard() {
  const current = opening.value
  if (!current || current.view !== 'face') return
  current.view = current.revealed === current.editions.length ? 'recap' : 'back'
  flipping.value = false
  cinematic.value = false
  persist()
  if (current.view === 'recap') go('booster')
  else focusRevealAction()
}

function quickReveal() {
  const current = opening.value
  if (!current) return
  current.revealed = current.editions.length
  current.view = 'recap'
  flipping.value = false
  cinematic.value = false
  persist()
  go('booster')
}

function sendToGarage() {
  const id = activeId.value
  if (!id || opening.value?.revealed !== 5) return
  collect(save.value, id)
  persist()
  if (save.value.preferences.sound) playCue('collect')
  go('garage')
}

function toggleSetting(key: Setting) {
  save.value.preferences[key] = !save.value.preferences[key]
  if (reduced.value) cinematic.value = false
  persist()
}

function showCard(id: EditionId) {
  selectedEdition.value = id
  detail.value?.showModal()
}
</script>

<template>
  <div class="app-shell" :class="{ 'motion-reduced': reduced }">
    <header class="topbar">
      <button class="brand" type="button" @click="go('home')" aria-label="GarageVerse, accueil">
        <span class="brand-mark" aria-hidden="true">↗</span><span>GARAGE<span class="brand-accent">VERSE</span></span>
      </button>
      <nav aria-label="Navigation principale">
        <button type="button" class="nav-link" :aria-current="screen === 'garage' ? 'page' : undefined" @click="go('garage')">Garage <span class="nav-count">{{ copies.length }}</span></button>
        <button type="button" class="settings-button" aria-label="Réglages" @click="settings?.showModal()">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6m8 0v6m-6 0v6"/></svg>
        </button>
      </nav>
    </header>

    <p v-if="storageWarning" class="storage-warning" role="alert">La sauvegarde locale est indisponible. La collection peut être perdue au rechargement.</p>

    <main v-if="screen === 'home'" class="home">
      <section class="hero" aria-labelledby="home-title">
        <div class="hero-picture"></div>
        <div class="hero-content">
          <span class="eyebrow"><span></span> Collection 001</span>
          <h1 id="home-title" ref="mainHeading" tabindex="-1">Ton garage.<br /><em>Tes légendes.</em></h1>
          <p>Déchire un booster. Découvre cinq cartes automobiles et retrouve-les dans ton garage.</p>
          <button v-if="nextBooster" type="button" class="button primary" @click="startBooster(featuredBooster)">
            {{ activeId ? 'Reprendre le booster' : featuredBooster === 'standard' ? 'Ouvrir un booster' : 'Ouvrir un autre booster' }}
            <span aria-hidden="true">↗</span>
          </button>
          <button v-else type="button" class="button primary" @click="go('garage')">Voir mon garage <span aria-hidden="true">↗</span></button>
        </div>
      </section>
      <section class="home-packs" aria-labelledby="boosters-title">
        <h2 id="boosters-title">Boosters</h2>
        <div class="pack-options">
          <button v-for="id in boosterOrder" :key="id" type="button" class="pack-option" :disabled="save.openings[id]?.collected"
            @click="startBooster(id)">
            <span class="mini-pack"><PackArt :booster="id" /></span>
            <span><strong>{{ boosters[id].name }}</strong><small>{{ save.openings[id]?.collected ? 'Dans le garage' : save.openings[id] ? 'À reprendre' : boosters[id].finish }}</small></span>
            <span class="option-arrow" aria-hidden="true">↗</span>
          </button>
        </div>
      </section>
    </main>

    <main v-else-if="screen === 'booster' && activeId" class="play">
      <div class="play-heading">
        <button type="button" class="back-link" @click="go('home')"><span aria-hidden="true">←</span> Accueil</button>
        <span class="eyebrow">{{ boosters[activeId].finish }}</span>
        <h1 ref="mainHeading" tabindex="-1">{{ recap ? 'Tes cinq cartes' : boosters[activeId].name }}</h1>
      </div>
      <div v-if="!opening || tearing" class="sealed-stage" :class="{ 'night-stage': activeId === 'after-hours' }">
        <div class="pack-spotlight"></div>
        <TearPack :key="activeId" :booster="activeId" :torn="tearing" :reduced="reduced" @tear="openPack" />
        <div class="sealed-actions" :class="{ 'actions-hidden': tearing }">
          <p>Glisse le doigt le long du bord supérieur.</p>
          <button type="button" class="button primary" :disabled="tearing" @click="openPack">Ouvrir le sachet <span aria-hidden="true">↗</span></button>
        </div>
      </div>
      <div v-else-if="recap" class="recap">
        <p class="recap-progress">{{ upcomingEditions }} {{ upcomingEditions === 1 ? 'nouvelle édition' : 'nouvelles éditions' }} pour ton garage</p>
        <div class="recap-grid">
          <button v-for="(id, index) in opening.editions" :key="index" type="button" class="card-tile" @click="showCard(id)">
            <CardFace :edition-id="id" />
            <span v-if="!groupedCopies.has(id)" class="tile-tag">Nouveau</span>
          </button>
        </div>
        <button type="button" class="button primary" @click="sendToGarage">Ajouter au garage <span aria-hidden="true">→</span></button>
      </div>
      <RevealStack v-else :opening="opening" :face-up="faceUp" :flipping="flipping && !reduced" :entering="stackEntering" :cinematic="cinematic && !reduced"
        @flip="flipCard" @next="nextCard" @quick="quickReveal" />
    </main>

    <main v-else class="garage">
      <div class="garage-heading">
        <span class="eyebrow"><span></span> Collection 001</span>
        <h1 ref="mainHeading" tabindex="-1">Mon garage</h1>
        <p>{{ copies.length }} {{ copies.length === 1 ? 'exemplaire' : 'exemplaires' }}</p>
      </div>
      <div class="collection-progress">
        <div><strong>Éditions découvertes</strong><span>{{ groupedCopies.size }} / {{ editionIds.length }}</span></div>
        <progress :value="groupedCopies.size" :max="editionIds.length" aria-label="Éditions découvertes"></progress>
        <label class="missing-toggle"><input type="checkbox" v-model="showMissing" /> Afficher les éditions manquantes</label>
      </div>
      <div v-if="garageEditions.length" class="garage-grid">
        <template v-for="id in garageEditions" :key="id">
          <button v-if="groupedCopies.has(id)" type="button" class="card-tile" @click="showCard(id)">
            <CardFace :edition-id="id" />
            <span v-if="(groupedCopies.get(id) ?? 0) > 1" class="copy-count">×{{ groupedCopies.get(id) }}</span>
          </button>
          <div v-else class="missing-card">
            <span>001 / {{ cardDetails(id).card.number }}</span>
            <strong>{{ cardDetails(id).vehicle.name }}</strong>
            <span>{{ cardDetails(id).edition.style }}</span>
          </div>
        </template>
      </div>
      <p v-else class="garage-empty">Les cartes de ton premier booster apparaîtront ici.</p>
      <button v-if="nextBooster" type="button" class="button primary" @click="startBooster(featuredBooster)">
        {{ activeId ? 'Reprendre le booster' : copies.length ? 'Ouvrir un autre booster' : 'Ouvrir un booster' }} <span aria-hidden="true">↗</span>
      </button>
    </main>

    <dialog ref="settings" class="modal settings-modal">
      <form method="dialog"><button class="close-modal" aria-label="Fermer les réglages">×</button></form>
      <h2>Réglages</h2>
      <label class="setting"><span>Son</span><input type="checkbox" :checked="save.preferences.sound" @change="toggleSetting('sound')" /></label>
      <label class="setting"><span>Mouvement réduit</span><input type="checkbox" :checked="reduced" :disabled="systemReduced" @change="toggleSetting('reducedMotion')" /></label>
      <p v-if="systemReduced" class="setting-note">Activé dans les réglages du système.</p>
      <label class="setting"><span>Vibrations</span><input type="checkbox" :checked="save.preferences.vibration" @change="toggleSetting('vibration')" /></label>
    </dialog>

    <dialog ref="detail" class="modal detail-modal" aria-label="Détail de la carte">
      <form method="dialog"><button class="close-modal" aria-label="Fermer la carte">×</button></form>
      <CardFace v-if="selectedEdition" :edition-id="selectedEdition" />
      <div v-if="selectedVariants.length > 1" class="edition-picker" aria-label="Éditions possédées">
        <button v-for="id in selectedVariants" :key="id" type="button" :aria-pressed="id === selectedEdition" @click="selectedEdition = id">{{ cardDetails(id).edition.style }}</button>
      </div>
      <p v-if="selectedDetails && selectedDetails.card.culture" class="detail-culture">Aura culturelle permanente · {{ selectedDetails.card.culture.work }}</p>
      <p v-if="selectedDetails" class="detail-culture">{{ selectedDetails.card.signature.description }}</p>
    </dialog>
  </div>
</template>
