<script setup lang="ts">
import { computed } from 'vue'
import type { Opening } from '../collection'
import { cardDetails } from '../catalog'
import CardFace from './CardFace.vue'

const props = defineProps<{ opening: Opening; faceUp: boolean; flipping: boolean; entering: boolean; cinematic: boolean }>()
defineEmits<{ flip: []; next: []; quick: [] }>()

const slot = computed(() => props.faceUp ? props.opening.revealed - 1 : props.opening.revealed)
const edition = computed(() => props.opening.editions[slot.value])
const title = computed(() => cardDetails(edition.value).vehicle.name)
</script>

<template>
  <div class="reveal" :class="{ 'stack-entering': entering }">
    <div class="stack-stage">
      <div class="card-stack">
        <div v-if="slot < 4" class="stack-edge" aria-hidden="true"></div>
        <div :key="slot" class="flip-card" :class="{ 'is-flipping': flipping }">
          <button
            v-if="!faceUp" type="button" class="card-back" :aria-label="`Retourner la carte ${slot + 1}`"
            @click="$emit('flip')"
          >
            <span class="back-inset"></span><span class="back-monogram">GV<span>↗</span></span>
            <span class="back-caption">GARAGEVERSE</span>
          </button>
          <div v-else class="card-back back-decoration" aria-hidden="true">
            <span class="back-inset"></span><span class="back-monogram">GV<span>↗</span></span>
            <span class="back-caption">GARAGEVERSE</span>
          </div>
          <div v-if="faceUp" class="flip-front"><CardFace :edition-id="edition" :cinematic="cinematic" /></div>
        </div>
      </div>
    </div>
    <div class="stack-indicators" aria-hidden="true">
      <span v-for="position in 5" :key="position" :class="{ revealed: position <= opening.revealed, current: position === slot + 1 }"></span>
    </div>
    <p class="stack-status" role="status">{{ faceUp ? title : `Carte ${slot + 1} sur 5` }}</p>
    <div class="stack-actions">
      <button v-if="faceUp" type="button" class="button primary" @click="$emit('next')">
        {{ opening.revealed === 5 ? 'Voir le récapitulatif' : 'Carte suivante' }} <span aria-hidden="true">→</span>
      </button>
      <button v-else type="button" class="button primary" @click="$emit('flip')">
        Retourner la carte <span aria-hidden="true">↻</span>
      </button>
      <button v-if="opening.revealed < 5" type="button" class="button quiet" @click="$emit('quick')">Tout révéler</button>
    </div>
  </div>
</template>
