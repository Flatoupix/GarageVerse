<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { art } from '../game/art'
import { boosterById } from '../game/data'
import GameLogo from './GameLogo.vue'

const props = withDefaults(defineProps<{ booster: string; legend?: boolean }>(), { legend: false })
const pack = computed(() => boosterById.get(props.booster)!)
const picture = computed(() => art.pack(`${props.booster}${props.legend ? '-legend' : ''}`))
</script>

<template>
  <div class="pack-art" :class="[`pack-${booster}`, { 'pack-legend': legend }]" aria-hidden="true">
    <img v-if="picture" class="pack-picture" :src="picture" alt="" draggable="false" />
    <div class="pack-print">
      <GameLogo size="pack" :flicker="false" />
      <span v-if="legend" class="pack-ribbon">{{ t('Édition légendaire') }}</span>
      <div class="pack-wordmark">{{ t(pack.name) }}</div>
      <div class="pack-footer">{{ t('Collection 001 · 5 cartes') }}</div>
    </div>
    <span v-if="legend" class="pack-sparkles">✦ · ✧ · ✦</span>
    <div class="pack-crimp pack-crimp-top"></div>
    <div class="pack-crimp pack-crimp-bottom"></div>
  </div>
</template>
