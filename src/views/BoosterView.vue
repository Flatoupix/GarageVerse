<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { edition } from '../game/art'
import { boosterById, partById, rarityClass, vehicleById, type Rarity } from '../game/data'
import { confetti, flash, palettes, rarityPalette, ring, shake, sparks } from '../game/fx'
import { collect, tear, type Pull } from '../game/save'
import { buzz, persist, reducedMotion as reduced, save, sound } from '../game/store'
import PullCard from '../components/PullCard.vue'
import RevealStack from '../components/RevealStack.vue'
import TearPack from '../components/TearPack.vue'

const emit = defineEmits<{ garage: []; shop: []; inspect: [kind: 'car' | 'part', id: string] }>()

const boosterId = computed(() => save.opening?.collected === false ? save.opening.booster : save.sealed ?? save.opening?.booster)
const booster = computed(() => boosterId.value ? boosterById.get(boosterId.value) : undefined)
const opening = computed(() => save.opening ?? undefined)
const faceUp = computed(() => opening.value?.view === 'face')
const recap = computed(() => opening.value?.view === 'recap')
const tearing = ref(false)
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
  if (rarity === 'Épique') { flash(colors[0], 0.28); sparks(target, colors, 46, 1.2); shake(1); buzz([15, 30, 25]); return }
  flash('#ffffff', 0.75); shake(3); sparks(target, colors, 80, 1.5); ring(target, '#ffd27a', 900); confetti(); buzz([30, 50, 40, 50, 60])
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
  tear(save, Math.random)
  persist()
  sound('tear')
  buzz(25)
  const pack = document.querySelector('.tear-pack')?.getBoundingClientRect()
  flash('#ff5fd2', 0.35); shake(2)
  if (pack) sparks({ x: pack.left + pack.width / 2, y: pack.top + pack.height * 0.1 }, [...palettes.pink, ...palettes.cyan], 44, 1.1)
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
  sound(pull.kind === 'car' && edition(pull.id, pull.style).drift ? 'drift'
    : rarity === 'Légendaire' ? 'legend' : rarity === 'Épique' ? 'epic' : rarity === 'Rare' ? 'rare' : 'flip')
  // L'explosion part quand la face apparaît, à mi-retournement.
  clearTimeout(burstTimer)
  burstTimer = setTimeout(() => celebrate(rarity), reduced.value ? 0 : 170)
}

function nextCard() {
  const current = opening.value
  if (!current || current.view !== 'face') return
  current.view = current.revealed === current.pulls.length ? 'recap' : 'back'
  flipping.value = false
  cinematic.value = false
  persist()
  if (current.view === 'recap') finish()
  else { sound('whoosh'); focusRevealAction() }
}

function quickReveal() {
  const current = opening.value
  if (!current) return
  const best = current.pulls.slice(current.revealed).map(rarityOf)
  const top = best.includes('Légendaire') ? 'Légendaire' : best.includes('Épique') ? 'Épique' : undefined
  if (top) { sound(top === 'Légendaire' ? 'legend' : 'epic'); celebrate(top, '.recap-grid') }
  current.revealed = current.pulls.length
  current.view = 'recap'
  flipping.value = false
  cinematic.value = false
  finish()
}

// Les cartes rejoignent le garage dès le récapitulatif : un rechargement ne peut pas les attribuer deux fois.
function finish() {
  if (opening.value && !opening.value.collected) {
    collect(save)
    sound('collect')
  }
  persist()
}
const newCount = computed(() => opening.value?.pulls.filter(p => p.isNew).length ?? 0)
</script>

<template>
  <main v-if="booster" class="play">
    <div class="play-heading">
      <span class="eyebrow">{{ booster.tagline }}</span>
      <h1 tabindex="-1">{{ recap ? 'Tes cinq cartes' : booster.name }}</h1>
    </div>
    <div v-if="!opening || tearing" class="sealed-stage" :class="`stage-${booster.id}`">
      <div class="pack-spotlight"></div>
      <TearPack :key="booster.id" :booster="booster.id" :torn="tearing" :reduced="reduced" @tear="openPack" />
      <div class="sealed-actions" :class="{ 'actions-hidden': tearing }">
        <p>Glisse le doigt le long du bord supérieur.</p>
        <button type="button" class="button primary" :disabled="tearing" @click="openPack">Ouvrir le sachet <span aria-hidden="true">↗</span></button>
      </div>
    </div>
    <div v-else-if="recap" class="recap">
      <p class="recap-progress">{{ newCount }} {{ newCount === 1 ? 'nouvelle carte' : 'nouvelles cartes' }} dans ton garage</p>
      <div class="recap-grid">
        <button v-for="(pull, index) in opening.pulls" :key="index" type="button" class="card-tile deal" :style="{ '--i': index }" @click="emit('inspect', pull.kind, pull.id)">
          <PullCard :pull="pull" compact />
          <span v-if="pull.isNew" class="tile-tag">Nouveau</span>
        </button>
      </div>
      <div class="recap-actions">
        <button type="button" class="button primary" @click="emit('garage')">Voir le garage <span aria-hidden="true">→</span></button>
        <button type="button" class="button quiet" @click="emit('shop')">Autre booster</button>
      </div>
    </div>
    <RevealStack v-else :opening="opening" :face-up="faceUp" :flipping="flipping && !reduced" :entering="stackEntering"
      :cinematic="cinematic && !reduced" :tell="tell" :glow="glow" @flip="flipCard" @next="nextCard" @quick="quickReveal" />
  </main>
  <main v-else class="play empty-state">
    <h1 tabindex="-1">Aucun booster en cours</h1>
    <button type="button" class="button primary" @click="emit('shop')">Choisir un booster <span aria-hidden="true">↗</span></button>
  </main>
</template>
