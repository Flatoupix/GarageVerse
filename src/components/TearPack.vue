<script setup lang="ts">
import { computed, ref } from 'vue'
import { palettes, rarityPalette, sparks } from '../game/fx'
import { buzz } from '../game/store'
import PackArt from './PackArt.vue'

const props = defineProps<{ booster: string; torn: boolean; reduced: boolean; legend?: boolean; disabled?: boolean }>()
const emit = defineEmits<{ tear: [] }>()

const progress = ref(0)
const bend = ref(0)
const fromRight = ref(false)
const dragging = ref(false)
let sparkAt = 0, notch = 0
let finger: { id: number; startX: number; startY: number; distance: number; direction: number } | undefined

const packStyle = computed(() => ({
  '--tear': `${progress.value * 100}%`,
  '--lift': `${progress.value * 8}px`,
  '--pull': `${bend.value}deg`,
  '--tear-pivot': fromRight.value ? 'left' : 'right',
}))

function start(event: PointerEvent) {
  if (props.disabled || finger || !event.isPrimary || event.button !== 0) return
  const target = event.currentTarget as HTMLElement
  const box = target.getBoundingClientRect()
  fromRight.value = event.clientX > box.left + box.width / 2
  finger = {
    id: event.pointerId, startX: event.clientX, startY: event.clientY,
    distance: Math.min(box.width * 0.69, Math.max(box.width * 0.36,
      (fromRight.value ? event.clientX - box.left : box.right - event.clientX) - 10)),
    direction: fromRight.value ? -1 : 1,
  }
  dragging.value = true
  target.setPointerCapture(event.pointerId)
}

function move(event: PointerEvent) {
  if (finger?.id !== event.pointerId) return
  const horizontal = (event.clientX - finger.startX) * finger.direction
  const vertical = Math.abs(event.clientY - finger.startY)
  progress.value = Math.min(1, Math.max(0, horizontal / finger.distance))
  bend.value = progress.value * finger.direction * 5
  // Étincelles et petits crans sous le doigt pendant la déchirure.
  if (progress.value > 0.04 && event.timeStamp - sparkAt > 45) { sparkAt = event.timeStamp; sparks({ x: event.clientX, y: event.clientY }, props.legend ? rarityPalette.Légendaire : palettes.pink, 3, 0.45) }
  if (Math.floor(progress.value * 8) !== notch) { notch = Math.floor(progress.value * 8); buzz(5) }
  if (progress.value >= 1 && vertical <= 86) {
    finger = undefined
    dragging.value = false
    emit('tear')
  }
}

function stop(event: PointerEvent) {
  if (finger?.id !== event.pointerId) return
  finger = undefined
  dragging.value = false
  progress.value = 0
  bend.value = 0
}
</script>

<template>
  <div class="tear-pack" :class="{ 'is-legend': legend, 'is-dragging': dragging, 'is-torn': torn, 'motion-reduced': reduced, 'tear-from-right': fromRight }" :style="packStyle">
    <div class="foil-body"><PackArt :booster="booster" :legend="legend" /></div>
    <div class="foil-strip"><PackArt :booster="booster" :legend="legend" /></div>
    <div
      v-if="!torn && !disabled"
      class="tear-zone"
      aria-hidden="true"
      data-testid="tear-zone"
      @pointerdown="start"
      @pointermove="move"
      @pointerup="stop"
      @pointercancel="stop"
      @lostpointercapture="stop"
    >
      <span class="tear-guide"><span class="tear-progress"></span><span class="tear-arrow">⟶</span></span>
    </div>
  </div>
</template>
