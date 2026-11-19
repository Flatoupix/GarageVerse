<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { classifyTiming, timingBounds, TIMING_RETURN_MS, type TimingResult, type TimingWindow } from '../game/timing'
import { reducedMotion } from '../game/store'
import { useManualKeys } from '../game/manual-keys'
import { t } from '../i18n'
import { flash, pop, shake, tone } from '../game/fx'
import { manualImpact, shiftGrade } from '../game/manual-feedback'
import { timingFeedback } from '../game/timing-text'

const props = defineProps<{ windows: TimingWindow[]; demo?: boolean; waiting?: boolean }>()
const emit = defineEmits<{ judgment: [result: TimingResult]; finish: [results: TimingResult[]]; restart: [] }>()
const REDUCED_STEP_MS = 65
const shiftButton = ref<HTMLButtonElement>()
const scale = ref<HTMLElement>()
const gear = ref<HTMLElement>()
const perfectLabel = ref<HTMLElement>()
const position = ref(0)
const results = ref<TimingResult[]>([])
const complete = computed(() => results.value.length === props.windows.length)
const active = ref(0)
const activeWindow = computed(() => props.windows[active.value])
const returning = computed(() => results.value.length > active.value)
const bounds = computed(() => [0, ...timingBounds(activeWindow.value), 1])
const inGreen = computed(() => !reducedMotion.value && !props.waiting && !returning.value && !complete.value
  && position.value >= bounds.value[2] && position.value <= bounds.value[5])
const segments = computed(() => {
  return ['red', 'orange', 'green', 'perfect', 'green', 'orange', 'red'].map((zone, index) => ({
    zone, width: (bounds.value[index + 1] - bounds.value[index]) * 100,
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
  const grade = shiftGrade[result.zone]
  const box = scale.value?.getBoundingClientRect()
  if (box) manualImpact(grade, { x: box.left + at * box.width, y: box.top + box.height / 2 }, perfectLabel.value, true)
  if (grade === 'perfect') flash(tone.gold, 0.075)
  if (grade === 'miss') {
    flash(tone.rose, 0.05)
    const scene = scale.value?.closest<HTMLElement>('.sector-run')
    if (scene) shake(1, scene)
  }
  pop(gear.value, 1.13, 220)
  emit('judgment', result)
  if (complete.value) emit('finish', [...results.value])
}
function tick() {
  if (props.waiting || document.hidden || complete.value) return
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
  if (props.waiting || document.hidden || complete.value) return
  since = now
  tick()
}
function shift(event?: MouseEvent) {
  if (event && event.detail > 1) return
  if (props.waiting || complete.value || returning.value || document.hidden) return
  const time = readClock(performance.now())
  judge(time, time - phaseStart >= activeWindow.value.duration ? 1 : rise(time))
}
useManualKeys(() => !props.demo && !complete.value, key => {
  if (key === ' ') shift()
})
watch(() => props.waiting, syncClock)
function focusShift() {
  shiftButton.value?.focus({ preventScroll: true })
}
async function retry() {
  results.value = []
  active.value = position.value = banked = phaseStart = 0
  since = undefined
  emit('restart')
  syncClock()
  await nextTick()
  focusShift()
}
function tapScene(event: MouseEvent) {
  if (props.waiting) return
  focusShift()
  shift(event)
}
defineExpose({ focusShift, tapScene })
onMounted(() => {
  document.addEventListener('visibilitychange', syncClock)
  syncClock()
})
onUnmounted(() => {
  cancelAnimationFrame(frame)
  document.removeEventListener('visibilitychange', syncClock)
})
</script>

<template>
  <div class="timing-gauge">
    <div class="timing-heading">
      <strong ref="gear">{{ t('Rapport {n}/{total}', { n: results.length + 1, total: windows.length + 1 }) }}</strong>
      <span ref="perfectLabel" class="timing-perfect" :style="{ color: tone.gold }" role="status">
        {{ demo && reducedMotion && results.at(-1)?.zone === 'perfect' ? t('Parfait !') : '' }}
      </span>
    </div>
    <div ref="scale" class="timing-scale" :class="{ 'in-green': inGreen }" aria-hidden="true">
      <div class="timing-band manual-track">
        <span v-for="(segment, index) in segments" :key="index" :class="segment.zone" :style="{ width: segment.width + '%' }"></span>
      </div>
      <span class="timing-needle" :class="{ trailing: !reducedMotion && !waiting && !returning && !complete }"
        :style="{ left: position * 100 + '%', '--glow': tone.cyan }"></span>
    </div>
    <ul v-if="demo" class="timing-legend">
      <li v-for="zone in (['red', 'orange', 'green', 'perfect'] as const)" :key="zone">
        <i :class="zone" aria-hidden="true"></i>{{ timingFeedback(zone) }}
      </li>
    </ul>
    <button v-if="demo && complete" type="button" class="button quiet wide" @click="retry">{{ t('Rejouer la séquence') }}</button>
    <button v-else ref="shiftButton" type="button" class="button primary wide" :disabled="waiting" :aria-disabled="returning || waiting"
      @click="shift" @keydown.enter="$event.repeat && $event.preventDefault()">{{ t('Passer la vitesse') }}</button>
    <small v-if="!demo" class="manual-key-hint">{{ t('Espace') }}</small>
  </div>
</template>

<style scoped>
.timing-gauge { display: grid; gap: 4px; min-width: 0; padding: 6px 10px; }
.timing-heading { display: flex; justify-content: space-between; padding-inline: 4px; }
.timing-heading strong { transform-origin: left center; }
.timing-perfect { flex: 0 0 88px; text-align: center; font-weight: 700; }
.timing-scale { position: relative; padding-block: 5px; margin-inline: 4px; }
.timing-band { display: flex; height: 16px; }
.timing-band span + span { border-inline-start: 1px solid var(--panel); }
.red { background: repeating-linear-gradient(135deg, var(--panel) 0 4px, var(--muted) 4px 7px); }
.orange { background: var(--manual-stripes); }
.green { background: var(--accent); }
.perfect { background: var(--manual-target); }
.timing-needle { position: absolute; inset-block: 0; width: 4px; transform: translateX(-50%); border-radius: 3px; background: var(--text); box-shadow: 0 0 0 1px var(--panel); }
.in-green :is(.green, .perfect) { filter: brightness(1.32); }
.trailing::before {
  content: ''; position: absolute; inset: 3px 100% 3px auto; width: 16px;
  background: linear-gradient(90deg, transparent, var(--glow)); opacity: .65; pointer-events: none;
}
.timing-scale { overflow: clip; overflow-clip-margin: 2px; }
.timing-legend { display: flex; flex-wrap: wrap; gap: 4px 10px; list-style: none; margin: 0; padding: 0; }
.timing-legend li { display: flex; gap: 5px; align-items: center; font-size: .78rem; }
.timing-legend i { width: 12px; height: 12px; border-radius: 2px; }
.timing-gauge .button { min-height: 44px; margin: 0; touch-action: manipulation; }
</style>
