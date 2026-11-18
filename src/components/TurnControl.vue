<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { reducedMotion } from '../game/store'
import { signedTiming } from '../game/timing-text'
import { advanceTurns, summarizeTurns, type TurnJudgment, type TurnDirection, type TurnResult, type TurnSequence } from '../game/turn'
import { turnFeedback } from '../game/turn-text'
import { useManualKeys } from '../game/manual-keys'
import { pop, shake, tone } from '../game/fx'
import { manualImpact, turnGrade } from '../game/manual-feedback'
import { t } from '../i18n'

const props = defineProps<{ sequence: TurnSequence; demo?: boolean; waiting?: boolean }>()
const emit = defineEmits<{ turn: [result: TurnResult]; judgment: [result: TurnJudgment, count: number] }>()
const lanes = [
  { direction: 'gauche', arrow: '←', action: t('Tourner à gauche') },
  { direction: 'droite', arrow: '→', action: t('Tourner à droite') },
] as const

const control = ref<HTMLElement>()
const perfectLabel = ref<HTMLElement>()
const miss = shallowRef<{ direction: TurnDirection; position: number; key: number }>()
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
  if (props.waiting) return []
  const visualTime = reducedMotion.value ? Math.round(elapsed.value / 125) * 125 : elapsed.value
  return notes.slice(judgments.value.length).filter(note => note.at - elapsed.value <= settings.lead).map(note => ({
    ...note,
    position: Math.min(86, target + travel * (visualTime - note.at) / settings.lead),
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
  const previous = judgments.value.length
  judgments.value = next
  for (let i = previous; i < next.length; i++) emit('judgment', next[i], i + 1)
  const index = next.length - 1
  impact(next[index], index, time)
  if (complete.value && !props.demo) {
    emit('turn', summarizeTurns(next, settings))
  }
}

function impact(result: TurnJudgment, index: number, time: number) {
  const note = notes[index]
  const track = control.value?.querySelector<HTMLElement>(`[data-lane="${note.direction}"]`)
  const center = track?.querySelector<HTMLElement>('.turn-target')
  if (!track || !center) return
  const grade = turnGrade[result.outcome]
  manualImpact(grade, center, perfectLabel.value, false)
  if (reducedMotion.value) return
  if (grade === 'miss') {
    const position = Math.max(12, Math.min(86, target + travel * (time - note.at) / settings.lead))
    miss.value = { direction: note.direction, position, key: index }
    shake(1, track)
    return
  }
  const color = grade === 'perfect' ? tone.gold : grade === 'good' ? tone.cyan : tone.light
  const duration = grade === 'perfect' ? 250 : grade === 'good' ? 190 : 140
  track.animate({ boxShadow: [`inset 0 0 16px ${color}`, 'inset 0 0 0 transparent'] }, { duration, easing: 'ease-out' })
  pop(control.value?.querySelector(`[data-steer="${note.direction}"]`), 1.08, duration)
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
  <div ref="control" class="turn-control">
    <p v-if="demo">{{ t('Appuie quand la flèche atteint la cible.') }}</p>
    <div ref="perfectLabel" class="turn-perfect" :style="{ color: tone.gold }" role="status">
      {{ reducedMotion && last?.outcome === 'parfait' ? t('Parfait !') : '' }}
    </div>
    <div class="turn-lanes" aria-hidden="true">
      <div v-for="lane in lanes" :key="lane.direction" class="turn-track manual-track" :data-lane="lane.direction">
        <span class="turn-lane-arrow">{{ lane.arrow }}</span>
        <span class="turn-target" :style="{ top: target - targetRadius + '%', height: 2 * targetRadius + '%' }"></span>
        <span v-if="!reducedMotion && miss?.direction === lane.direction" :key="miss.key" class="turn-note turn-miss"
          :style="{ top: miss.position + '%', color: tone.rose }" @animationend="miss = undefined">{{ lane.arrow }}</span>
        <template v-for="note in visibleNotes" :key="note.at">
          <span v-if="note.direction === lane.direction" class="turn-note" :style="{ top: note.position + '%' }">{{ lane.arrow }}</span>
        </template>
      </div>
    </div>
    <div class="turn-buttons">
      <button v-for="lane in lanes" :key="lane.direction" type="button" class="button primary wide"
        :data-steer="lane.direction" :disabled="waiting || complete || hidden" :aria-label="lane.action" @click="steer(lane.direction, $event)"
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
.turn-perfect { min-height: 1.15em; font-size: .82rem; font-weight: 700; }
.turn-note.turn-miss { pointer-events: none; animation: turn-miss 220ms ease-out both; }
@keyframes turn-miss { to { opacity: 0; scale: .65; } }
.turn-control p { margin: 0; }
.turn-lanes, .turn-buttons { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.turn-track {
  position: relative; min-width: 0; height: clamp(112px, 17svh, 150px); overflow: hidden; border: 1px solid var(--line); border-radius: 6px;
  background: repeating-linear-gradient(135deg, transparent 0 12px, color-mix(in srgb, var(--text) 12%, transparent) 12px 13px);
}
/* Les virages descendent vers la cible, comme les notes d'un jeu de rythme. */
.turn-target { position: absolute; inset-inline: 0; background: var(--manual-target); }
.turn-lane-arrow { position: absolute; inset: 4px 8px auto auto; font-size: 1rem; font-weight: 900; opacity: .7; }
.turn-note {
  position: absolute; left: 50%; transform: translate(-50%, -50%); display: grid; place-items: center;
  width: 1.1em; height: 1.1em; border: 2px solid currentColor; border-radius: 4px;
  background: var(--panel); color: var(--text); font-size: 1.2rem; font-weight: 900; line-height: 1;
}
.turn-phase { min-height: 1.5em; font-weight: 700; }
.turn-buttons .button { margin: 0; min-width: 0; min-height: 44px; padding-block: 4px; font-size: 1.35rem; touch-action: manipulation; }
</style>
