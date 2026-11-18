<script setup lang="ts">
// Choix Automatique / Manuel d'une course : rivaux, préparation de la Nuit sans fin et intermanche.
import { t } from '../i18n'
import type { PilotMode } from '../game/pilot'
import GvButton from './GvButton.vue'

const props = defineProps<{ id: string; help: string }>()
const mode = defineModel<PilotMode>({ required: true })
const label = (value: PilotMode) => value === 'manuel' ? t('Manuel') : t('Automatique')
</script>

<template>
  <section class="race-pilot">
    <h2 :id="`${props.id}-title`">{{ t('Pilotage') }}</h2>
    <div class="race-pilot-options" role="group" :aria-labelledby="`${props.id}-title`" :aria-describedby="`${props.id}-help`">
      <GvButton v-for="value in (['auto', 'manuel'] as const)" :key="value" variant="filter"
        :aria-pressed="mode === value" @click="mode = value">
        <span v-if="mode === value" aria-hidden="true">✓</span>
        {{ label(value) }}
      </GvButton>
    </div>
    <small :id="`${props.id}-help`">{{ props.help }}</small>
  </section>
</template>
