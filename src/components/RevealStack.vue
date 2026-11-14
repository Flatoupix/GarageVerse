<script setup lang="ts">
import { computed } from 'vue'
import { partById, vehicleById } from '../game/data'
import { vTilt } from '../game/fx'
import type { Opening } from '../game/save'
import PullCard from './PullCard.vue'

const props = defineProps<{ opening: Opening; faceUp: boolean; flipping: boolean; entering: boolean; cinematic: boolean; tell?: string; glow?: string }>()
defineEmits<{ flip: []; next: []; quick: [] }>()

const slot = computed(() => props.faceUp ? props.opening.revealed - 1 : props.opening.revealed)
const pull = computed(() => props.opening.pulls[slot.value])
const title = computed(() => pull.value.kind === 'car'
  ? `${vehicleById.get(pull.value.id)!.name} · ${vehicleById.get(pull.value.id)!.rarity}`
  : `${partById.get(pull.value.id)!.name} · Mécanique`)
const total = computed(() => props.opening.pulls.length)
</script>

<template>
  <div class="reveal" :class="{ 'stack-entering': entering }">
    <div class="stack-stage" :class="glow && `glow-${glow}`">
      <div v-if="glow === 'legendary' || glow === 'epic'" class="stage-rays" aria-hidden="true"></div>
      <div class="card-stack">
        <div v-if="slot < total - 1" class="stack-edge" aria-hidden="true"></div>
        <div :key="slot" class="flip-card" :class="{ 'is-flipping': flipping }">
          <button v-if="!faceUp" type="button" class="card-back" :class="tell && `tell-${tell}`" :aria-label="`Retourner la carte ${slot + 1}`" @click="$emit('flip')">
            <span class="back-inset"></span><span class="back-sun"></span><span class="back-monogram">GV</span>
            <span class="back-caption">GARAGEVERSE</span>
          </button>
          <div v-else class="card-back back-decoration" aria-hidden="true">
            <span class="back-inset"></span><span class="back-sun"></span><span class="back-monogram">GV</span>
            <span class="back-caption">GARAGEVERSE</span>
          </div>
          <div v-if="faceUp" class="flip-front">
            <div v-tilt><PullCard :pull="pull" :cinematic="cinematic" /></div>
            <span v-if="pull.isNew" class="new-badge">Nouveau</span>
          </div>
        </div>
      </div>
    </div>
    <div class="stack-indicators" aria-hidden="true">
      <span v-for="position in total" :key="position" :class="{ revealed: position <= opening.revealed, current: position === slot + 1 }"></span>
    </div>
    <p class="stack-status" role="status">{{ faceUp ? title : `Carte ${slot + 1} sur ${total}` }}</p>
    <div class="stack-actions">
      <button v-if="faceUp" type="button" class="button primary" @click="$emit('next')">
        {{ opening.revealed === total ? 'Voir le récapitulatif' : 'Carte suivante' }} <span aria-hidden="true">→</span>
      </button>
      <button v-else type="button" class="button primary" @click="$emit('flip')">
        Retourner la carte <span aria-hidden="true">↻</span>
      </button>
      <button v-if="opening.revealed < total" type="button" class="button quiet" @click="$emit('quick')">Tout révéler</button>
    </div>
  </div>
</template>
