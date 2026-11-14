<script setup lang="ts">
import { computed } from 'vue'
import { cardDetails, rarityPresentation, type EditionId } from '../catalog'

const props = defineProps<{ editionId: EditionId; cinematic?: boolean }>()
const details = computed(() => cardDetails(props.editionId))
const rarity = computed(() => rarityPresentation[details.value.card.rarity])
</script>

<template>
  <article class="card-face" :class="[`card-${details.edition.cardId}`, `finish-${rarity.finish}`]" :data-edition="editionId">
    <div class="card-art" :style="{ '--artwork': `url(${details.edition.artwork})` }">
      <img :src="details.edition.artwork" alt="" draggable="false" />
      <div v-if="cinematic && details.edition.drift" class="drift-scene" aria-hidden="true">
        <img :src="details.edition.drift.backdrop" alt="" class="drift-backdrop" />
        <div class="drift-tracks"></div>
        <div class="drift-smoke"></div>
        <img :src="details.edition.drift.car" alt="" class="drift-car" />
        <div class="drift-flare"></div>
      </div>
    </div>
    <div class="card-masthead">
      <span><span aria-hidden="true">{{ rarity.mark }}</span> {{ details.card.rarity }}</span>
      <span>001 / {{ details.card.number }}</span>
    </div>
    <div class="card-caption">
      <strong>{{ details.vehicle.name }}</strong>
      <span>{{ details.vehicle.version }}</span>
      <div class="card-signature">
        <span>{{ details.card.archetype }}</span>
        <b>{{ details.card.signature.name }}</b>
      </div>
      <div class="card-footer">
        <span class="card-edition">{{ details.edition.style }}</span>
        <span class="card-brand" aria-hidden="true">GV↗</span>
      </div>
      <div v-if="details.card.culture" class="card-aura">{{ details.card.culture.aura.join(' · ') }}</div>
    </div>
  </article>
</template>
