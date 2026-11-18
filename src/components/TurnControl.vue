<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { reducedMotion } from '../game/store'
import { signedTiming } from '../game/timing-text'
import { advanceTurns, summarizeTurns, type TurnJudgment, type TurnDirection, type TurnResult, type TurnSequence } from '../game/turn'
import { turnFeedback } from '../game/turn-text'
import { useManualKeys } from '../game/manual-keys'
import { t } from '../i18n'

const props = defineProps<{ sequence: TurnSequence; demo?: boolean; waiting?: boolean }>()
const emit = defineEmits<{ turn: [result: TurnResult]; judgment: [result: TurnJudgment, count: number] }>()
const lanes = [
  { direction: 'gauche', arrow: '←', action: t('Tourner à gauche') },
  { direction: 'droite', arrow: '→', action: t('Tourner à droite') },
] as const

const elapsed = ref(0)
const judgments = shallowRef<TurnJudgment[]>([])
const hidden = ref(document.hidden)
const { notes, settings } = props.sequence
const complete = computed(() => judgments.value.length === notes.length)
const last = computed(() => judgments.value.at(-1))
const target = 80
const travel = 72
const targetRadius = travel * settings.good / settings.lead
const visibleNotes = computed(() => {
  if (props.waiting) return []
  const visualTime = reducedMotion.value ? Math.round(elapsed.value / 125) * 125 : elapsed.value
  return notes.slice(judgments.value.length).filter(note => note.at - elapsed.value <= settings.lead).map(note => ({
    ...note,
    position: Math.max(target - travel, Math.min(92, target + travel * (visualTime - note.at) / settings.lead)),
  }))
})

let frame = 0
let since: number | undefined
let banked = 0
const readClock = (now: number) => banked + (since === undefined ? 0 : now - since)

function update(input: TurnDirection | null, time: number) {
  if (complete.value) return
  const next = advanceTurns(props.sequence, judgments.value, input, time)
  if (next === judgments.value) return
  judgments.value = next
  emit('judgment', next[next.length - 1], next.length)
  if (complete.value && !props.demo) {
    emit('turn', summarizeTurns(next, settings))
  }
}

function tick() {
  if (document.hidden || complete.value || props.waiting) return
  elapsed.value = readClock(performance.now())
  update(null, elapsed.value)
  if (complete.value) return
  frame = requestAnimationFrame(tick)
}

function syncClock() {
  cancelAnimationFrame(frame)
  const now = performance.now()
  banked = readClock(now)
  since = undefined
  hidden.value = document.hidden
  if (!hidden.value && !complete.value && !props.waiting) {
    since = now
    tick()
  }
}

function steer(direction: TurnDirection, event?: MouseEvent) {
  if (event && event.detail > 1) return
  if (complete.value || props.waiting || document.hidden) return
  elapsed.value = readClock(performance.now())
  update(direction, elapsed.value)
}

useManualKeys(() => !props.demo && !complete.value, key => {
  if (key === 'ArrowLeft') steer('gauche')
  if (key === 'ArrowRight') steer('droite')
})
watch(() => props.waiting, syncClock)

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
  <div class="turn-control">
    <p v-if="demo">{{ t('Appuie quand la flèche atteint la cible.') }}</p>
    <div class="turn-lanes" aria-hidden="true">
      <div v-for="lane in lanes" :key="lane.direction" class="turn-track manual-track">
        <span class="turn-target" :style="{ left: target - targetRadius + '%', width: 2 * targetRadius + '%' }"></span>
        <template v-for="note in visibleNotes" :key="note.at">
          <span v-if="note.direction === lane.direction" class="turn-note"
            :style="{ left: note.position + '%', top: (22 + note.position * 0.53) + '%' }">{{ lane.arrow }}</span>
        </template>
      </div>
    </div>
    <div class="turn-buttons">
      <button v-for="lane in lanes" :key="lane.direction" type="button" class="button primary wide"
        :disabled="waiting || complete || hidden" :aria-label="lane.action" @click="steer(lane.direction, $event)"
        @keydown.enter="$event.repeat && $event.preventDefault()">{{ lane.arrow }}</button>
    </div>
    <small v-if="!demo" class="manual-key-hint">{{ t('← →') }}</small>
    <p v-if="demo" class="turn-phase" role="status">
      {{ last ? t('Virage {n}/{total} · {judgment} ({modifier})', {
        n: judgments.length, total: notes.length, judgment: turnFeedback(last.outcome), modifier: signedTiming(last.modifier),
      }) : t('Prépare-toi') }}
    </p>
  </div>
</template>

<style scoped>
.turn-control { display: grid; min-width: 0; gap: 4px; padding: 6px 10px; text-align: center; }
.turn-control p { margin: 0; }
.turn-lanes, .turn-buttons { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.turn-track {
  position: relative; min-width: 0; height: 44px;
  background: var(--manual-stripes);
}
.turn-target { position: absolute; inset-block: 0; background: var(--manual-target); }
.turn-note {
  position: absolute; transform: translate(-50%, -50%); display: grid; place-items: center;
  width: 1.1em; height: 1.1em; border: 2px solid currentColor; border-radius: 4px;
  background: var(--panel); color: var(--text); font-size: 1.2rem; font-weight: 900; line-height: 1;
}
.turn-phase { min-height: 1.5em; font-weight: 700; }
.turn-buttons .button { margin: 0; min-width: 0; min-height: 44px; padding-block: 4px; font-size: 1.35rem; touch-action: manipulation; }
</style>
