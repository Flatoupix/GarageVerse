<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { t } from '../i18n'
import { partById, vehicleById } from '../game/data'
import { reducedMotion } from '../game/store'
import type { Opening } from '../game/save'
import CardBackFace from './CardBackFace.vue'
import PullCard from './PullCard.vue'

const props = defineProps<{ opening: Opening; faceUp: boolean; flipping: boolean; entering: boolean; cinematic: boolean; tell?: string; glow?: string }>()
const emit = defineEmits<{ flip: []; next: []; quick: []; swipe: [] }>()

const slot = computed(() => props.faceUp ? props.opening.revealed - 1 : props.opening.revealed)
const pull = computed(() => props.opening.pulls[slot.value])
const title = computed(() => pull.value.kind === 'car'
  ? `${vehicleById.get(pull.value.id)!.name} · ${t(vehicleById.get(pull.value.id)!.rarity)}`
  : `${partById.get(pull.value.id)!.name} · ${t('Mécanique')}`)
const total = computed(() => props.opening.pulls.length)
// Le geste reste local à la pile ; la progression passe toujours par BoosterView.
const offset = ref(0)
const dragging = ref(false)
const leaving = ref(false)
let pointer: number | undefined
let startX = 0
let startY = 0
let started = 0
let width = 1
let horizontal = false
let timer: ReturnType<typeof setTimeout> | undefined
const gestureStyle = computed(() => ({
  '--swipe-x': `${offset.value}px`,
  '--swipe-angle': `${reducedMotion.value ? 0 : offset.value / width * 16}deg`,
}))

function resetGesture() {
  clearTimeout(timer)
  pointer = undefined
  dragging.value = false
  leaving.value = false
  horizontal = false
  offset.value = 0
}
watch(() => [props.opening.revealed, props.opening.view], resetGesture)
onUnmounted(resetGesture)

function pointerDown(event: PointerEvent) {
  if (!props.faceUp || leaving.value || pointer !== undefined || !event.isPrimary || event.button !== 0) return
  const target = event.currentTarget as HTMLElement
  pointer = event.pointerId
  startX = event.clientX
  startY = event.clientY
  started = event.timeStamp
  width = target.getBoundingClientRect().width
  target.setPointerCapture(event.pointerId)
}

function pointerMove(event: PointerEvent) {
  if (pointer !== event.pointerId) return
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  if (!horizontal) {
    if (Math.abs(dy) > Math.max(8, Math.abs(dx))) { resetGesture(); return }
    if (Math.abs(dx) < 8) return
    horizontal = true
    dragging.value = true
  }
  offset.value = dx
}

function pointerEnd(event: PointerEvent) {
  if (pointer !== event.pointerId) return
  const dx = event.clientX - startX
  const elapsed = Math.max(1, event.timeStamp - started)
  const accepted = horizontal && (Math.abs(dx) >= width * .3 || (Math.abs(dx) >= 24 && Math.abs(dx) / elapsed > .6))
  pointer = undefined
  dragging.value = false
  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
  if (!accepted) { offset.value = 0; return }
  if (reducedMotion.value) { resetGesture(); emit('swipe'); return }
  leaving.value = true
  offset.value = Math.sign(dx) * (window.innerWidth + width)
  timer = setTimeout(() => { resetGesture(); emit('swipe') }, 240)
}

function pointerCancel(event: PointerEvent) {
  if (pointer === event.pointerId) resetGesture()
}
</script>

<template>
  <div class="reveal booster-stage" :class="{ 'stack-entering': entering }">
    <div class="booster-art">
      <div class="stack-stage" :class="glow && `glow-${glow}`">
        <div v-if="glow === 'legendary' || glow === 'epic'" class="stage-rays" aria-hidden="true"></div>
        <div class="card-stack" :class="{ 'swipe-dragging': dragging, 'swipe-leaving': leaving, 'swipe-ready': faceUp }"
          :style="gestureStyle" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerEnd"
          @pointercancel="pointerCancel" @lostpointercapture="pointerCancel" @dragstart.prevent>
          <div v-if="slot < total - 1" class="stack-edge" aria-hidden="true"></div>
          <div class="swipe-card">
            <div :key="slot" class="flip-card" :class="{ 'is-flipping': flipping }">
              <button v-if="!faceUp" type="button" class="card-back has-art" :class="tell && `tell-${tell}`" :aria-label="t('Retourner la carte {n}', { n: slot + 1 })" @click="$emit('flip')">
                <CardBackFace />
              </button>
              <div v-else class="card-back has-art back-decoration" aria-hidden="true">
                <CardBackFace />
              </div>
              <div v-if="faceUp" class="flip-front">
                <div><PullCard :pull="pull" :cinematic="cinematic" /></div>
                <span v-if="pull.isNew" class="new-badge">{{ t('Nouveau') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="booster-messages">
      <slot name="options" />
      <div class="stack-indicators" aria-hidden="true">
        <span v-for="position in total" :key="position" :class="{ revealed: position <= opening.revealed, current: position === slot + 1 }"></span>
      </div>
      <p class="stack-status" role="status">{{ faceUp ? title : t('Carte {n} sur {total}', { n: slot + 1, total }) }}</p>
      <slot v-if="faceUp" name="edition" />
      <p v-if="faceUp && opening.revealed === 1" class="swipe-hint">{{ t('Glisse la carte pour passer à la suivante') }}</p>
    </div>
    <div class="stack-actions booster-actions" :class="{ 'booster-actions-split': $slots['edition-actions'] }">
      <slot name="edition-actions">
        <button v-if="faceUp" type="button" class="button primary" :disabled="leaving" @click="$emit('next')">
          {{ opening.revealed === total ? t('Voir le récapitulatif') : t('Carte suivante') }} <span aria-hidden="true">→</span>
        </button>
        <button v-else type="button" class="button primary" :disabled="leaving" @click="$emit('flip')">
          {{ t('Retourner la carte') }} <span aria-hidden="true">↻</span>
        </button>
      </slot>
      <button v-if="opening.revealed < total" type="button" class="button quiet" :disabled="leaving" @click="$emit('quick')">{{ t('Tout révéler') }}</button>
    </div>
  </div>
</template>
