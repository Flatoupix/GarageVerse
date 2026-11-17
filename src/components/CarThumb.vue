<script setup lang="ts">
import { computed } from 'vue'
import { edition } from '../game/art'
import { rarityClass, rarityMark, vehicleById, type EditionStyle } from '../game/data'

// Vignette de planche (4 ou 5 voitures par ligne sur téléphone) : l'illustration, le numéro et la rareté en cadre de couleur.
// Une carte complète y serait illisible ; un toucher ouvre toujours la fiche.
const props = defineProps<{ id: string; styleName?: EditionStyle; missing?: boolean }>()
const v = computed(() => vehicleById.get(props.id)!)
const art = computed(() => props.missing ? undefined : edition(props.id, props.styleName).art)
</script>

<template>
  <span class="car-thumb" :class="[`rarity-${rarityClass[v.rarity]}`, { missing }]">
    <img v-if="art" :src="art" alt="" loading="lazy" decoding="async" draggable="false" />
    <span v-else class="car-thumb-blank" aria-hidden="true">?</span>
    <span class="car-thumb-number"><span aria-hidden="true">{{ rarityMark[v.rarity] }}</span> {{ v.number }}</span>
  </span>
</template>
