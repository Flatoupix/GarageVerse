<script setup lang="ts">
import { computed, ref } from 'vue'
import { vehicles, rarityClass, type Rarity, type Rival } from '../game/data'
import { circuitPriorities, circuitScores, lineupCost, racer } from '../game/rules'
import { prepOf } from '../game/save'
import { act, save } from '../game/store'
import { browserSort, filterCars, normalize, overBudget, type BrowserView } from '../game/carBrowser'
import CarCard from './CarCard.vue'
import CarFilterBar from './CarFilterBar.vue'
const props = withDefaults(defineProps<{ mode: 'browse' | 'pick'; lineup?: string[]; cap?: number; circuit?: Rival['circuit'] }>(), { cap: Infinity })
const emit = defineEmits<{ inspect: [kind: 'car', id: string]; toggle: [id: string] }>()
const garageFilter = ref<BrowserView>('owned')
const query = ref('')
const search = computed(() => normalize(query.value.trim()))
const selected = computed(() => props.lineup ?? save.lineup)
const category = computed({ get: () => save.preferences.garageCategory ?? '', set: value => { act(s => { s.preferences.garageCategory = value || undefined }) } })
const rarityFilter = computed<'' | Rarity>({ get: () => save.preferences.garageRarity ?? '', set: value => { act(s => { s.preferences.garageRarity = value || undefined }) } })
const sort = computed({ get: () => browserSort(save.preferences, props.mode), set: value => { act(s => { s.preferences.garageSort = value }) } })
const cols = computed({ get: () => save.preferences.garageCols ?? 0, set: value => { act(s => { s.preferences.garageCols = value }) } })
const estimates = computed(() => Object.fromEntries(vehicles.filter(v => save.cars[v.id]).map(v => {
  const scores = props.circuit ? circuitScores(racer(v.id, prepOf(save, v.id)), props.circuit) : []
  return [v.id, scores]
})))
const averages = computed(() => Object.fromEntries(Object.entries(estimates.value).map(([id, scores]) => [id, scores.reduce((sum, s) => sum + s.average * s.times, 0) / (props.circuit?.sectors.length || 1)])))
const priorities = computed(() => props.circuit ? circuitPriorities(props.circuit) : [])
const overBy = (id: string, price: number) => overBudget(id, price, selected.value, lineupCost(selected.value), props.cap)
const carList = computed(() => filterCars(save, { view: garageFilter.value, rarity: rarityFilter.value, category: category.value, query: query.value }, sort.value, selected.value, averages.value))
const rarityCount = (rarity?: Rarity) => filterCars(save, { view: garageFilter.value, rarity: rarity ?? '', category: '', query: '' }, 'number', selected.value).length
const pointsText = (value: number) => value.toFixed(1).replace('.', ',')
</script>
<template>
  <div class="car-browser">
    <CarFilterBar :mode="mode" :count="carList.length" :rarity-count="rarityCount" v-model:view="garageFilter" v-model:query="query" v-model:category="category" v-model:rarity="rarityFilter" v-model:sort="sort" v-model:cols="cols" />
    <p v-if="mode === 'pick' && selected.length >= 3" class="hint" role="status">Retire d’abord une voiture</p>
    <div
      v-if="carList.length"
      class="garage-grid"
      :class="{ 'grid-custom': cols > 0, 'grid-single': cols === 1, 'grid-dense': cols >= 4 }"
      :style="cols > 0 ? { '--garage-cols': String(cols) } : undefined"
    >
      <div v-for="v in carList" :key="v.id" class="garage-tile">
        <template v-if="save.cars[v.id]">
          <button type="button" class="card-tile" :aria-label="`${mode === 'pick' ? (selected.includes(v.id) ? 'Retirer' : 'Sélectionner') : 'Voir'} ${v.name} ${v.version}`" :aria-pressed="mode === 'pick' ? selected.includes(v.id) : undefined" :disabled="mode === 'pick' && overBy(v.id, v.cost) > 0" @click="mode === 'pick' ? emit('toggle', v.id) : emit('inspect', 'car', v.id)">
            <span v-if="!save.seenCars?.includes(v.id)" class="new-car-badge">Nouveau</span>
            <CarCard :id="v.id" :style-name="save.cars[v.id].shown" :prep="prepOf(save, v.id)" :compact="cols !== 1" />
            <span v-if="save.cars[v.id].copies > 1" class="copy-count">×{{ save.cars[v.id].copies }}</span>
            <span v-if="mode === 'browse' && selected.includes(v.id)" class="tile-tag lineup-tag">Écurie</span>
            <span v-if="mode === 'pick'" class="browser-pick-info">
              <span v-if="selected.includes(v.id)" class="browser-place">✓ {{ selected.indexOf(v.id) + 1 }}</span>
              <span class="pick-cost" :data-cost="v.cost">{{ v.cost }}</span>
              <span v-for="score in estimates[v.id]?.filter(s => s.times === priorities[0]?.times)" :key="score.stat">{{ score.label }} {{ pointsText(score.average) }} pts</span>
              <span v-if="overBy(v.id, v.cost) > 0">Dépasse le plafond de {{ overBy(v.id, v.cost) }}</span>
            </span>
          </button>
          <button type="button" class="favorite-button" :aria-label="`Favori · ${v.name} ${v.version}`" :aria-pressed="save.cars[v.id].favorite"
            @click="act(s => { s.cars[v.id].favorite = !s.cars[v.id].favorite })"><span aria-hidden="true">{{ save.cars[v.id].favorite ? '★' : '☆' }}</span></button>
        </template>
        <button v-else type="button" class="missing-card" :class="`rarity-${rarityClass[v.rarity]}`" @click="emit('inspect', 'car', v.id)">
          <span>{{ v.number }} / {{ vehicles.length }} · {{ v.rarity }}</span>
          <strong>{{ v.name }}</strong>
          <span>{{ v.craft ? 'Évolution à débloquer' : v.version }}</span>
        </button>
      </div>
    </div>
    <p v-else class="garage-empty">{{ garageFilter === 'favorites' && !search && !category && !rarityFilter ? 'Touche l’étoile d’une voiture pour la retrouver ici.' : 'Aucune voiture pour ces filtres.' }}</p>
  </div>
</template>
