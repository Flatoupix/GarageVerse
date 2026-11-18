<script setup lang="ts">
import { computed } from 'vue'
import { t, tp } from '../i18n'
import { statLabels } from '../game/data'
import { upgradeKeys } from '../game/rules'
import { normalizeTradeCar } from '../game/trade'
import CarCard from './CarCard.vue'

const props = defineProps<{ id: string; snapshot: unknown; compact?: boolean }>()
const car = computed(() => normalizeTradeCar(props.id, props.snapshot))
</script>

<template>
  <div class="trade-card">
    <template v-if="car">
      <CarCard :id="id" :style-name="car.shown" :prep="car" :compact="compact" />
      <p>{{ t('Stage {n} sur 3', { n: car.stage }) }} · {{ tp('{n} exemplaire', '{n} exemplaires', car.copies) }}</p>
      <dl>
        <div v-for="key in upgradeKeys" :key="key"><dt>{{ t(statLabels[key]) }}</dt><dd>{{ car.upgrades[key] }}</dd></div>
      </dl>
    </template>
    <p v-else>{{ t('Carte indisponible') }}</p>
  </div>
</template>

<style scoped>
.trade-card { container-type: inline-size; min-width: 0; overflow-wrap: anywhere; }
.trade-card p, .trade-card dl { margin-block: 4px; }
.trade-card dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 8px; font-size: .8rem; }
.trade-card dl div { display: flex; flex-wrap: wrap; gap: 2px 6px; }
.trade-card dd { margin: 0; font-weight: 700; }
</style>
