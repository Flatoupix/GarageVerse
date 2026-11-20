<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { confetti, palettes, pop, tone } from '../game/fx'
import type { ManualFeedback } from '../game/manual-feedback'
import type { Condition } from '../game/data'
import { reducedMotion } from '../game/store'
import type { Play, Round } from '../game/rules'
import { t } from '../i18n'

// En automatique, chaque ligne du détail de score fait avancer ou reculer la voiture.
// `step` compte les lignes déjà jouées ; au-delà du nombre de lignes, les voitures sont à leur score final.
const props = defineProps<{ round?: Round | null; live?: Condition; manual?: boolean; arrival?: boolean; gains?: { player: number; rival: number }; demo?: boolean; waiting?: boolean; feedback?: ManualFeedback | null; streak?: number; flawless?: boolean; keepControls?: boolean; hideScoreTags?: boolean; tappable?: boolean; step: number; running: boolean; arts: { player?: string; rival?: string }; sprites?: { player?: string; rival?: string }; backdrop?: string }>()
const emit = defineEmits<{ skip: []; tap: [event: MouseEvent] }>()
const sides = ['player', 'rival'] as const
const seriesLabel = ref<HTMLElement>()
const flawlessLabel = ref<HTMLElement>()
watch(() => props.streak, count => {
  if (count && count >= 2) pop(seriesLabel.value, Math.min(1.23, 1.1 + count * 0.015), 230)
}, { flush: 'post' })
watch(() => props.flawless, perfect => {
  if (!perfect || !flawlessLabel.value) return
  pop(flawlessLabel.value, 1.12, 240)
  confetti(palettes.gold, 14, { target: flawlessLabel.value, duration: 0.29 })
}, { flush: 'post' })

const LIVE_TRAVEL_MS = 4200
const JOIN_MS = 840
const joining = computed(() => Boolean(props.manual && props.round && props.running))
const livePositions = computed(() => {
  const time = reducedMotion.value && props.manual ? Math.floor(liveTime.value / 180) * 180 : liveTime.value
  const travel = 0.64 * time / (time + LIVE_TRAVEL_MS)
  return {
    player: Math.min(.60, travel + (props.gains?.player ?? 0)),
    rival: Math.min(.60, (props.manual ? 0.97 : 1) * travel + (props.gains?.rival ?? 0)),
  }
})
let joinFrom = { player: 0, rival: 0 }
const liveTime = ref(0)
const hidden = ref(document.hidden)
let frame = 0
let since: number | undefined
let banked = 0
function tick(now: number) {
  if (since === undefined) since = now
  liveTime.value = banked + now - since
  if (joining.value && liveTime.value >= JOIN_MS) emit('skip')
  else frame = requestAnimationFrame(tick)
}
function syncMotion() {
  cancelAnimationFrame(frame)
  hidden.value = document.hidden
  if (since !== undefined) banked += performance.now() - since
  since = undefined
  if (joining.value && reducedMotion.value) {
    emit('skip')
    return
  }
  if (hidden.value || (!joining.value && (!props.live || props.waiting || (!props.manual && reducedMotion.value)))) return
  frame = requestAnimationFrame(tick)
}
watch([joining, () => props.live, () => props.waiting, reducedMotion], ([join], previous) => {
  if (join && !previous[0]) joinFrom = livePositions.value
  if (join !== (previous[0] ?? false) || (!join && !props.live)) {
    since = undefined
    liveTime.value = banked = 0
  }
  syncMotion()
}, { immediate: true })
document.addEventListener('visibilitychange', syncMotion)
onUnmounted(() => {
  cancelAnimationFrame(frame)
  document.removeEventListener('visibilitychange', syncMotion)
})
function touchScene(event: MouseEvent) {
  if (event.target instanceof Element && event.target.closest('.run-controls')) return
  if (props.live && !props.waiting && props.tappable) emit('tap', event)
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
// Les gestes occupent le début de la piste. Le résultat réserve une marge devant
// chaque voiture, y compris pour un score négatif ou un départage à l’endurance.
const finalPositions = computed(() => {
  const round = props.round
  if (!round) return { player: 0, rival: 0 }
  const gap = Math.abs(round.player.score - round.rival.score)
  const lead = Math.min(.20, .04 + .16 * gap / Math.max(1, Math.abs(round.player.score), Math.abs(round.rival.score)))
  return {
    player: round.winner === 'tie' ? .90 : round.winner === 'player' ? 1 : 1 - lead,
    rival: round.winner === 'tie' ? .90 : round.winner === 'rival' ? 1 : 1 - lead,
  }
})

const lanes = computed(() => sides.map(who => {
  const art = props.sprites?.[who] ?? props.arts[who]
  const sprite = Boolean(props.sprites?.[who])
  const feedback = who === 'player' && (props.live || joining.value || props.step <= 1 || reducedMotion.value) ? props.feedback : null
  if (props.manual) {
    const progress = Math.min(1, liveTime.value / JOIN_MS)
    const final = finalPositions.value[who]
    const position = !props.round ? livePositions.value[who]
      : joining.value ? joinFrom[who] + (final - joinFrom[who]) * (1 - (1 - progress) ** 2) : final
    return { who, art, sprite, position, nitro: false, kind: '', tag: '', feedback }
  }
  if (!props.round) {
    const start = props.demo ? 0.1 : 0
    const position = props.waiting || reducedMotion.value ? (props.demo ? 0.22 : start) : start + 0.64 * liveTime.value / (liveTime.value + LIVE_TRAVEL_MS)
    return { who, art, sprite, position, nitro: false, kind: '', tag: '', feedback }
  }
  const play = props.round[who]
  const index = Math.min(props.step, play.lines.length) - 1
  const line = props.running && props.step <= play.lines.length ? play.lines[index] : undefined
  const position = Math.max(0, Math.min(1, prefix(play, props.step) / scale.value))
  return {
    who, position, art, sprite, feedback,
    kind: line ? kindOf(play, index) : '',
    tag: line && !props.hideScoreTags ? `${t(line.label)} ${index && line.value > 0 ? '+' : ''}${line.value}` : '',
    nitro: play.nitro && play.lines.findIndex(l => l.label === 'Nitro') < props.step,
  }
}))
</script>

<template>
  <div class="sector-run" :class="[`run-${live ?? round?.condition}`, {
    running: running || (live && !waiting && !reducedMotion), 'run-live': live,
    'run-manual': manual, 'run-arrival': arrival, 'run-still': (manual || live || feedback) && (hidden || reducedMotion),
  }]" :aria-hidden="manual || live || (feedback && (step <= 1 || reducedMotion)) ? undefined : true" @click="touchScene">
    <div v-if="backdrop" class="run-scenery" :style="demo ? undefined : { backgroundImage: `url(${backdrop})` }" aria-hidden="true">
      <img v-if="demo" :src="backdrop" alt="" draggable="false" />
    </div>
    <span v-if="(streak ?? 0) >= 2" ref="seriesLabel" class="run-series" :style="{ color: tone.gold }" role="status">
      {{ t('Série ×{n}', { n: streak ?? 0 }) }}
    </span>
    <span v-if="flawless" ref="flawlessLabel" class="run-flawless" :style="{ color: tone.gold }" role="status">
      {{ t('Sans faute !') }}
    </span>
    <div v-for="lane in lanes" :key="lane.who" class="run-lane" :class="lane.who">
      <div class="run-mover" :class="{ far: lane.position > .5 }" :style="{ '--p': lane.position }">
        <div :key="lane.feedback ? `feedback-${lane.feedback.count}` : `${step}${lane.kind}`" class="run-car" aria-hidden="true"
          :class="[lane.kind, { sprite: lane.sprite }, lane.feedback && `manual-${lane.feedback.grade}`]">
          <i v-if="lane.nitro" class="run-flame"></i>
          <i v-if="!reducedMotion && lane.feedback?.grade === 'perfect'" class="run-flame manual-flame"
            :style="{ '--exhaust': tone.gold, '--exhaust-tip': palettes.fire[0] }"></i>
          <img v-if="lane.art" :src="lane.art" alt="" draggable="false" />
        </div>
        <span v-if="lane.tag" class="run-tag" :key="step" aria-hidden="true" :class="[lane.kind, { 'run-score-tag': lane.feedback }]">{{ lane.tag }}</span>
        <span v-if="lane.feedback" class="run-tag" :key="`feedback-${lane.feedback.count}`" role="status"
          :class="{ 'run-feedback-tag': lane.tag }">{{ lane.feedback.tag }}</span>
      </div>
    </div>
    <span v-if="!manual || arrival" class="run-finish" aria-hidden="true"></span>
    <slot name="overlay" />
    <div v-if="live || keepControls" class="run-controls"><slot /></div>
    <button v-if="joining" type="button" class="run-skip" @click.stop="emit('skip')">{{ t('Touche pour passer') }}</button>
    <span v-else-if="running && !live" class="run-skip">{{ t('Touche pour passer') }}</span>
  </div>
