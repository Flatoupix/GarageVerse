<script setup lang="ts">
import { computed, ref } from 'vue'
import { boosterById, families, parts, rarities, rarityClass, series, vehicleById, vehicles, type Rarity, type Vehicle } from '../game/data'
import { statsOf } from '../game/rules'
import { claimSeries, seriesComplete, seriesProgress, freeParts, prepOf } from '../game/save'
import { act, ownedCount, reducedMotion, save } from '../game/store'
import { edition } from '../game/art'
import { confetti, palettes } from '../game/fx'
import CarCard from '../components/CarCard.vue'
import PartCard from '../components/PartCard.vue'

const emit = defineEmits<{ inspect: [kind: 'car' | 'part', id: string] }>()
const tab = ref<'cars' | 'parts' | 'series'>('cars')
const garageFilter = ref<'owned' | 'favorites' | 'lineup' | 'collection'>('owned')
const garageFilters = [
  { id: 'owned', label: 'Mes voitures' }, { id: 'favorites', label: '★ Favoris' },
  { id: 'lineup', label: 'Écurie' }, { id: 'collection', label: 'Collection' },
] as const
const query = ref('')
const category = ref('')
const rarityFilter = computed<'' | Rarity>({
  get: () => save.preferences.garageRarity ?? '',
  set: value => { act(s => { s.preferences.garageRarity = value || undefined }) },
})
const family = ref('')
const showMissing = ref(false)
const sort = computed({
  get: () => save.preferences.garageSort ?? 'number',
  set: (value: string) => { act(s => { s.preferences.garageSort = value }) },
})
const quickSorts = [
  { id: 'number', label: 'Collection' }, { id: 'rarity', label: 'Rareté' },
  { id: 'power', label: 'Puissance' }, { id: 'name', label: 'Nom' }, { id: 'copies', label: 'Doublons' },
]
const colOptions = [
  { value: 0, label: 'Auto' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
] as const
const cols = computed(() => save.preferences.garageCols ?? 0)
const categories = [...new Set(vehicles.flatMap(v => [...v.tags, ...(v.culture?.aura ?? [])]))].sort((a, b) => a.localeCompare(b, 'fr'))
const normalize = (name: string) => name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
const search = computed(() => normalize(query.value.trim()))

function carStats(v: Vehicle) {
  return statsOf(v, prepOf(save, v.id))
}

function totalPower(v: Vehicle) {
  const s = carStats(v)
  return s.acc + s.vit + s.man + s.end
}

function prepScore(v: Vehicle) {
  if (!save.cars[v.id]) return -1
  const p = prepOf(save, v.id)
  const levels = Object.values(p.upgrades ?? {}).reduce<number>((sum, lvl) => sum + (lvl ?? 0), 0)
  return p.stage * 100 + levels * 10 + p.parts.length
}

function setCols(value: number) {
  act(s => { s.preferences.garageCols = value })
}

const carList = computed(() => vehicles.filter(v => {
  const car = save.cars[v.id]
  if (garageFilter.value !== 'collection' && !car) return false
  if (garageFilter.value === 'favorites' && !car?.favorite) return false
  if (garageFilter.value === 'lineup' && !save.lineup.includes(v.id)) return false
  if (rarityFilter.value && v.rarity !== rarityFilter.value) return false
  if (category.value && !v.tags.includes(category.value) && !v.culture?.aura.includes(category.value)) return false
  return normalize(`${v.name} ${v.version} ${v.year}`).includes(search.value)
}).sort((a, b) => {
  if (garageFilter.value === 'owned' && sort.value === 'number') {
    const favorite = Number(Boolean(save.cars[b.id]?.favorite)) - Number(Boolean(save.cars[a.id]?.favorite))
    if (favorite) return favorite
  }
  if (sort.value === 'name') return a.name.localeCompare(b.name, 'fr') || a.number.localeCompare(b.number)
  if (sort.value === 'cost') return a.cost - b.cost || a.number.localeCompare(b.number)
  if (sort.value === 'cost-desc') return b.cost - a.cost || a.number.localeCompare(b.number)
  if (sort.value === 'rarity') return rarities.indexOf(b.rarity) - rarities.indexOf(a.rarity) || a.number.localeCompare(b.number)
  if (sort.value === 'power') return totalPower(b) - totalPower(a) || a.number.localeCompare(b.number)
  if (sort.value === 'stage') return prepScore(b) - prepScore(a) || totalPower(b) - totalPower(a) || a.number.localeCompare(b.number)
  if (sort.value === 'acc') return carStats(b).acc - carStats(a).acc || a.number.localeCompare(b.number)
  if (sort.value === 'vit') return carStats(b).vit - carStats(a).vit || a.number.localeCompare(b.number)
  if (sort.value === 'man') return carStats(b).man - carStats(a).man || a.number.localeCompare(b.number)
  if (sort.value === 'end') return carStats(b).end - carStats(a).end || a.number.localeCompare(b.number)
  if (sort.value === 'copies') return (save.cars[b.id]?.copies ?? 0) - (save.cars[a.id]?.copies ?? 0) || a.number.localeCompare(b.number)
  if (sort.value === 'year') return b.year - a.year || a.number.localeCompare(b.number)
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
function collectSeries(id: string) {
  if (act(s => claimSeries(s, id), 'Récompense récupérée', 'collect') && !reducedMotion.value) confetti(palettes.gold)
}
const seriesCars = (ids: string[]) => ids.map(id => vehicleById.get(id)!)
</script>

<template>
  <main class="garage">
    <div class="page-heading">
      <h1 tabindex="-1">Mon garage</h1>
    </div>
    <div class="tabs garage-tabs" aria-label="Inventaire">
      <button type="button" :aria-pressed="tab === 'cars'" @click="selectTab('cars')">Voitures <span>{{ ownedCount }}/{{ vehicles.length }}</span></button>
      <button type="button" :aria-pressed="tab === 'parts'" @click="selectTab('parts')">Mécaniques <span>{{ ownedParts.length }}/{{ parts.length }}</span></button>
      <button type="button" :aria-pressed="tab === 'series'" @click="selectTab('series')">Séries <span v-help="'series'" aria-label="Aide sur les séries">?</span></button>
    </div>
    <div v-if="tab !== 'series'" class="garage-tools">
      <div v-if="tab === 'cars'" class="chips garage-filters" aria-label="Afficher les voitures">
        <button v-for="f in garageFilters" :key="f.id" type="button" :aria-pressed="garageFilter === f.id" @click="garageFilter = f.id">{{ f.label }}</button>
      </div>
      <div class="garage-toolbar-main">
        <div class="garage-search-group">
          <label class="garage-search">
            <span class="visually-hidden">Rechercher {{ tab === 'cars' ? 'une voiture' : 'une pièce' }}</span>
            <input v-model="query" type="search" :placeholder="tab === 'cars' ? 'Rechercher une voiture (nom, année…)' : 'Rechercher une pièce'" />
          </label>
          <template v-if="tab === 'cars'">
            <div class="chips garage-rarity-chips" role="group" aria-label="Filtrer par rareté">
              <button type="button" :aria-pressed="rarityFilter === ''" @click="rarityFilter = ''">Toutes</button>
              <button v-for="r in rarities" :key="r" type="button" :class="`rarity-${rarityClass[r]}`" :aria-pressed="rarityFilter === r" @click="rarityFilter = r">{{ r }}</button>
            </div>
            <div class="chips garage-sort-chips" role="group" aria-label="Trier les voitures">
              <button v-for="option in quickSorts" :key="option.id" type="button" :aria-pressed="sort === option.id" @click="sort = option.id">{{ option.label }}</button>
            </div>
          </template>
        </div>
        <div class="garage-selects" :class="{ 'cars-selects': tab === 'cars' }">
          <template v-if="tab === 'cars'">
            <label>
              <span>Catégorie</span>
              <select v-model="category">
                <option value="">Toutes</option>
                <option v-for="name in categories" :key="name">{{ name }}</option>
              </select>
            </label>
            <label>
              <span>Autres tris</span>
              <select v-model="sort">
                <option value="number">Collection (n°)</option>
                <option value="rarity">Rareté</option>
                <option value="power">Puissance totale</option>
                <option value="stage">Niveau d’amélioration</option>
                <option value="cost">Coût d’écurie (croissant)</option>
                <option value="cost-desc">Coût d’écurie (décroissant)</option>
                <option value="acc">Accélération</option>
                <option value="vit">Vitesse</option>
                <option value="man">Maniabilité</option>
                <option value="end">Endurance</option>
                <option value="copies">Exemplaires / doublons</option>
                <option value="year">Année</option>
                <option value="name">Nom (A-Z)</option>
              </select>
            </label>
          </template>
          <template v-else>
            <label><span>Famille</span><select v-model="family"><option value="">Toutes</option><option v-for="(label, id) in families" :key="id" :value="id">{{ label }}</option></select></label>
            <label class="missing-toggle"><input v-model="showMissing" type="checkbox" /> Pièces manquantes</label>
          </template>
        </div>
      </div>

      <div v-if="tab === 'cars'" class="garage-density-bar">
        <span class="garage-count">{{ carList.length }} voiture{{ carList.length > 1 ? 's' : '' }}</span>
        <div class="garage-density" role="group" aria-label="Nombre de voitures par ligne">
          <span class="density-label">Par ligne</span>
          <div class="chips density-chips">
            <button
              v-for="opt in colOptions"
              :key="opt.value"
              type="button"
              :class="`col-opt-${opt.value}`"
              :aria-pressed="cols === opt.value"
              :aria-label="opt.value === 0 ? 'Nombre de colonnes automatique' : `${opt.value} voiture${opt.value > 1 ? 's' : ''} par ligne`"
              @click="setCols(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <template v-if="tab === 'cars'">
      <div
        v-if="carList.length"
        class="garage-grid"
        :class="{ 'grid-custom': cols > 0, 'grid-single': cols === 1, 'grid-dense': cols >= 4 }"
        :style="cols > 0 ? { '--garage-cols': String(cols) } : undefined"
      >
        <div v-for="v in carList" :key="v.id" class="garage-tile">
          <template v-if="save.cars[v.id]">
            <button type="button" class="card-tile" :aria-label="`Voir ${v.name} ${v.version}`" @click="emit('inspect', 'car', v.id)">
              <span v-if="!save.seenCars?.includes(v.id)" class="new-car-badge">Nouveau</span>
              <CarCard :id="v.id" :style-name="save.cars[v.id].shown" :prep="prepOf(save, v.id)" :compact="cols !== 1" />
              <span v-if="save.cars[v.id].copies > 1" class="copy-count">×{{ save.cars[v.id].copies }}</span>
              <span v-if="save.lineup.includes(v.id)" class="tile-tag lineup-tag">Écurie</span>
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
    </template>

    <template v-else-if="tab === 'parts'">
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
    <div v-else class="series-list">
      <section v-for="entry in series" :key="entry.id" class="series-card" :aria-labelledby="`series-${entry.id}`">
        <h2 :id="`series-${entry.id}`">{{ entry.name }}</h2>
        <p>{{ entry.description }}</p>
        <p><span v-help="'seriesReward'">Récompense de série</span></p>
        <p>Crédits : +{{ entry.reward.credits }}</p>
        <p v-if="entry.reward.ticket">Ticket de booster : +1 ticket {{ boosterById.get(entry.reward.ticket)!.name }}</p>
        <div class="series-progress" role="progressbar" :aria-label="entry.name" :aria-valuenow="seriesProgress(save, entry)" :aria-valuemax="entry.vehicles.length" :aria-valuemin="0">
          <span :style="{ width: `${seriesProgress(save, entry) / entry.vehicles.length * 100}%` }"></span>
        </div>
        <p>{{ seriesProgress(save, entry) }} / {{ entry.vehicles.length }}<template v-if="seriesComplete(save, entry)"> · Série complète</template></p>
        <div class="series-cars">
          <button v-for="v in seriesCars(entry.vehicles)" :key="v.id" type="button" class="series-car" :aria-label="`Voir ${v.name} ${v.version}${save.cars[v.id] ? '' : ' · manquante'}`" @click="emit('inspect', 'car', v.id)">
            <img v-if="save.cars[v.id]" :src="edition(v.id, save.cars[v.id].shown).art" alt="" />
            <svg v-else class="series-silhouette" viewBox="0 0 120 90" aria-hidden="true"><path d="M10 55 17 43 35 39 48 25H79L96 41 110 47V65H99a12 12 0 0 1-24 0H44a12 12 0 0 1-24 0H10Z" /></svg>
            <span v-if="save.cars[v.id] && !save.seenCars?.includes(v.id)" class="new-car-badge">Nouveau</span>
            <strong>{{ v.name }}</strong><span>{{ v.version }}</span>
            <small>{{ save.cars[v.id] ? save.cars[v.id].shown : 'Manquante' }}</small>
          </button>
        </div>
        <p v-if="save.series.includes(entry.id)" role="status">Récompense récupérée</p>
        <button v-else-if="seriesComplete(save, entry)" class="button primary" type="button" @click="collectSeries(entry.id)">Récupérer la récompense</button>
      </section>
    </div>
  </main>
</template>
