<script setup lang="ts">
import type { Pull } from '../game/save'
import CarCard from './CarCard.vue'
import PartCard from './PartCard.vue'

defineProps<{ pull: Pull; cinematic?: boolean; compact?: boolean }>()
</script>

<template>
  <CarCard v-if="pull.kind === 'car'" :id="pull.id" :style-name="pull.style" :cinematic="cinematic" :compact="compact" />
  <PartCard v-else :id="pull.id" :compact="compact" />
</template>
