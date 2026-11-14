<script setup lang="ts">
import { computed } from 'vue'
import { cardDetails, type EditionId } from '../catalog'

const props = defineProps<{ editionId: EditionId; cinematic?: boolean }>()
const details = computed(() => cardDetails(props.editionId))
</script>

<template>
  <article class="card-face" :class="`card-${details.edition.cardId}`" :data-edition="editionId">
    <div class="card-masthead">
      <span>{{ details.card.rarity }}</span><span>001 / {{ details.card.number }}</span>
    </div>
    <div class="card-art">
      <img :src="details.edition.artwork" alt="" draggable="false" />
      <div v-if="cinematic && details.edition.drift" class="drift-scene" aria-hidden="true">
        <img :src="details.edition.drift.backdrop" alt="" class="drift-backdrop" />
        <div class="drift-tracks"></div>
        <div class="drift-smoke"></div>
        <img :src="details.edition.drift.car" alt="" class="drift-car" />
        <div class="drift-flare"></div>
      </div>
    </div>
    <div class="card-caption">
      <div class="card-edition">{{ details.edition.style }}</div>
      <strong>{{ details.vehicle.name }}</strong>
      <span>{{ details.vehicle.version }}</span>
      <div v-if="details.card.culture" class="card-aura">✦ {{ details.card.culture.aura.join(' · ') }}</div>
    </div>
  </article>
</template>
