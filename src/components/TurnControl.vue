<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { reducedMotion } from '../game/store'
import { signedTiming } from '../game/timing-text'
import { resolveTurn, type TurnDirection, type TurnResult, type TurnWindow } from '../game/turn'
import { turnFeedback } from '../game/turn-text'
import { t } from '../i18n'

const props = defineProps<{ direction: TurnDirection; demo?: boolean; announcement?: number; window?: TurnWindow }>()
const emit = defineEmits<{ turn: [result: TurnResult] }>()
const root = ref<HTMLElement>()
const announcement = props.announcement ?? 1600
const window = props.window ?? { start: 1250, end: 1750 }
const elapsed = ref(0)
const hidden = ref(document.hidden)
const resuming = ref(false)
const result = ref<TurnResult | null>(null)
const playable = computed(() => elapsed.value >= announcement && !result.value && !hidden.value && !resuming.value)
const position = computed(() => {
  const approach = Math.max(0, elapsed.value - announcement)
  if (reducedMotion.value) return approach < window.start ? 0 : 100 * (window.start + window.end) / 2 / window.end
  return 100 * Math.min(1, approach / window.end)
})
const phase = computed(() => {
  if (result.value) return `${turnFeedback(result.value.outcome)} · ${signedTiming(result.value.modifier)}`
  if (hidden.value || resuming.value || elapsed.value < announcement) return t('Prépare-toi')
  return elapsed.value - announcement < window.start ? t('Approche du virage') : t('Maintenant')
})

let frame = 0
let since: number | undefined
let banked = 0
let feedbackEnds = Infinity
let emitted = false
// Le mouvement réduit ralentit l’approche et prolonge aussi la fenêtre de réussite.
const speed = reducedMotion.value ? 1 / 1.8 : 1
const readClock = (now: number) => banked + (since === undefined ? 0 : Math.max(0, now - since) * speed)

function update(input: TurnDirection | null, now: number) {
  if (result.value || (since !== undefined && now < since)) return
  resuming.value = false
  elapsed.value = readClock(now)
  if (elapsed.value < announcement) return
  result.value = resolveTurn(result.value, props.direction, input, elapsed.value - announcement, window)
  if (result.value) feedbackEnds = elapsed.value + 850 * speed
}

function tick() {
  const now = performance.now()
  update(null, now)
  if (result.value && (props.demo || readClock(now) >= feedbackEnds)) {
    if (!props.demo && !emitted) {
      emitted = true
      emit('turn', result.value)
    }
    return
  }
  frame = requestAnimationFrame(tick)
}

function syncClock() {
  cancelAnimationFrame(frame)
  const now = performance.now()
  banked = readClock(now)
  since = undefined
  const wasHidden = hidden.value
  hidden.value = document.hidden
  if (!hidden.value) {
    resuming.value = wasHidden && banked >= announcement && !result.value
    since = now + (resuming.value ? 1000 : 0)
    tick()
  }
}

function steer(direction: TurnDirection) {
  if (result.value || document.hidden) return
  update(direction, performance.now())
}

function turnKey(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  if (result.value || document.hidden || readClock(performance.now()) < announcement || resuming.value || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  const target = event.target
  if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, select, textarea'))) return
  const dialog = root.value?.closest('dialog')
  if (dialog ? !(target instanceof Node && dialog.contains(target)) : document.querySelector('dialog:modal')) return
  event.preventDefault()
  if (!event.repeat) steer(event.key === 'ArrowLeft' ? 'gauche' : 'droite')
}

onMounted(() => {
  document.addEventListener('visibilitychange', syncClock)
  document.addEventListener('keydown', turnKey)
  syncClock()
})
onUnmounted(() => {
  cancelAnimationFrame(frame)
  document.removeEventListener('visibilitychange', syncClock)
  document.removeEventListener('keydown', turnKey)
})
</script>

<template>
  <div ref="root" class="turn-control">
    <p class="turn-direction">
      <span aria-hidden="true">{{ direction === 'gauche' ? '←' : '→' }}</span>
      <strong>{{ direction === 'gauche' ? t('Virage à gauche') : t('Virage à droite') }}</strong>
    </p>
    <div class="turn-track" aria-hidden="true">
      <span class="turn-target" :style="{ width: 100 * (window.end - window.start) / window.end + '%' }">
        <span>{{ t('Maintenant') }}</span>
      </span>
      <span class="turn-marker" :style="{ left: position + '%' }">◆</span>
    </div>
    <p class="turn-phase" role="status">{{ phase }}</p>
    <div class="turn-buttons">
      <button type="button" class="button ghost" :class="{ expected: direction === 'gauche' }" :disabled="!playable"
        :aria-label="t('Tourner à gauche')" @click="steer('gauche')">{{ t('← Gauche') }}</button>
      <button type="button" class="button ghost" :class="{ expected: direction === 'droite' }" :disabled="!playable"
        :aria-label="t('Tourner à droite')" @click="steer('droite')">{{ t('Droite →') }}</button>
    </div>
  </div>
</template>

<style scoped>
.turn-control { display: grid; min-width: 0; gap: 10px; text-align: center; }
.turn-control p { margin: 0; }
.turn-direction { display: grid; justify-items: center; }
.turn-direction span { font-size: 3rem; line-height: 1; }
.turn-track { position: relative; height: 50px; margin-inline: 10px; border-bottom: 2px solid currentColor; }
.turn-target { position: absolute; inset: 0 0 0 auto; border: 2px dashed currentColor; border-bottom: 0; font-size: .8rem; }
.turn-target span { position: absolute; inset-block-start: 0; inset-inline-end: 3px; white-space: nowrap; }
.turn-marker { position: absolute; bottom: 0; transform: translateX(-50%); line-height: 1; }
.turn-phase { display: grid; place-items: center; height: 2.8em; font-weight: 700; }
.turn-buttons { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.turn-buttons .button { margin: 0; min-width: 0; min-height: 52px; padding-inline: 6px; white-space: normal; }
.turn-buttons .expected { outline: 2px solid currentColor; outline-offset: -4px; text-decoration: underline; }
</style>
