<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { t, tp } from '../i18n'
import { edition } from '../game/art'
import { boosterById, partById, rarityClass, vehicleById, type Rarity } from '../game/data'
import { confetti, flash, palettes, rarityPalette, ring, shake, sparks, tone } from '../game/fx'
import { buyBooster, collect, sealedHasLegend, openingStyle, showPullEdition, tear, type Pull } from '../game/save'
import { act, buzz, persist, reducedMotion as reduced, save, sound } from '../game/store'
import PullCard from '../components/PullCard.vue'
import RevealStack from '../components/RevealStack.vue'
import TearPack from '../components/TearPack.vue'

const emit = defineEmits<{ garage: []; shop: []; inspect: [kind: 'car' | 'part', id: string] }>()

const boosterId = computed(() => save.opening?.collected === false ? save.opening.booster : save.sealed ?? save.opening?.booster)
const booster = computed(() => boosterId.value ? boosterById.get(boosterId.value) : undefined)
const opening = computed(() => save.opening ?? undefined)
const faceUp = computed(() => opening.value?.view === 'face')
const recap = computed(() => opening.value?.view === 'recap')
const currentPull = computed(() => opening.value?.pulls[(opening.value?.revealed ?? 0) - 1])
const choosingEdition = computed(() => {
  const pull = currentPull.value
  return faceUp.value && pull?.kind === 'car' && !pull.isNew && pull.showEdition === undefined &&
    pull.style !== openingStyle(save, (opening.value?.revealed ?? 0) - 1)
})
function keepEdition() {
  const pull = currentPull.value
  if (!choosingEdition.value || pull?.kind !== 'car') return
  pull.showEdition = false
  persist()
  focusRevealAction()
}
function showEdition() {
  showPullEdition(save, (opening.value?.revealed ?? 0) - 1)
  persist()
  focusRevealAction()
}
const recapPulls = computed(() => opening.value?.pulls ?? [])
const tearing = ref(false)
// Après un achat groupé (ou avec des tickets), le récapitulatif propose d'enchaîner sur le sachet suivant.
const remaining = computed(() => boosterId.value ? save.tickets[boosterId.value] ?? 0 : 0)
function openNext() {
  const id = boosterId.value
  if (id && act(s => buyBooster(s, id))) { sound('whoosh'); window.scrollTo(0, 0) }
}
const legendaryTear = ref(false)
const legendary = computed(() => sealedHasLegend(save) || (tearing.value && legendaryTear.value))
const stackEntering = ref(false)
const flipping = ref(false)
const cinematic = ref(false)
let tearTimer: ReturnType<typeof setTimeout> | undefined
let stackTimer: ReturnType<typeof setTimeout> | undefined
let burstTimer: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => { clearTimeout(tearTimer); clearTimeout(stackTimer); clearTimeout(burstTimer) })

const rarityOf = (pull: Pull): Rarity => pull.kind === 'car' ? vehicleById.get(pull.id)!.rarity : partById.get(pull.id)!.rarity
// La carte encore face cachée trahit sa rareté par un halo, et la scène s'embrase à la révélation.
const tell = computed(() => {
  const current = opening.value
  return current && current.view === 'back' && current.revealed < current.pulls.length ? rarityClass[rarityOf(current.pulls[current.revealed])] : undefined
})
const glow = computed(() => {
  const current = opening.value
  return current && current.view === 'face' ? rarityClass[rarityOf(current.pulls[current.revealed - 1])] : undefined
})

// Plus la carte est rare, plus la révélation est spectaculaire.
function celebrate(rarity: Rarity, target = '.card-stack') {
  const colors = rarityPalette[rarity]
  if (rarity === 'Courante') { sparks(target, colors, 10, 0.6); return }
  ring(target, colors[0])
  if (rarity === 'Rare') { sparks(target, colors, 28); buzz(15); return }
  if (rarity === 'Épique') { flash(colors[0], 0.28); sparks(target, colors, 46, 1.2); shake(1, target); buzz([15, 30, 25]); return }
  flash(tone.light, 0.75); shake(3, target); sparks(target, colors, 80, 1.5); ring(target, tone.gold, 900); confetti(); buzz([30, 50, 40, 50, 60])
}

