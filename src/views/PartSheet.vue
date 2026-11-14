<script setup lang="ts">
import { computed } from 'vue'
import { partById, progression, vehicleById } from '../game/data'
import { compatibility } from '../game/rules'
import { freeParts, scrapPart } from '../game/save'
import { vTilt } from '../game/fx'
import { act, save } from '../game/store'
import PartCard from '../components/PartCard.vue'

const props = defineProps<{ id: string }>()
const emit = defineEmits<{ open: [id: string] }>()
const part = computed(() => partById.get(props.id)!)
const mounted = computed(() => Object.entries(save.cars).filter(([, c]) => c.parts.includes(props.id)).map(([id]) => vehicleById.get(id)!))
const fits = computed(() => Object.keys(save.cars).map(id => vehicleById.get(id)!).filter(v => !compatibility(part.value, v) && !mounted.value.includes(v)))
</script>

<template>
  <div class="sheet">
    <div class="sheet-card part-sheet-card"><div v-tilt><PartCard :id="id" /></div></div>
    <section class="sheet-section">
      <h3>Stock</h3>
      <p class="hint">{{ save.parts[id] ?? 0 }} exemplaire{{ (save.parts[id] ?? 0) > 1 ? 's' : '' }}, {{ Math.max(0, freeParts(save, id)) }} libre{{ freeParts(save, id) > 1 ? 's' : '' }}. Une pièce installée occupe un exemplaire et du potentiel de préparation.</p>
      <p v-if="mounted.length" class="hint">Installée sur : <template v-for="(v, i) in mounted" :key="v.id"><button type="button" class="link" @click="emit('open', v.id)">{{ v.name }}</button>{{ i < mounted.length - 1 ? ', ' : '' }}</template></p>
      <button v-if="freeParts(save, id) > 0" type="button" class="button small quiet"
        @click="act(s => scrapPart(s, id), `+${Math.round(progression.scrap[part.rarity] / 2)} crédits`)">
        Recycler un exemplaire libre
      </button>
    </section>
    <section class="sheet-section">
      <h3>Compatible avec ton garage</h3>
      <p v-if="!fits.length" class="hint">Aucune autre voiture de ton garage ne peut la recevoir.</p>
      <div class="fit-list">
        <button v-for="v in fits" :key="v.id" type="button" class="chip" @click="emit('open', v.id)">{{ v.name }} {{ v.version }}</button>
      </div>
    </section>
  </div>
</template>
