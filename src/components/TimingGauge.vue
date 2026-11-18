<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { classifyTiming, timingBounds, TIMING_RETURN_MS, type TimingResult, type TimingWindow } from '../game/timing'
import { reducedMotion } from '../game/store'
import { t } from '../i18n'
import { timingFeedback } from '../game/timing-text'

const props = defineProps<{ windows: TimingWindow[]; demo?: boolean }>()
const emit = defineEmits<{ judgment: [result: TimingResult]; finish: [results: TimingResult[]]; restart: [] }>()
const REDUCED_STEP_MS = 65
const shiftButton = ref<HTMLButtonElement>()
const position = ref(0)
const results = ref<TimingResult[]>([])
const complete = computed(() => results.value.length === props.windows.length)
const active = ref(0)
const activeWindow = computed(() => props.windows[active.value])
const returning = computed(() => results.value.length > active.value)
const segments = computed(() => {
  const bounds = [0, ...timingBounds(activeWindow.value), 1]
  return ['red', 'orange', 'green', 'perfect', 'green', 'orange', 'red'].map((zone, index) => ({
    zone, width: (bounds[index + 1] - bounds[index]) * 100,
  }))
})

let frame = 0
let since: number | undefined
let banked = 0
let phaseStart = 0
let returnFrom = 0
const readClock = (now: number) => banked + (since === undefined ? 0 : now - since)
function rise(time: number) {
  const elapsed = time - phaseStart
  const { center, duration } = activeWindow.value
  if (!reducedMotion.value) return Math.min(1, elapsed / duration)
  // Un palier tombe sur le centre, même quand la fenêtre parfaite est très étroite.
  const target = center * duration
  const visual = target + Math.floor((elapsed - target) / REDUCED_STEP_MS) * REDUCED_STEP_MS
  return Math.max(0, Math.min(1, visual / duration))
}
function judge(time: number, at: number) {
  const result = classifyTiming(at, activeWindow.value)
  position.value = returnFrom = at
  results.value.push(result)
  phaseStart = time
  emit('judgment', result)
  if (complete.value) emit('finish', [...results.value])
}
function tick() {
  if (document.hidden || complete.value) return
  const time = readClock(performance.now())
  if (returning.value) {
    const progress = Math.min(1, (time - phaseStart) / TIMING_RETURN_MS)
    position.value = reducedMotion.value ? 0 : returnFrom * (1 - progress)
    if (progress === 1) {
      active.value++
      phaseStart += TIMING_RETURN_MS
    }
  } else if (time - phaseStart >= activeWindow.value.duration) judge(time, 1)
  else position.value = rise(time)
  if (!complete.value) frame = requestAnimationFrame(tick)
}
function syncClock() {
  cancelAnimationFrame(frame)
  const now = performance.now()
  banked = readClock(now)
  since = undefined
  if (document.hidden || complete.value) return
  since = now
  tick()
}
function shift(event?: MouseEvent) {
  if (event && event.detail > 1) return
  if (complete.value || returning.value || document.hidden) return
  const time = readClock(performance.now())
  judge(time, time - phaseStart >= activeWindow.value.duration ? 1 : rise(time))
}
function shiftKey(event: KeyboardEvent) {
  if (!event.repeat) shift()
}
function retry() {
  results.value = []
  active.value = position.value = banked = phaseStart = 0
  since = undefined
  emit('restart')
  syncClock()
  shiftButton.value?.focus({ preventScroll: true })
}
function tapScene(event: MouseEvent) {
  shiftButton.value?.focus({ preventScroll: true })
  shift(event)
}
defineExpose({ tapScene })
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
    <p v-if="demo">{{ t('Passe la vitesse quand l’aiguille atteint la zone verte.') }}</p>
    <strong>{{ t('Rapport {n}/{total}', { n: results.length + 1, total: windows.length + 1 }) }}</strong>
    <div class="timing-scale" aria-hidden="true">
      <div class="timing-band">
        <span v-for="(segment, index) in segments" :key="index" :class="segment.zone" :style="{ width: segment.width + '%' }"></span>
      </div>
      <span class="timing-needle" :style="{ left: position * 100 + '%' }"></span>
    </div>
    <ul v-if="demo" class="timing-legend">
      <li v-for="zone in (['red', 'orange', 'green', 'perfect'] as const)" :key="zone">
        <i :class="zone" aria-hidden="true"></i>{{ timingFeedback(zone) }}
      </li>
    </ul>
    <button v-if="demo && complete" type="button" class="button quiet wide" @click="retry">{{ t('Rejouer la séquence') }}</button>
    <button v-else ref="shiftButton" type="button" class="button primary wide" :aria-disabled="returning"
      @click="shift" @keydown.space.prevent="shiftKey" @keydown.enter.prevent="shiftKey">{{ t('Passer la vitesse') }}</button>
  </div>
</template>

<style scoped>
.timing-gauge { display: grid; gap: 4px; min-width: 0; padding: 6px 10px; }
.timing-gauge p { margin: 0; }
.timing-scale { position: relative; padding-block: 5px; margin-inline: 4px; }
.timing-band { display: flex; height: 16px; overflow: hidden; border-radius: 4px; }
.timing-band span + span { border-inline-start: 1px solid var(--panel); }
.red { background: repeating-linear-gradient(135deg, var(--panel) 0 4px, var(--muted) 4px 7px); }
.orange { background: repeating-linear-gradient(90deg, var(--line) 0 5px, var(--text) 5px 7px); }
.green { background: var(--accent); }
.perfect { background: radial-gradient(var(--panel) 1px, var(--accent) 1.5px) 0 0 / 5px 5px; }
.timing-needle { position: absolute; inset-block: 0; width: 4px; transform: translateX(-50%); border-radius: 3px; background: var(--text); box-shadow: 0 0 0 1px var(--panel); }
.timing-legend { display: flex; flex-wrap: wrap; gap: 4px 10px; list-style: none; margin: 0; padding: 0; }
.timing-legend li { display: flex; gap: 5px; align-items: center; font-size: .78rem; }
.timing-legend i { width: 12px; height: 12px; border-radius: 2px; }
.timing-gauge .button { min-height: 44px; margin: 0; touch-action: manipulation; }
</style>