// Une carte légendaire ou une édition animée reçoit la mise en scène exceptionnelle.
function special(index: number) {
  const pull = opening.value?.pulls[index]
  if (pull?.kind !== 'car') return false
  return vehicleById.get(pull.id)!.rarity === 'Légendaire' || Boolean(edition(pull.id, pull.style).drift)
}

function focusRevealAction() {
  void nextTick(() => document.querySelector<HTMLButtonElement>('.stack-actions .primary')?.focus({ preventScroll: true }))
}

function openPack() {
  if (!save.sealed) return
  legendaryTear.value = sealedHasLegend(save)
  tear(save, Math.random)
  persist()
  sound(legendaryTear.value ? 'legend' : 'tear')
  buzz(25)
  const pack = document.querySelector('.tear-pack')?.getBoundingClientRect()
  flash(legendaryTear.value ? tone.gold : tone.rose, 0.35); shake(2, '.tear-pack')
  if (pack) sparks({ x: pack.left + pack.width / 2, y: pack.top + pack.height * 0.1 }, legendaryTear.value ? palettes.gold : [...palettes.pink, ...palettes.cyan], 44, 1.1)
  for (const pull of save.opening!.pulls) if (pull.kind === 'car') {
    const look = edition(pull.id, pull.style)
    for (const url of [look.art, look.drift?.backdrop, look.drift?.car]) if (url) new Image().src = url
  }
  if (reduced.value) { focusRevealAction(); return }
  tearing.value = true
  tearTimer = setTimeout(() => {
    tearing.value = false
    stackEntering.value = true
    focusRevealAction()
    stackTimer = setTimeout(() => { stackEntering.value = false }, 420)
  }, 405)
}

function flipCard() {
  const current = opening.value
  if (!current || faceUp.value || current.revealed >= current.pulls.length) return
  const big = special(current.revealed)
  const pull = current.pulls[current.revealed]
  current.revealed++
  current.view = 'face'
  flipping.value = !reduced.value
  cinematic.value = big && !reduced.value
  persist()
  focusRevealAction()
  const rarity = rarityOf(pull)
  const cue = pull.kind === 'car' && edition(pull.id, pull.style).drift ? 'drift'
    : rarity === 'Légendaire' ? 'revealLegend' : rarity === 'Épique' ? 'epic' : rarity === 'Rare' ? 'rare' : 'flip'
  // Le son et les particules partent ensemble quand la face apparaît.
  const reveal = () => { sound(cue); celebrate(rarity) }
  clearTimeout(burstTimer)
  if (reduced.value) reveal()
  else burstTimer = setTimeout(reveal, 170)
}

function nextCard(swiped = false) {
  const current = opening.value
  if (!current || current.view !== 'face') return
  clearTimeout(burstTimer)
  current.view = current.revealed === current.pulls.length ? 'recap' : 'back'
  flipping.value = false
  cinematic.value = false
  persist()
  if (current.view === 'recap') finish()
  else { if (!swiped) sound('whoosh'); focusRevealAction() }
}

function swipeCard() {
  sound('whoosh')
  buzz(15)
  nextCard(true)
}

function quickReveal() {
  const current = opening.value
  if (!current) return
  clearTimeout(burstTimer)
  const best = current.pulls.slice(current.revealed).map(rarityOf)
  const top = best.includes('Légendaire') ? 'Légendaire' : best.includes('Épique') ? 'Épique' : undefined
  current.revealed = current.pulls.length
  current.view = 'recap'
  flipping.value = false
  cinematic.value = false
  finish(!top)
  if (top) {
    sound(top === 'Légendaire' ? 'revealLegend' : 'epic')
    void nextTick(() => celebrate(top, '.recap-grid'))
  }
}

