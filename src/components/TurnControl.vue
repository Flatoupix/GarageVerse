<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { reducedMotion } from '../game/store'
import { signedTiming } from '../game/timing-text'
import { advanceTurns, summarizeTurns, type TurnJudgment, type TurnDirection, type TurnResult, type TurnSequence } from '../game/turn'
import { turnFeedback } from '../game/turn-text'
import { t } from '../i18n'

const props = defineProps<{ sequence: TurnSequence; demo?: boolean }>()
const emit = defineEmits<{ turn: [result: TurnResult]; judgment: [result: TurnJudgment, count: number] }>()
const lanes = [
  { direction: 'gauche', arrow: '←', label: t('← Gauche'), action: t('Tourner à gauche') },
  { direction: 'droite', arrow: '→', label: t('Droite →'), action: t('Tourner à droite') },
] as const

const root = ref<HTMLElement>()
const elapsed = ref(0)
const judgments = shallowRef<TurnJudgment[]>([])
const hidden = ref(document.hidden)
const { notes, settings } = props.sequence
const complete = computed(() => judgments.value.length === notes.length)
const last = computed(() => judgments.value.at(-1))
const target = 74
const travel = 62
const targetRadius = travel * settings.good / settings.lead
const visibleNotes = computed(() => {
  const visualTime = reducedMotion.value ? Math.round(elapsed.value / 125) * 125 : elapsed.value
  return notes.slice(judgments.value.length).filter(note => note.at - elapsed.value <= settings.lead).map(note => ({
    ...note,
    position: Math.min(86, target + travel * (visualTime - note.at) / settings.lead),
  }))
})

let frame = 0
let since: number | undefined
let banked = 0
let emitted = false
const readClock = (now: number) => banked + (since === undefined ? 0 : now - since)

function update(input: TurnDirection | null, time: number) {
  if (complete.value) return
  const next = advanceTurns(props.sequence, judgments.value, input, time)
  if (next === judgments.value) return
  judgments.value = next
  emit('judgment', next[next.length - 1], next.length)
  if (complete.value && !props.demo) {
    emitted = true
    emit('turn', summarizeTurns(next, settings))
  }
}

function tick() {
  if (document.hidden || complete.value) return
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
  if (!hidden.value && !emitted) {
    since = now
    tick()
  }
}

function steer(direction: TurnDirection, event?: MouseEvent) {
  if (event && event.detail > 1) return
  if (complete.value || document.hidden) return
  elapsed.value = readClock(performance.now())
  update(direction, elapsed.value)
}

function turnKey(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  if (complete.value || document.hidden || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  const focus = event.target
  if (focus instanceof HTMLElement && (focus.isContentEditable || focus.closest('input, select, textarea'))) return
  const dialog = root.value?.closest('dialog')
  if (dialog ? !(focus instanceof Node && dialog.contains(focus)) : document.querySelector('dialog:modal')) return
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
  <div ref="root" class="turn-control" :class="{ compact: !demo }">
    <p v-if="demo">{{ t('Appuie quand la flèche atteint la cible.') }}</p>
    <div class="turn-lanes">
      <div v-for="lane in lanes" :key="lane.direction" class="turn-lane" :class="lane.direction">
        <strong v-if="demo">{{ lane.label }}</strong>
        <button type="button" class="button turn-track" :disabled="complete || hidden" :aria-label="lane.action"
          @click="steer(lane.direction, $event)" @keydown.space.stop.prevent="!$event.repeat && steer(lane.direction)"
          @keydown.enter.stop.prevent="!$event.repeat && steer(lane.direction)">
          <span v-if="!demo" class="turn-lane-arrow" aria-hidden="true">{{ lane.arrow }}</span>
          <span class="turn-target" :style="{ top: target - targetRadius + '%', height: 2 * targetRadius + '%' }"></span>
          <span v-if="demo" class="turn-now">{{ t('Maintenant') }}</span>
          <template v-for="note in visibleNotes" :key="note.at">
            <span v-if="note.direction === lane.direction" class="turn-note" aria-hidden="true"
              :style="{ top: note.position + '%' }">{{ lane.arrow }}</span>
          </template>
        </button>
      </div>
    </div>
    <div v-if="demo" class="turn-buttons">
      <button v-for="lane in lanes" :key="lane.direction" type="button" class="button ghost" :disabled="complete || hidden"
        :aria-label="lane.action" @click="steer(lane.direction, $event)" @keydown.space.prevent="!$event.repeat && steer(lane.direction)"
        @keydown.enter.prevent="!$event.repeat && steer(lane.direction)">{{ lane.label }}</button>
    </div>
    <p v-if="demo" class="turn-phase" role="status">
      {{ last ? t('Virage {n}/{total} · {judgment} ({modifier})', {
        n: judgments.length, total: notes.length, judgment: turnFeedback(last.outcome), modifier: signedTiming(last.modifier),
      }) : t('Prépare-toi') }}
    </p>
  </div>
</template>

<style scoped>
.turn-control { display: grid; min-width: 0; gap: 8px; text-align: center; }
.turn-control p { margin: 0; }
.turn-lanes, .turn-buttons { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.turn-lane { display: grid; min-width: 0; gap: 4px; }
.turn-track {
  position: relative; min-width: 0; margin: 0; padding: 0; height: clamp(160px, 29svh, 248px); overflow: hidden;
  border: 1px solid var(--line); color: var(--text); border-radius: 8px; cursor: pointer; touch-action: manipulation;
  background: repeating-linear-gradient(135deg, transparent 0 12px, color-mix(in srgb, var(--text) 15%, transparent) 12px 13px);
}
.droite .turn-track { background-image: repeating-linear-gradient(45deg, transparent 0 12px, color-mix(in srgb, var(--text) 15%, transparent) 12px 13px); }
.turn-target { position: absolute; inset-inline: 5px; border: 1px dashed currentColor; background: color-mix(in srgb, var(--accent) 25%, transparent); }
.turn-now { position: absolute; inset: auto 0 1px; font-size: .78rem; }
.turn-note {
  position: absolute; left: 50%; transform: translate(-50%, -50%); display: grid; place-items: center;
  width: 1.45em; height: 1.2em; border: 2px solid currentColor; border-radius: 6px;
  background: var(--panel); color: var(--text); font-size: 1.4rem; font-weight: 900; line-height: 1;
}
.turn-phase { display: grid; place-items: center; min-height: 2.8em; font-weight: 700; }
.turn-buttons .button { margin: 0; min-width: 0; min-height: 52px; padding-inline: 6px; white-space: normal; touch-action: manipulation; }
.compact { padding: 4px 10px; }
.compact .turn-track { height: 104px; }
.compact .turn-note { font-size: 1.15rem; }
.turn-lane-arrow { position: absolute; inset: 4px 8px auto auto; font-size: 1.1rem; font-weight: 900; }
</style>
