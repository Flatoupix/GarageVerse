<script setup lang="ts">
import { computed } from 'vue'
import type { Play, Round } from '../game/rules'

// Mini-course d'un secteur : chaque ligne du détail de score fait avancer ou reculer la voiture.
// `step` compte les lignes déjà jouées ; au-delà du nombre de lignes, les voitures sont à leur score final.
const props = defineProps<{ round: Round; step: number; running: boolean; arts: { player?: string; rival?: string }; backdrop?: string }>()
const emit = defineEmits<{ skip: [] }>()
const sides = ['player', 'rival'] as const

const prefix = (play: Play, count: number) => play.lines.slice(0, count).reduce((sum, line) => sum + line.value, 0)
// L'échelle couvre le plus haut score atteint en cours de route, pour qu'une voiture ne sorte jamais de la piste.
const scale = computed(() => Math.max(1, ...sides.flatMap(who => props.round[who].lines.map((_, i) => prefix(props.round[who], i + 1)))))

function kindOf(play: Play, index: number) {
  const line = play.lines[index]
  if (index === 0) return 'launch'
  if (line.label === 'Nitro') return 'nitro'
  if (index === play.lines.length - 1 && play.luck) return play.luck
  return line.value < 0 ? 'slow' : 'boost'
}
const lanes = computed(() => sides.map(who => {
  const play = props.round[who]
  const index = Math.min(props.step, play.lines.length) - 1
  const line = props.running && props.step <= play.lines.length ? play.lines[index] : undefined
  const position = Math.max(0, Math.min(1, prefix(play, props.step) / scale.value))
  return {
    who, position, art: props.arts[who],
    kind: line ? kindOf(play, index) : '',
    tag: line ? `${line.label} ${index && line.value > 0 ? '+' : ''}${line.value}` : '',
    nitro: play.nitro && play.lines.findIndex(l => l.label === 'Nitro') < props.step,
  }
}))
</script>

<template>
  <div class="sector-run" :class="[`run-${round.condition}`, { running }]" aria-hidden="true" @click="running && emit('skip')">
    <div v-if="backdrop" class="run-scenery" :style="{ backgroundImage: `url(${backdrop})` }"></div>
    <div v-for="lane in lanes" :key="lane.who" class="run-lane" :class="lane.who">
      <div class="run-mover" :class="{ far: lane.position > .5 }" :style="{ '--p': lane.position }">
        <div :key="`${step}${lane.kind}`" class="run-car" :class="lane.kind">
          <i v-if="lane.nitro" class="run-flame"></i>
          <img v-if="lane.art" :src="lane.art" alt="" draggable="false" />
        </div>
        <span v-if="lane.tag" :key="step" class="run-tag" :class="lane.kind">{{ lane.tag }}</span>
      </div>
    </div>
    <span class="run-finish"></span>
    <span v-if="running" class="run-skip">Touche pour passer</span>
  </div>
</template>
