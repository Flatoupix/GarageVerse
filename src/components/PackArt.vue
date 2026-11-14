<script setup lang="ts">
import { computed } from 'vue'
import { art } from '../game/art'
import { boosterById } from '../game/data'

const props = defineProps<{ booster: string }>()
const pack = computed(() => boosterById.get(props.booster)!)
</script>

<template>
  <div class="pack-art" :class="`pack-${booster}`" aria-hidden="true">
    <img v-if="art.pack(booster)" class="pack-picture" :src="art.pack(booster)" alt="" draggable="false" />
    <div class="pack-print">
      <div class="pack-topline"><span>GARAGEVERSE</span><span>001</span></div>
      <div class="pack-wordmark">{{ pack.name }}</div>
      <div class="pack-footer"><span>{{ pack.tagline }}</span><span>05 CARTES</span></div>
    </div>
    <div class="pack-crimp pack-crimp-top"></div>
    <div class="pack-crimp pack-crimp-bottom"></div>
  </div>
</template>