</template>

<style scoped>
.run-live .run-finish { bottom: auto; height: 108px; }
.run-live .run-mover, .run-manual .run-mover { transition: none; }
.run-arrival .run-finish {
  inset-inline: calc(6px + var(--car) + .68 * (100% - var(--car) - 30px)) auto;
  bottom: auto; height: 108px;
  opacity: 1; pointer-events: none;
}
.run-arrival .run-mover { z-index: 1; }
.run-manual .run-skip {
  inset: 6px auto auto 8px; padding: 2px 6px; border: 1px solid var(--line); border-radius: 4px;
  background: var(--panel); color: var(--text); opacity: 1; cursor: pointer;
}
.run-scenery > img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }
.run-controls { z-index: 1; min-width: 0; background: var(--panel); border-top: 1px solid var(--line); }
.run-car.manual-perfect { isolation: isolate; animation: manual-jump 260ms ease-out; }
.run-car.manual-good { animation: manual-surge 180ms ease-out; }
.run-car.manual-miss { animation: run-brake 240ms ease-out; }
.run-car.manual-fair { animation: none; }
.run-flame.manual-flame {
  background: linear-gradient(90deg, transparent, var(--exhaust-tip), var(--exhaust));
  animation: manual-exhaust 230ms ease-out forwards;
}
@keyframes manual-jump { 40% { transform: translate(14px, -4px) rotate(-3deg); } }
@keyframes manual-surge { 40% { transform: translateX(7px); } }
@keyframes manual-exhaust {
  from { opacity: 1; transform: scaleX(1); }
  to { opacity: 0; transform: scaleX(.35); }
}
.run-series, .run-flawless {
  position: absolute; z-index: 1; padding: 2px 7px; border-radius: 4px; pointer-events: none;
  background: var(--panel); font-size: .8rem; font-weight: 700;
}
.run-series { inset: 6px 10px auto auto; transform-origin: right center; }
.run-flawless { inset: 32px auto auto 50%; translate: -50% 0; white-space: nowrap; }
.run-still .run-mover { transition: none; }
.run-still::after, .run-still .run-scenery, .run-still .run-lane { animation-play-state: paused; }
.run-score-tag { top: 72%; }
.run-feedback-tag { top: 24%; }
.run-still .run-car, .run-still .run-car img, .run-still .run-tag { animation: none; }
</style>
