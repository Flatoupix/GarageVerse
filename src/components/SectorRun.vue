<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { Condition } from '../game/data'
import { reducedMotion } from '../game/store'
import type { Play, Round } from '../game/rules'
import { t } from '../i18n'

// Mini-course d'un secteur : chaque ligne du détail de score fait avancer ou reculer la voiture.
// `step` compte les lignes déjà jouées ; au-delà du nombre de lignes, les voitures sont à leur score final.
const props = defineProps<{ round?: Round | null; live?: Condition; feedback?: { tag: string; good: boolean; count: number } | null; tappable?: boolean; step: number; running: boolean; arts: { player?: string; rival?: string }; sprites?: { player?: string; rival?: string }; backdrop?: string }>()
const emit = defineEmits<{ skip: []; tap: [] }>()
const sides = ['player', 'rival'] as const

const LIVE_TRAVEL_MS = 4200
const liveTime = ref(0)
const hidden = ref(document.hidden)
let frame = 0
let since: number | undefined
let banked = 0
function tick(now: number) {
  if (since === undefined) since = now
  liveTime.value = banked + now - since
  frame = requestAnimationFrame(tick)
}
function syncMotion() {
  cancelAnimationFrame(frame)
  hidden.value = document.hidden
  if (since !== undefined) banked += performance.now() - since
  since = undefined
  if (!props.live || hidden.value || reducedMotion.value) return
  frame = requestAnimationFrame(tick)
}
watch(() => [props.live, reducedMotion.value], () => {
  syncMotion()
  if (!props.live) liveTime.value = banked = 0
}, { immediate: true })
document.addEventListener('visibilitychange', syncMotion)
onUnmounted(() => {
  cancelAnimationFrame(frame)
  document.removeEventListener('visibilitychange', syncMotion)
})
function touchScene(event: MouseEvent) {
  if (event.target instanceof Element && event.target.closest('.run-controls')) return
  if (props.live && props.tappable && event.detail <= 1) emit('tap')
  else if (props.running && (!props.feedback || event.detail <= 1)) emit('skip')
}

const prefix = (play: Play, count: number) => play.lines.slice(0, count).reduce((sum, line) => sum + line.value, 0)
// L'échelle couvre le plus haut score atteint en cours de route, pour qu'une voiture ne sorte jamais de la piste.
const scale = computed(() => Math.max(1, ...sides.flatMap(who => props.round ? props.round[who].lines.map((_, i) => prefix(props.round![who], i + 1)) : [])))

function kindOf(play: Play, index: number) {
  const line = play.lines[index]
  if (index === 0) return 'launch'
  if (line.label === 'Nitro') return 'nitro'
  if (index === play.lines.length - 1 && play.luck) return play.luck
  return line.value < 0 ? 'slow' : 'boost'
}
const lanes = computed(() => sides.map(who => {
  const art = props.sprites?.[who] ?? props.arts[who]
  const sprite = Boolean(props.sprites?.[who])
  const feedback = who === 'player' && (props.live || props.step <= 1) ? props.feedback : null
  if (!props.round) {
    const position = reducedMotion.value ? 0.22 : 0.1 + 0.64 * liveTime.value / (liveTime.value + LIVE_TRAVEL_MS)
    return { who, art, sprite, position, nitro: false, kind: '', tag: feedback?.tag, feedback }
  }
  const play = props.round[who]
  const index = Math.min(props.step, play.lines.length) - 1
  const line = props.running && props.step <= play.lines.length ? play.lines[index] : undefined
  const position = Math.max(0, Math.min(1, prefix(play, props.step) / scale.value))
  return {
    who, position, art, sprite, feedback,
    kind: line ? kindOf(play, index) : '',
    tag: feedback?.tag ?? (line ? `${t(line.label)} ${index && line.value > 0 ? '+' : ''}${line.value}` : ''),
    nitro: play.nitro && play.lines.findIndex(l => l.label === 'Nitro') < props.step,
  }
}))
</script>

<template>
  <div class="sector-run" :class="[`run-${live ?? round?.condition}`, {
    running: running || (live && !reducedMotion), 'run-live': live, 'run-still': (live || feedback) && (hidden || reducedMotion),
  }]" :aria-hidden="live || (feedback && step <= 1) ? undefined : true" @click="touchScene">
    <div v-if="backdrop" class="run-scenery" :style="{ backgroundImage: `url(${backdrop})` }"></div>
    <div v-for="lane in lanes" :aria-hidden="live ? !lane.feedback : undefined" :key="lane.who" class="run-lane" :class="lane.who">
      <div class="run-mover" :class="{ far: lane.position > .5 }" :style="{ '--p': lane.position }">
        <div :key="lane.feedback ? `live-${lane.feedback.count}` : `${step}${lane.kind}`" class="run-car" :class="[lane.kind, { sprite: lane.sprite, 'live-boost': lane.feedback?.good, 'live-brake': lane.feedback && !lane.feedback.good }]">
          <i v-if="lane.nitro" class="run-flame"></i>
          <img v-if="lane.art" :src="lane.art" alt="" draggable="false" />
        </div>
        <span v-if="lane.tag" class="run-tag" :key="lane.feedback?.count ?? step" :role="lane.feedback ? 'status' : undefined" :class="lane.kind">{{ lane.tag }}</span>
      </div>
    </div>
    <span class="run-finish"></span>
    <slot name="overlay" />
    <div v-if="live" class="run-controls"><slot /></div>
    <span v-if="running && !live" class="run-skip">{{ t('Touche pour passer') }}</span>
  </div>
</template>

<style scoped>
.run-live .run-finish { bottom: auto; height: 108px; }
.run-live .run-mover { transition: none; }
.run-controls { z-index: 1; min-width: 0; background: var(--panel); border-top: 1px solid var(--line); }
.run-live:has(.turn-control) .run-scenery,
.run-live:has(.turn-control) .run-controls { grid-area: 1 / 1; }
.run-live:has(.turn-control) .run-controls {
  align-self: stretch; border-top: 0; background: color-mix(in srgb, var(--panel) 82%, transparent);
}
.run-live:has(.turn-control) .run-finish { top: auto; bottom: 6px; }
.live-boost { animation: live-boost 240ms ease-out; }
.live-brake { animation: run-brake 240ms ease-out; }
@keyframes live-boost { 40% { transform: translateX(10px); } }
.run-still .run-mover { transition: none; }
.run-still .run-scenery, .run-still .run-lane { animation-play-state: paused; }
.run-still .run-car, .run-still .run-tag { animation: none; }
</style>
