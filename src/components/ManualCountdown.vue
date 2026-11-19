<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { COUNTDOWN_STEP_MS } from '../game/countdown'
import { palettes, pop, streaks } from '../game/fx'
import { sound } from '../game/store'
import { t } from '../i18n'

const emit = defineEmits<{ go: [] }>()
const steps = [t('3'), t('2'), t('1'), t('Partez !')]
const label = ref('')
const digit = ref<HTMLElement>()
watch(label, value => {
  if (!value) return
  pop(digit.value, 1.18, 230)
  if (value === steps.at(-1)) {
    sound('rev')
    streaks(palettes.fire, 8, 1, 0.28)
  } else sound('tick')
}, { flush: 'post' })
let frame = 0
let since: number | undefined
let banked = 0
let started = false
let finished = false

function tick() {
  if (document.hidden || since === undefined) return
  const step = Math.floor((banked + performance.now() - since) / COUNTDOWN_STEP_MS)
  label.value = steps[step] ?? ''
  if (!started && step >= steps.length - 1) {
    started = true
    emit('go')
  }
  finished = step >= steps.length
  if (!finished) frame = requestAnimationFrame(tick)
}
function syncClock() {
  cancelAnimationFrame(frame)
  const now = performance.now()
  if (since !== undefined) banked += now - since
  since = undefined
  if (document.hidden || finished) return
  since = now
  frame = requestAnimationFrame(tick)
}
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
  <div class="manual-countdown" role="status" aria-live="polite" aria-atomic="true">
    <strong v-if="label" ref="digit" :key="label">{{ label }}</strong>
  </div>
</template>

<style scoped>
.manual-countdown { position: absolute; z-index: 1; inset: 38px 0 auto; display: grid; justify-items: center; pointer-events: none; }
.manual-countdown strong {
  padding: 2px 14px; border: 2px solid var(--accent); border-radius: var(--radius, 4px);
  background: var(--panel); color: var(--text); font-size: 1.5rem;
}
</style>
