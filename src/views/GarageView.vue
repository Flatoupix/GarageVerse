<script setup lang="ts">
import { computed, ref } from 'vue'
import { families, parts, rarities, vehicles } from '../game/data'
import { freeParts, prepOf } from '../game/save'
import { ownedCount, save } from '../game/store'
import CarCard from '../components/CarCard.vue'
import PartCard from '../components/PartCard.vue'

const emit = defineEmits<{ inspect: [kind: 'car' | 'part', id: string] }>()
const tab = ref<'cars' | 'parts'>('cars')
const showMissing = ref(false)
const filter = ref('Tout')
const filters = ['Tout', 'Citadine', 'Sportive', 'Rallye', 'Muscle', 'Supercar', 'Hypercar', 'Tuning', 'Cinéma', 'Nostalgie']
const hasTag = (v: (typeof vehicles)[number], tag: string) => v.tags.includes(tag) || Boolean(v.culture?.aura.includes(tag))

const carList = computed(() => vehicles
  .filter(v => filter.value === 'Tout' || hasTag(v, filter.value))
  .filter(v => showMissing.value || save.cars[v.id]))
const ownedParts = computed(() => parts.filter(p => (save.parts[p.id] ?? 0) > 0))
const partList = computed(() => showMissing.value ? parts : ownedParts.value)
const partCount = computed(() => ownedParts.value.length)
const evolutionReady = (id: string) => vehicles.some(e => e.evolvesFrom === id && !save.cars[e.id] && (save.cars[id]?.stage ?? 0) >= (e.craft?.stage ?? 9))
const upgradable = (id: string) => (save.cars[id]?.copies ?? 0) > 1
</script>

<template>
  <main class="garage">
    <div class="page-heading">
      <span class="eyebrow"><span></span> Collection 001</span>
      <h1 tabindex="-1">Mon garage</h1>
    </div>
    <div class="tabs" role="tablist">
      <button type="button" role="tab" :aria-selected="tab === 'cars'" @click="tab = 'cars'">Voitures <span>{{ ownedCount }}/{{ vehicles.length }}</span></button>
      <button type="button" role="tab" :aria-selected="tab === 'parts'" @click="tab = 'parts'">Mécaniques <span>{{ partCount }}/{{ parts.length }}</span></button>
    </div>
    <div class="garage-tools">
      <div v-if="tab === 'cars'" class="chips" aria-label="Filtrer par catégorie">
        <button v-for="name in filters" :key="name" type="button" :aria-pressed="filter === name" @click="filter = name">{{ name }}</button>
      </div>
      <label class="missing-toggle"><input v-model="showMissing" type="checkbox" /> Afficher les cartes manquantes</label>
    </div>

    <div v-if="tab === 'cars'" class="garage-grid">
      <template v-for="(v, i) in carList" :key="v.id">
        <button v-if="save.cars[v.id]" type="button" class="card-tile deal" :style="{ '--i': Math.min(i, 9) }" @click="emit('inspect', 'car', v.id)">
          <CarCard :id="v.id" :style-name="save.cars[v.id].shown" :prep="prepOf(save, v.id)" compact />
          <span v-if="save.cars[v.id].copies > 1" class="copy-count">×{{ save.cars[v.id].copies }}</span>
          <span v-if="evolutionReady(v.id)" class="tile-tag">Évolution</span>
          <span v-else-if="save.lineup.includes(v.id)" class="tile-tag lineup-tag">Écurie</span>
          <span v-else-if="upgradable(v.id) && save.cars[v.id].stage < 3" class="tile-tag soft">Doublon</span>
        </button>
        <button v-else type="button" class="missing-card" @click="emit('inspect', 'car', v.id)">
          <span>{{ v.number }} / 50 · {{ v.rarity }}</span>
          <strong>{{ v.name }}</strong>
          <span>{{ v.craft ? 'Évolution à débloquer' : v.version }}</span>
        </button>
      </template>
    </div>
    <div v-else class="garage-grid parts-grid">
      <template v-for="(p, i) in partList" :key="p.id">
        <button v-if="save.parts[p.id]" type="button" class="card-tile deal" :style="{ '--i': Math.min(i, 9) }" @click="emit('inspect', 'part', p.id)">
          <PartCard :id="p.id" compact />
          <span class="copy-count">{{ freeParts(save, p.id) }}/{{ save.parts[p.id] }} libre{{ freeParts(save, p.id) > 1 ? 's' : '' }}</span>
        </button>
        <div v-else class="missing-card">
          <span>{{ families[p.family] }} · {{ p.rarity }}</span>
          <strong>{{ p.name }}</strong>
        </div>
      </template>
    </div>
    <p v-if="tab === 'cars' && !carList.length" class="garage-empty">Aucune voiture {{ filter }} pour l’instant.</p>
    <p class="garage-legend">Raretés : {{ rarities.join(' · ') }}. Le coût d’écurie limite ta sélection en course, le potentiel limite la préparation.</p>
  </main>
</template>
