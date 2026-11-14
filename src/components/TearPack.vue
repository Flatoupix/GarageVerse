<script setup lang="ts">
import { computed, ref } from 'vue'
import PackArt from './PackArt.vue'

defineProps<{ booster: string; torn: boolean; reduced: boolean }>()
const emit = defineEmits<{ tear: [] }>()

const progress = ref(0)
const bend = ref(0)
const fromRight = ref(false)
const dragging = ref(false)
let finger: { id: number; startX: number; startY: number; distance: number; direction: number } | undefined

const packStyle = computed(() => ({
  '--tear': `${progress.value * 100}%`,
  '--lift': `${progress.value * 8}px`,
  '--pull': `${bend.value}deg`,
  '--tear-pivot': fromRight.value ? 'left' : 'right',
}))

function start(event: PointerEvent) {
  if (finger || !event.isPrimary || event.button !== 0) return
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
  <div class="tear-pack" :class="{ 'is-dragging': dragging, 'is-torn': torn, 'motion-reduced': reduced, 'tear-from-right': fromRight }" :style="packStyle">
    <div class="foil-body"><PackArt :booster="booster" /></div>
    <div class="foil-strip"><PackArt :booster="booster" /></div>
    <div
      v-if="!torn"
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
