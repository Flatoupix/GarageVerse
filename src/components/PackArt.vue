<script setup lang="ts">
import { boosters, type BoosterId } from '../catalog'

defineProps<{ booster: BoosterId }>()
</script>

<template>
  <div class="pack-art" :class="{ 'pack-night': booster === 'after-hours' }" aria-hidden="true">
    <div class="pack-print">
      <div class="pack-topline"><span>GARAGEVERSE</span><span>001</span></div>
      <div class="pack-wordmark">{{ booster === 'standard' ? 'ROAD' : 'AFTER' }}<br />{{ booster === 'standard' ? 'SPEC.' : 'HOURS.' }}</div>
      <div class="pack-footer"><span>{{ boosters[booster].finish }}</span><span>05 CARTES</span></div>
    </div>
    <div class="pack-crimp pack-crimp-top"></div>
    <div class="pack-crimp pack-crimp-bottom"></div>
  </div>
</template>
