<script setup lang="ts">
import { computed, ref } from 'vue'
import { families, parts, rarities, vehicles } from '../game/data'
import { freeParts, prepOf } from '../game/save'
import { act, ownedCount, save } from '../game/store'
import CarCard from '../components/CarCard.vue'
import PartCard from '../components/PartCard.vue'

const emit = defineEmits<{ inspect: [kind: 'car' | 'part', id: string] }>()
const tab = ref<'cars' | 'parts'>('cars')
const garageFilter = ref<'owned' | 'favorites' | 'lineup' | 'collection'>('owned')
const garageFilters = [
  { id: 'owned', label: 'Mes voitures' }, { id: 'favorites', label: '★ Favoris' },
  { id: 'lineup', label: 'Écurie' }, { id: 'collection', label: 'Collection' },
] as const
const query = ref('')
const category = ref('')
const family = ref('')
const showMissing = ref(false)
const sort = ref('number')
const categories = [...new Set(vehicles.flatMap(v => [...v.tags, ...(v.culture?.aura ?? [])]))].sort((a, b) => a.localeCompare(b, 'fr'))
const normalize = (name: string) => name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
const search = computed(() => normalize(query.value.trim()))
const carList = computed(() => vehicles.filter(v => {
  const car = save.cars[v.id]
  if (garageFilter.value !== 'collection' && !car) return false
  if (garageFilter.value === 'favorites' && !car.favorite) return false
  if (garageFilter.value === 'lineup' && !save.lineup.includes(v.id)) return false
  if (category.value && !v.tags.includes(category.value) && !v.culture?.aura.includes(category.value)) return false
  return normalize(`${v.name} ${v.version}`).includes(search.value)
}).sort((a, b) => {
  if (garageFilter.value === 'owned') {
    const favorite = Number(save.cars[b.id].favorite) - Number(save.cars[a.id].favorite)
    if (favorite) return favorite
  }
  if (sort.value === 'name') return a.name.localeCompare(b.name, 'fr') || a.number.localeCompare(b.number)
  if (sort.value === 'cost') return a.cost - b.cost || a.number.localeCompare(b.number)
  if (sort.value === 'rarity') return rarities.indexOf(b.rarity) - rarities.indexOf(a.rarity) || a.number.localeCompare(b.number)
  return a.number.localeCompare(b.number)
}))
const ownedParts = computed(() => parts.filter(p => (save.parts[p.id] ?? 0) > 0))
const partGroups = computed(() => Object.entries(families)
  .filter(([id]) => !family.value || family.value === id)
  .map(([id, label]) => ({ id, label, parts: (showMissing.value ? parts : ownedParts.value)
    .filter(p => p.family === id && normalize(`${p.name} ${label}`).includes(search.value)) }))
  .filter(group => group.parts.length))

function selectTab(next: typeof tab.value) {
  tab.value = next
  query.value = ''
}
</script>

<template>
  <main class="garage">
    <div class="page-heading">
      <h1 tabindex="-1">Mon garage</h1>
    </div>
    <div class="tabs" aria-label="Inventaire">
      <button type="button" :aria-pressed="tab === 'cars'" @click="selectTab('cars')">Voitures <span>{{ ownedCount }}/{{ vehicles.length }}</span></button>
      <button type="button" :aria-pressed="tab === 'parts'" @click="selectTab('parts')">Pièces <span>{{ ownedParts.length }}/{{ parts.length }}</span></button>
    </div>
    <div class="garage-tools">
      <div v-if="tab === 'cars'" class="chips garage-filters" aria-label="Afficher les voitures">
        <button v-for="f in garageFilters" :key="f.id" type="button" :aria-pressed="garageFilter === f.id" @click="garageFilter = f.id">{{ f.label }}</button>
      </div>
      <label class="garage-search">
        <span class="visually-hidden">Rechercher {{ tab === 'cars' ? 'une voiture' : 'une pièce' }}</span>
        <input v-model="query" type="search" :placeholder="tab === 'cars' ? 'Rechercher une voiture' : 'Rechercher une pièce'" />
      </label>
      <div class="garage-selects">
        <template v-if="tab === 'cars'">
          <label><span>Catégorie</span><select v-model="category"><option value="">Toutes</option><option v-for="name in categories" :key="name">{{ name }}</option></select></label>
          <label><span>Tri</span><select v-model="sort"><option value="number">Collection</option><option value="name">Nom</option><option value="cost">Coût d’écurie</option><option value="rarity">Rareté</option></select></label>
        </template>
        <template v-else>
          <label><span>Famille</span><select v-model="family"><option value="">Toutes</option><option v-for="(label, id) in families" :key="id" :value="id">{{ label }}</option></select></label>
          <label class="missing-toggle"><input v-model="showMissing" type="checkbox" /> Pièces manquantes</label>
        </template>
      </div>
    </div>

    <template v-if="tab === 'cars'">
      <div v-if="carList.length" class="garage-grid">
        <div v-for="v in carList" :key="v.id" class="garage-tile">
          <template v-if="save.cars[v.id]">
            <button type="button" class="card-tile" :aria-label="`Voir ${v.name} ${v.version}`" @click="emit('inspect', 'car', v.id)">
              <CarCard :id="v.id" :style-name="save.cars[v.id].shown" :prep="prepOf(save, v.id)" compact />
              <span v-if="save.cars[v.id].copies > 1" class="copy-count">×{{ save.cars[v.id].copies }}</span>
              <span v-if="save.lineup.includes(v.id)" class="tile-tag lineup-tag">Écurie</span>
            </button>
            <button type="button" class="favorite-button" :aria-label="`Favori · ${v.name} ${v.version}`" :aria-pressed="save.cars[v.id].favorite"
              @click="act(s => { s.cars[v.id].favorite = !s.cars[v.id].favorite })"><span aria-hidden="true">{{ save.cars[v.id].favorite ? '★' : '☆' }}</span></button>
          </template>
          <button v-else type="button" class="missing-card" @click="emit('inspect', 'car', v.id)">
            <span>{{ v.number }} / {{ vehicles.length }} · {{ v.rarity }}</span>
            <strong>{{ v.name }}</strong>
            <span>{{ v.craft ? 'Évolution à débloquer' : v.version }}</span>
          </button>
        </div>
      </div>
      <p v-else class="garage-empty">{{ garageFilter === 'favorites' && !search && !category ? 'Touche l’étoile d’une voiture pour la retrouver ici.' : 'Aucune voiture pour ces filtres.' }}</p>
    </template>

    <template v-else>
      <section v-for="group in partGroups" :key="group.id" class="garage-part-group">
        <h2>{{ group.label }}</h2>
        <div class="garage-grid parts-grid">
          <template v-for="p in group.parts" :key="p.id">
            <button v-if="save.parts[p.id]" type="button" class="card-tile" @click="emit('inspect', 'part', p.id)">
              <PartCard :id="p.id" compact />
              <span class="copy-count">{{ freeParts(save, p.id) }}/{{ save.parts[p.id] }} libre{{ freeParts(save, p.id) > 1 ? 's' : '' }}</span>
            </button>
            <div v-else class="missing-card"><span>{{ p.rarity }}</span><strong>{{ p.name }}</strong></div>
          </template>
        </div>
      </section>
      <p v-if="!partGroups.length" class="garage-empty">Aucune pièce pour ces filtres.</p>
    </template>
  </main>
</template>
