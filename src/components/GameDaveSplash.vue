<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import logo from '../assets/ui/gamedave-logo.png'
import { reducedMotion } from '../game/store'

// Splash GAMEDAVE, repris de Crazy Popping Catz (layout `splash`, timeline `dave`) : fond noir, logo centré,
// fondu linéaire en 3 s, fin à 5 s ou au premier toucher. Cadre d'origine 720 × 1550 en « scale-outer ».
const emit = defineEmits<{ done: [] }>()
const DESIGN = { width: 720, height: 1550 }
const LOGO = { width: 463.62, height: 589.88, centerFromBottom: 775 }
const DURATION = 5000

const scale = ref(1)
const shown = ref(reducedMotion.value)
const layout = () => { scale.value = Math.min(innerWidth / DESIGN.width, innerHeight / DESIGN.height) }
layout()

let timer: ReturnType<typeof setTimeout> | undefined
let finished = false
function finish() {
  if (finished) return
  finished = true
  clearTimeout(timer)
  emit('done')
}
// Le toucher qui passe le splash ne doit pas activer le bouton de l'accueil situé dessous.
function skip(event: PointerEvent) {
  event.preventDefault()
  addEventListener('click', swallow, { capture: true, once: true })
  setTimeout(() => removeEventListener('click', swallow, { capture: true }), 600)
  finish()
}
const swallow = (event: Event) => { event.preventDefault(); event.stopPropagation() }
const onKey = (event: KeyboardEvent) => { if (['Enter', ' ', 'Escape'].includes(event.key)) { event.preventDefault(); finish() } }

onMounted(() => {
  addEventListener('resize', layout)
  addEventListener('keydown', onKey, true)
  timer = setTimeout(finish, DURATION)
  // Le fondu part à la frame suivante, une fois le logo affiché à opacité nulle.
  if (!shown.value) requestAnimationFrame(() => requestAnimationFrame(() => { shown.value = true }))
})
onUnmounted(() => {
  clearTimeout(timer)
  removeEventListener('resize', layout)
  removeEventListener('keydown', onKey, true)
})
</script>

<template>
  <div class="gamedave-splash" role="img" aria-label="GAMEDAVE" @pointerdown="skip">
    <img :src="logo" alt="" draggable="false" :class="{ shown, still: reducedMotion }"
      :style="{ width: `${LOGO.width * scale}px`, height: `${LOGO.height * scale}px`, bottom: `${LOGO.centerFromBottom * scale}px` }" />
  </div>
</template>

<style scoped>
.gamedave-splash { position: fixed; inset: 0; z-index: 2000; background: #000; overflow: hidden; cursor: pointer; touch-action: none; }
.gamedave-splash img { position: absolute; left: 50%; transform: translate(-50%, 50%); opacity: 0; transition: opacity 3s linear;
  pointer-events: none; user-select: none; -webkit-user-select: none; }
.gamedave-splash img.shown { opacity: 1; }
.gamedave-splash img.still { transition: none; }
</style>
