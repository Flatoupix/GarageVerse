<script setup lang="ts">
import { computed, ref } from 'vue'
import { boosterById, families, parts, series, vehicleById, vehicles } from '../game/data'
import { claimSeries, seriesComplete, seriesProgress, freeParts } from '../game/save'
import { act, ownedCount, reducedMotion, save } from '../game/store'
import { edition } from '../game/art'
import { confetti, palettes } from '../game/fx'
import CarBrowser from '../components/CarBrowser.vue'
import PartCard from '../components/PartCard.vue'

const emit = defineEmits<{ inspect: [kind: 'car' | 'part', id: string] }>()
const tab = ref<'cars' | 'parts' | 'series'>('cars')
const query = ref('')
const family = ref('')
const showMissing = ref(false)
const normalize = (name: string) => name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
const search = computed(() => normalize(query.value.trim()))
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
    <CarBrowser v-if="tab === 'cars'" mode="browse" @inspect="(kind, id) => emit('inspect', kind, id)" />
    <div v-if="tab === 'parts'" class="garage-tools">
      <div class="garage-toolbar-main">
        <div class="garage-search-group">
          <label class="garage-search"><span class="visually-hidden">Rechercher une pièce</span><input v-model="query" type="search" placeholder="Rechercher une pièce" /></label>
        </div>
        <div class="garage-selects">
          <label><span>Famille</span><select v-model="family"><option value="">Toutes</option><option v-for="(label, id) in families" :key="id" :value="id">{{ label }}</option></select></label>
          <label class="missing-toggle"><input v-model="showMissing" type="checkbox" /> Pièces manquantes</label>
        </div>
      </div>
    </div>

    <template v-if="tab === 'parts'">
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
    <div v-else-if="tab === 'series'" class="series-list">
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
