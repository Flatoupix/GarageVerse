<script setup lang="ts">
import { t } from '../i18n'
import GameLogo from './GameLogo.vue'

defineProps<{ percent: number; canSkip: boolean }>()
defineEmits<{ skip: [] }>()
</script>

<template>
  <main class="garage-loading">
    <GameLogo :flicker="false" />
    <p>{{ t('Chargement du garage…') }}</p>
    <div class="loading-track" role="progressbar" :aria-label="t('Chargement du garage…')"
      :aria-valuenow="percent" :aria-valuemin="0" :aria-valuemax="100">
      <span :style="{ width: `${percent}%` }"></span>
    </div>
    <p class="loading-percent">{{ t('{n} %', { n: percent }) }}</p>
    <div class="loading-actions">
      <button v-if="canSkip" type="button" class="button quiet" @click="$emit('skip')">{{ t('Passer') }}</button>
    </div>
  </main>
</template>

<style scoped>
.garage-loading { display: grid; justify-items: center; align-content: center; gap: 14px; min-height: 100dvh; padding: 20px; text-align: center; }
.garage-loading :deep(.logo-garage) { font-size: clamp(42px, 15vw, 104px); }
.garage-loading p { margin: 0; }
.loading-track { width: min(100%, 300px); height: 12px; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; }
.loading-track span { display: block; height: 100%; background: var(--accent); }
.loading-percent { font: 700 .9rem var(--mono); }
.loading-actions { min-height: 48px; }
</style>