// Les cartes rejoignent le garage dès le récapitulatif : un rechargement ne peut pas les attribuer deux fois.
function finish(playCollectionSound = true) {
  if (opening.value && !opening.value.collected) {
    collect(save)
    if (playCollectionSound) sound('collect')
  }
  persist()
}
const newCount = computed(() => opening.value?.pulls.filter(p => p.isNew).length ?? 0)
</script>

<template>
  <main v-if="booster" class="play booster-play">
    <div class="play-heading">
      <span class="eyebrow">{{ t(booster.tagline) }}</span>
      <h1 tabindex="-1">{{ recap ? t('Tes cinq cartes') : t(booster.name) }}</h1>
    </div>
    <div v-if="!opening || tearing" class="booster-stage">
      <div class="booster-art booster-sealed-art">
        <div class="sealed-stage" :class="`stage-${booster.id}`">
          <div class="pack-spotlight"></div>
          <TearPack :key="booster.id" :booster="booster.id" :legend="legendary" :torn="tearing" :reduced="reduced" @tear="openPack" />
        </div>
      </div>
      <div class="booster-messages">
        <p v-if="!tearing">{{ t('Glisse le doigt le long du bord supérieur.') }}</p>
      </div>
      <div class="booster-actions">
        <button v-if="!tearing" type="button" class="button primary" @click="openPack">{{ t('Ouvrir le sachet') }} <span aria-hidden="true">↗</span></button>
      </div>
    </div>
    <div v-else-if="recap" class="recap booster-stage booster-recap">
      <div class="booster-art">
        <p class="recap-progress">{{ tp('{n} nouvelle carte dans ton garage', '{n} nouvelles cartes dans ton garage', newCount) }}</p>
        <div class="recap-grid">
          <button v-for="(pull, index) in recapPulls" :key="index" type="button" class="card-tile deal" :style="{ '--i': index }" @click="emit('inspect', pull.kind, pull.id)">
            <PullCard :pull="pull" compact />
            <span v-if="pull.isNew" class="tile-tag">{{ t('Nouveau') }}</span>
          </button>
        </div>
      </div>
      <div class="recap-actions booster-actions" :class="{ 'booster-actions-split': remaining }">
        <button v-if="remaining" type="button" class="button primary next-booster" :aria-label="t('Ouvrir le booster suivant, encore {n}', { n: remaining })" @click="openNext">
          {{ t('Ouvrir le suivant ({n})', { n: remaining }) }} <span aria-hidden="true">↗</span>
        </button>
        <button type="button" class="button" :class="remaining ? 'ghost' : 'primary'" @click="emit('garage')">{{ t('Voir le garage') }} <span aria-hidden="true">→</span></button>
        <button type="button" class="button quiet" @click="emit('shop')">{{ t('Autre booster') }}</button>
      </div>
    </div>
    <RevealStack v-else :opening="opening" :face-up="faceUp" :flipping="flipping && !reduced" :entering="stackEntering"
      :cinematic="cinematic && !reduced" :tell="tell" :glow="glow" @flip="flipCard" @next="nextCard()" @swipe="swipeCard" @quick="quickReveal">
      <template #edition>
        <p v-if="choosingEdition" aria-live="polite">{{ t('Tu as déjà cette voiture') }}</p>
        <p v-else-if="currentPull?.kind === 'car' && !currentPull.isNew" aria-live="polite">{{ t('Doublon : +1 exemplaire') }}</p>
      </template>
      <template v-if="choosingEdition" #edition-actions>
        <button type="button" class="button ghost" @click="keepEdition">{{ t('Garder l’apparence actuelle') }}</button>
        <button type="button" class="button primary" @click="showEdition">{{ t('Afficher cette édition') }}</button>
      </template>
    </RevealStack>
  </main>
  <main v-else class="play empty-state">
    <h1 tabindex="-1">{{ t('Aucun booster en cours') }}</h1>
    <button type="button" class="button primary" @click="emit('shop')">{{ t('Choisir un booster') }} <span aria-hidden="true">↗</span></button>
  </main>
</template>
