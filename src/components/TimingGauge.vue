<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { classifyTiming, timingBounds, type TimingResult, type TimingWindow } from '../game/timing'
import { reducedMotion } from '../game/store'
import { t } from '../i18n'
import { timingFeedback, signedTiming } from '../game/timing-text'

const props = defineProps<{ window: TimingWindow; demo?: boolean }>()
const emit = defineEmits<{ shift: [result: TimingResult] }>()

const shiftButton = ref<HTMLButtonElement>()
const position = ref(0)
const result = ref<TimingResult | null>(null)
const paused = ref(false)
const duration = computed(() => props.window.duration * (reducedMotion.value ? 1.8 : 1))
const segments = computed(() => {
  const [left, greenStart, perfectStart, perfectEnd, greenEnd, right] = timingBounds(props.window)
  const bounds = [0, left, greenStart, perfectStart, perfectEnd, greenEnd, right, 1]
  return ['red', 'orange', 'green', 'perfect', 'green', 'orange', 'red'].map((zone, index) => ({
    zone, width: (bounds[index + 1] - bounds[index]) * 100,
  }))
})

let frame = 0
let since: number | undefined
let elapsed = 0
function readPosition(now: number) {
  const progress = (elapsed + (since === undefined ? 0 : now - since)) / duration.value
  return props.demo ? progress % 1 : Math.min(1, progress)
}
function tick() {
  position.value = readPosition(performance.now())
  if (position.value < 1) frame = requestAnimationFrame(tick)
}
function syncClock() {
  cancelAnimationFrame(frame)
  const now = performance.now()
  if (since !== undefined) elapsed += now - since
  since = undefined
  if (document.hidden || paused.value || result.value) return
  since = now
  tick()
}
function togglePause() {
  paused.value = !paused.value
  syncClock()
  if (!paused.value) shiftButton.value?.focus({ preventScroll: true })
}
function shift() {
  if (result.value || paused.value || document.hidden) return
  position.value = readPosition(performance.now())
  result.value = classifyTiming(position.value, props.window)
  syncClock()
  emit('shift', result.value)
}
function shiftKey(event: KeyboardEvent) {
  if (!event.repeat) shift()
}
function retry() {
  position.value = elapsed = 0
  result.value = null
  syncClock()
  shiftButton.value?.focus({ preventScroll: true })
}
onMounted(() => {
  document.addEventListener('visibilitychange', syncClock)
  shiftButton.value?.focus({ preventScroll: true })
  syncClock()
})
onUnmounted(() => {
  cancelAnimationFrame(frame)
  document.removeEventListener('visibilitychange', syncClock)
})
</script>

<template>
  <div class="timing-gauge">
    <p>{{ t('Passe la vitesse quand l’aiguille atteint la zone verte.') }}</p>
    <div class="timing-scale" aria-hidden="true">
      <div class="timing-band">
        <span v-for="(segment, index) in segments" :key="index" :class="segment.zone" :style="{ width: segment.width + '%' }"></span>
      </div>
      <span class="timing-needle" :style="{ left: position * 100 + '%' }"></span>
    </div>
    <ul class="timing-legend">
      <li><i class="red" aria-hidden="true"></i>{{ t('Raté') }}</li>
      <li><i class="orange" aria-hidden="true"></i>{{ t('Moyen') }}</li>
      <li><i class="green" aria-hidden="true"></i>{{ t('Bon') }}</li>
      <li><i class="perfect" aria-hidden="true"></i>{{ t('Parfait') }}</li>
    </ul>
    <p v-if="demo" class="timing-feedback" role="status">
      <template v-if="result">{{ timingFeedback(result.zone) }} · {{ signedTiming(result.modifier) }}</template>
    </p>
    <div class="timing-controls">
      <button ref="shiftButton" type="button" class="button primary wide" :aria-disabled="Boolean(result || paused)" @click="shift"
        @keydown.space.prevent="shiftKey" @keydown.enter.prevent="shiftKey">
        {{ t('Passer la vitesse') }}
      </button>
      <button v-if="demo && result" type="button" class="button quiet" @click="retry">{{ t('Réessayer le passage') }}</button>
      <button v-else-if="!result" type="button" class="button quiet" @click="togglePause">{{ paused ? t('Reprendre l’aiguille') : t('Mettre l’aiguille en pause') }}</button>
    </div>
  </div>
</template>

<style scoped>
.timing-gauge { display: grid; gap: 10px; min-width: 0; }
.timing-gauge p { margin: 0; }
.timing-scale { position: relative; padding-block: 12px; margin-inline: 6px; }
.timing-band { display: flex; height: 26px; overflow: hidden; border-radius: 6px; background: #121522; }
.timing-band span + span { border-left: 1px solid #121522; }
.red { background: repeating-linear-gradient(135deg, #78192e 0 4px, #dd465d 4px 7px); }
.orange { background: repeating-linear-gradient(90deg, #f3a341 0 5px, #ac591e 5px 7px); }
.green { background: #32b57e; }
.perfect { background: radial-gradient(#18392e 1px, #9ef3bf 1.5px) 0 0 / 5px 5px; }
.timing-needle { position: absolute; top: 3px; bottom: 3px; width: 4px; transform: translateX(-50%); border-radius: 3px; background: white; box-shadow: 0 0 0 1px #121522; }
.timing-needle::before { content: ''; position: absolute; left: -4px; top: 0; border: 6px solid transparent; border-top-color: white; }
.timing-legend { display: flex; flex-wrap: wrap; gap: 6px 12px; list-style: none; margin: 0; padding: 0; }
.timing-legend li { display: flex; gap: 5px; align-items: center; font-size: .78rem; }
.timing-legend i { width: 12px; height: 12px; border-radius: 2px; }
.timing-feedback { min-height: 1.5em; font-weight: 700; }
.timing-controls { display: grid; gap: 5px; }
.timing-controls .primary { min-height: 52px; }
.timing-controls [aria-disabled="true"] { opacity: .65; }
</style>
