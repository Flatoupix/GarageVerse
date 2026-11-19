<script setup lang="ts">
import { computed, ref } from 'vue'
import { inTransit } from '../game/trade'
import { locale, t, tp, tc } from '../i18n'
import { boosterById, families, parts, rarities, rarityClass, rarityMark, series, stylesOf, vehicleById, vehicles, type Rarity, type Vehicle } from '../game/data'
import { statsOf } from '../game/rules'
import { claimSeries, craftCheck, seriesComplete, seriesProgress, freeParts, prepOf, totalMountedParts, uninstallAll } from '../game/save'
import { act, exchangeAlerts, narrow, ownedCount, reducedMotion, save } from '../game/store'
import { edition } from '../game/art'
import { confetti, palettes } from '../game/fx'
import CarCard from '../components/CarCard.vue'
import CarThumb from '../components/CarThumb.vue'
import GvButton from '../components/GvButton.vue'
import PartCard from '../components/PartCard.vue'

const emit = defineEmits<{ inspect: [kind: 'car' | 'part', id: string]; friends: [] }>()
const tab = ref<'cars' | 'parts' | 'series'>('cars')
const garageFilter = ref<'owned' | 'favorites' | 'lineup' | 'collection' | 'missing-editions'>('owned')
const garageFilters = [
  { id: 'owned', label: t('Mes voitures') }, { id: 'favorites', label: t('★ Favoris') },
  { id: 'lineup', label: t('Écurie') }, { id: 'collection', label: t('Collection') },
  { id: 'missing-editions', label: t('Éditions manquantes') },
] as const
const query = ref('')
const category = computed({
  get: () => save.preferences.garageCategory ?? '',
  set: (value: string) => { act(s => { s.preferences.garageCategory = value || undefined }) },
})
const rarityFilter = computed<'' | Rarity>({
  get: () => save.preferences.garageRarity ?? '',
  set: value => { act(s => { s.preferences.garageRarity = value || undefined }) },
})
const family = ref('')
const showMissing = ref(false)
const confirmingStripAll = ref(false)
const mountedPartsCount = computed(() => totalMountedParts(save))
const hasReadyEvo = (id: string) => vehicles.some(e => e.evolvesFrom === id && !save.cars[e.id] && !craftCheck(save, e.id))
function stripAllParts() {
  const count = mountedPartsCount.value
  if (act(s => uninstallAll(s), tp('{n} pièce rendue au stock', '{n} pièces rendues au stock', count), 'flip')) {
    confirmingStripAll.value = false
  }
}
const sort = computed({
  get: () => save.preferences.garageSort ?? 'number',
  set: (value: string) => { act(s => { s.preferences.garageSort = value }) },
})
const quickSorts = [
  { id: 'number', label: t('Collection'), icon: '▦' }, { id: 'rarity', label: t('Rareté'), icon: '◆' },
  { id: 'power', label: t('Puissance'), icon: 'ϟ' }, { id: 'name', label: t('Nom'), icon: 'A↓' }, { id: 'copies', label: t('Doublons'), icon: '▣' },
]
const colOptions = [
  { value: 0, label: t('Auto') },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
] as const
const cols = computed(() => save.preferences.garageCols ?? 0)
// Vue planche : 4 ou 5 voitures par ligne sur téléphone, en vignettes.
const sheet = computed(() => cols.value >= 4 && narrow.value)
const categories = [...new Set(vehicles.flatMap(v => [...v.tags, ...(v.culture?.aura ?? [])]))].sort((a, b) => a.localeCompare(b, locale))
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

// Ordre de collection numérique : « 11 » avant « 100 » (les numéros sont des textes à partir de 100).
const byNumber = (a: Vehicle, b: Vehicle) => Number(a.number) - Number(b.number)

const transitCars = computed(() => Object.fromEntries(vehicles.flatMap(v => {
  const car = inTransit(save, v.id)
  return car ? [[v.id, car] as const] : []
})))

function matchesGarageFilter(id: string) {
  const car = save.cars[id] ?? transitCars.value[id]
  if (garageFilter.value !== 'collection' && !car) return false
  if (garageFilter.value === 'favorites' && !car?.favorite) return false
  if (garageFilter.value === 'lineup' && !save.lineup.includes(id)) return false
  if (garageFilter.value === 'missing-editions') return stylesOf(id).some(style => !car?.editions.includes(style))
  return true
}

const carList = computed(() => vehicles.filter(v => {
  if (!matchesGarageFilter(v.id)) return false
  if (rarityFilter.value && v.rarity !== rarityFilter.value) return false
  if (category.value && !v.tags.includes(category.value) && !v.culture?.aura.includes(category.value)) return false
  return normalize(`${v.name} ${v.version} ${v.year}`).includes(search.value)
}).sort((a, b) => {
  if (garageFilter.value === 'owned' && sort.value === 'number') {
    const favorite = Number(Boolean(save.cars[b.id]?.favorite)) - Number(Boolean(save.cars[a.id]?.favorite))
    if (favorite) return favorite
  }
  if (sort.value === 'name') return a.name.localeCompare(b.name, locale) || byNumber(a, b)
  if (sort.value === 'cost') return a.cost - b.cost || byNumber(a, b)
  if (sort.value === 'cost-desc') return b.cost - a.cost || byNumber(a, b)
  if (sort.value === 'rarity') return rarities.indexOf(b.rarity) - rarities.indexOf(a.rarity) || byNumber(a, b)
  if (sort.value === 'power') return totalPower(b) - totalPower(a) || byNumber(a, b)
  if (sort.value === 'stage') return prepScore(b) - prepScore(a) || totalPower(b) - totalPower(a) || byNumber(a, b)
  if (sort.value === 'acc') return carStats(b).acc - carStats(a).acc || byNumber(a, b)
  if (sort.value === 'vit') return carStats(b).vit - carStats(a).vit || byNumber(a, b)
  if (sort.value === 'man') return carStats(b).man - carStats(a).man || byNumber(a, b)
  if (sort.value === 'end') return carStats(b).end - carStats(a).end || byNumber(a, b)
  if (sort.value === 'copies') return (save.cars[b.id]?.copies ?? 0) - (save.cars[a.id]?.copies ?? 0) || byNumber(a, b)
  if (sort.value === 'year') return b.year - a.year || byNumber(a, b)
  return byNumber(a, b)
}))
const rarityCount = (rarity?: Rarity) => vehicles.filter(v => (!rarity || v.rarity === rarity) && matchesGarageFilter(v.id)).length
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
  if (act(s => claimSeries(s, id), t('Récompense récupérée'), 'collect') && !reducedMotion.value) confetti(palettes.gold)
}
const seriesCars = (ids: string[]) => ids.map(id => vehicleById.get(id)!)
</script>

<template>
  <main class="garage">
    <div class="page-heading">
      <h1 tabindex="-1">{{ t('Mon garage') }}</h1>
      <button v-if="save.preferences.friendsEnabled === true" type="button" class="button ghost" @click="emit('friends')">{{ t('Échanges') }}<span v-if="exchangeAlerts.offers + exchangeAlerts.friends" class="exchange-alert">{{ exchangeAlerts.offers + exchangeAlerts.friends }}<span class="visually-hidden"> {{ t('en attente de réponse') }}</span></span></button>
    </div>
    <div class="tabs garage-tabs" :aria-label="t('Inventaire')">
      <button type="button" :aria-pressed="tab === 'cars'" @click="selectTab('cars')">{{ t('Voitures') }} <span>{{ ownedCount }}/{{ vehicles.length }}</span></button>
      <button type="button" :aria-pressed="tab === 'parts'" @click="selectTab('parts')">{{ t('Mécaniques') }} <span>{{ ownedParts.length }}/{{ parts.length }}</span></button>
      <button type="button" :aria-pressed="tab === 'series'" @click="selectTab('series')">{{ t('Séries') }} <span v-help="'series'" :aria-label="t('Aide sur les séries')">?</span></button>
    </div>
    <div v-if="tab !== 'series'" class="garage-tools">
      <div v-if="tab === 'cars'" class="garage-filters" :aria-label="t('Afficher les voitures')">
        <GvButton variant="tab" v-for="f in garageFilters" :key="f.id" type="button" :aria-pressed="garageFilter === f.id" @click="garageFilter = f.id">{{ f.label }}</GvButton>
      </div>
      <div class="garage-toolbar-main">
        <div class="garage-search-group">
          <label class="garage-search">
            <span class="visually-hidden">{{ tab === 'cars' ? t('Rechercher une voiture') : t('Rechercher une pièce') }}</span>
            <input v-model="query" type="search" :placeholder="tab === 'cars' ? t('Rechercher une voiture (nom, année…)') : t('Rechercher une pièce')" />
          </label>
          <template v-if="tab === 'cars'">
            <div class="garage-rarity-chips" role="group" :aria-label="t('Filtrer par rareté')">
              <GvButton variant="filter" :aria-label="t('Toutes, {n} voitures', { n: rarityCount() })" :aria-pressed="rarityFilter === ''" @click="rarityFilter = ''"><span aria-hidden="true">◈</span> {{ t('Toutes') }} <b>{{ rarityCount() }}</b></GvButton>
              <GvButton variant="filter" tone="var(--rarity-color)" :aria-label="tp('{rarity}, {n} voiture', '{rarity}, {n} voitures', rarityCount(r), { rarity: t(r) })" v-for="r in rarities" :key="r" type="button" :class="`rarity-${rarityClass[r]}`" :aria-pressed="rarityFilter === r" @click="rarityFilter = r"><span class="rarity-gem" aria-hidden="true">{{ rarityMark[r] }}</span><span class="visually-hidden">{{ t(r) }}</span><b>{{ rarityCount(r) }}</b></GvButton>
            </div>
            <div class="garage-sort-chips" role="group" :aria-label="t('Trier les voitures')">
              <GvButton variant="tab" :aria-label="option.label" :title="option.label" v-for="option in quickSorts" :key="option.id" type="button" :aria-pressed="sort === option.id" @click="sort = option.id"><span aria-hidden="true">{{ option.icon }}</span><span class="visually-hidden">{{ option.label }}</span></GvButton>
            </div>
          </template>
        </div>
        <div class="garage-selects" :class="{ 'cars-selects': tab === 'cars' }">
          <template v-if="tab === 'cars'">
            <label>
              <span>{{ t('Catégorie') }}</span>
              <select v-model="category">
                <option value="">{{ t('Toutes') }}</option>
                <option v-for="name in categories" :key="name" :value="name">{{ tc('tag', name) }}</option>
              </select>
            </label>
            <label>
              <span>{{ t('Autres tris') }}</span>
              <select v-model="sort">
                <option value="number">{{ t('Collection (n°)') }}</option>
                <option value="rarity">{{ t('Rareté') }}</option>
                <option value="power">{{ t('Puissance totale') }}</option>
                <option value="stage">{{ t('Niveau d’amélioration') }}</option>
                <option value="cost">{{ t('Coût d’écurie (croissant)') }}</option>
                <option value="cost-desc">{{ t('Coût d’écurie (décroissant)') }}</option>
                <option value="acc">{{ t('Accélération') }}</option>
                <option value="vit">{{ t('Vitesse') }}</option>
                <option value="man">{{ t('Maniabilité') }}</option>
                <option value="end">{{ t('Endurance') }}</option>
                <option value="copies">{{ t('Exemplaires / doublons') }}</option>
                <option value="year">{{ t('Année') }}</option>
                <option value="name">{{ t('Nom (A-Z)') }}</option>
              </select>
            </label>
          </template>
          <template v-else>
            <label><span>{{ t('Famille') }}</span><select v-model="family"><option value="">{{ t('Toutes') }}</option><option v-for="(label, id) in families" :key="id" :value="id">{{ t(label) }}</option></select></label>
            <label class="missing-toggle"><input v-model="showMissing" type="checkbox" /> {{ t('Pièces manquantes') }}</label>
            <div v-if="mountedPartsCount > 0" class="strip-all-box">
              <template v-if="confirmingStripAll">
                <span class="hint" role="status">{{ tp('Rendre {n} pièce au stock ?', 'Rendre {n} pièces au stock ?', mountedPartsCount) }}</span>
                <button type="button" class="button small primary" @click="stripAllParts">{{ t('Confirmer') }}</button>
                <button type="button" class="button small quiet" @click="confirmingStripAll = false">{{ t('Annuler') }}</button>
              </template>
              <button v-else type="button" class="button small ghost" @click="confirmingStripAll = true">
                {{ t('Tout démonter ({n})', { n: mountedPartsCount }) }}
              </button>
            </div>
          </template>
        </div>
      </div>

      <div v-if="tab === 'cars'" class="garage-density-bar">
        <span class="garage-count">{{ tp('{n} voiture', '{n} voitures', carList.length) }}</span>
        <div class="garage-density" role="group" :aria-label="t('Nombre de voitures par ligne')">
          <span class="density-label">{{ t('Par ligne') }}</span>
          <div class="density-chips">
            <GvButton variant="icon"
              v-for="opt in colOptions"
              :key="opt.value"
              type="button"
              :class="`col-opt-${opt.value}`"
              :aria-pressed="cols === opt.value"
              :aria-label="opt.value === 0 ? t('Nombre de colonnes automatique') : tp('{n} voiture par ligne', '{n} voitures par ligne', opt.value)"
              @click="setCols(opt.value)"
            >
              <span v-if="opt.value === 0" aria-hidden="true">▦</span><span v-else class="density-icon" aria-hidden="true"><i v-for="n in opt.value" :key="n"></i></span>
            </GvButton>
          </div>
        </div>
      </div>
    </div>

    <template v-if="tab === 'cars'">
      <div
        v-if="carList.length"
        class="garage-grid"
        :class="{ 'grid-custom': cols > 0, 'grid-single': cols === 1, 'grid-dense': cols >= 4, 'grid-sheet': sheet }"
        :style="cols > 0 ? { '--garage-cols': String(cols) } : undefined"
      >
        <div v-for="v in carList" :key="v.id" class="garage-tile">
          <button v-if="transitCars[v.id]" type="button" class="card-tile"
            :aria-label="t('{name} · En transit', { name: v.name })" @click="emit('inspect', 'car', v.id)">
            <CarThumb v-if="sheet" :id="v.id" :style-name="transitCars[v.id].shown" />
            <CarCard v-else :id="v.id" :style-name="transitCars[v.id].shown" :prep="transitCars[v.id]" :compact="cols !== 1" />
            <span class="transit-tag">{{ t('En transit') }}</span>
          </button>
          <template v-else-if="save.cars[v.id]">
            <button type="button" class="card-tile" :aria-label="t('Voir {name} {version}', { name: v.name, version: v.version })" @click="emit('inspect', 'car', v.id)">
              <span v-if="!save.seenCars?.includes(v.id)" class="new-car-badge">{{ t('Nouveau') }}</span>
              <CarThumb v-if="sheet" :id="v.id" :style-name="save.cars[v.id].shown" />
              <CarCard v-else :id="v.id" :style-name="save.cars[v.id].shown" :prep="prepOf(save, v.id)" :compact="cols !== 1" />
              <span v-if="save.cars[v.id].copies > 1" class="copy-count">×{{ save.cars[v.id].copies }}</span>
              <span v-if="save.lineup.includes(v.id)" class="tile-tag lineup-tag">{{ t('Écurie') }}</span>
              <span v-else-if="hasReadyEvo(v.id)" class="tile-tag evo-tag">{{ t('Évolution') }}</span>
            </button>
            <button type="button" class="favorite-button" :aria-label="t('Favori · {name} {version}', { name: v.name, version: v.version })" :aria-pressed="save.cars[v.id].favorite"
              @click="act(s => { s.cars[v.id].favorite = !s.cars[v.id].favorite })"><span aria-hidden="true">{{ save.cars[v.id].favorite ? '★' : '☆' }}</span></button>
          </template>
          <button v-else-if="sheet" type="button" class="card-tile" :aria-label="t('{name} {version}, pas encore dans ton garage', { name: v.name, version: v.version })" @click="emit('inspect', 'car', v.id)">
            <CarThumb :id="v.id" missing />
          </button>
          <button v-else type="button" class="missing-card" :class="`rarity-${rarityClass[v.rarity]}`" @click="emit('inspect', 'car', v.id)">
            <span>{{ v.number }} / {{ vehicles.length }} · {{ t(v.rarity) }}</span>
            <strong>{{ v.name }}</strong>
            <span>{{ v.craft && !v.craft.inBoosters ? t('Évolution à débloquer') : v.version }}</span>
          </button>
        </div>
      </div>
      <p v-else class="garage-empty">{{ garageFilter === 'favorites' && !search && !category && !rarityFilter ? t('Touche l’étoile d’une voiture pour la retrouver ici.') : t('Aucune voiture pour ces filtres.') }}</p>
    </template>

    <template v-else-if="tab === 'parts'">
      <section v-for="group in partGroups" :key="group.id" class="garage-part-group">
        <h2>{{ t(group.label) }}</h2>
        <div class="garage-grid parts-grid">
          <template v-for="p in group.parts" :key="p.id">
            <button v-if="save.parts[p.id]" type="button" class="card-tile" @click="emit('inspect', 'part', p.id)">
              <PartCard :id="p.id" compact />
              <span class="copy-count">{{ tp('{free}/{total} libre', '{free}/{total} libres', freeParts(save, p.id), { free: freeParts(save, p.id), total: save.parts[p.id] }) }}</span>
            </button>
            <div v-else class="missing-card"><span>{{ t(p.rarity) }}</span><strong>{{ p.name }}</strong></div>
          </template>
        </div>
      </section>
      <p v-if="!partGroups.length" class="garage-empty">{{ t('Aucune pièce pour ces filtres.') }}</p>
    </template>
    <div v-else class="series-list">
      <section v-for="entry in series" :key="entry.id" class="series-card" :aria-labelledby="`series-${entry.id}`">
        <h2 :id="`series-${entry.id}`">{{ t(entry.name) }}</h2>
        <p>{{ t(entry.description) }}</p>
        <p><span v-help="'seriesReward'">{{ t('Récompense de série') }}</span></p>
        <p>{{ t('Crédits : +{n}', { n: entry.reward.credits }) }}</p>
        <p v-if="entry.reward.ticket">{{ t('Ticket de booster : +1 ticket {name}', { name: t(boosterById.get(entry.reward.ticket)!.name) }) }}</p>
        <div class="series-progress" role="progressbar" :aria-label="t(entry.name)" :aria-valuenow="seriesProgress(save, entry)" :aria-valuemax="entry.vehicles.length" :aria-valuemin="0">
          <span :style="{ width: `${seriesProgress(save, entry) / entry.vehicles.length * 100}%` }"></span>
        </div>
        <p>{{ seriesProgress(save, entry) }} / {{ entry.vehicles.length }}<template v-if="seriesComplete(save, entry)"> · {{ t('Série complète') }}</template></p>
        <div class="series-cars">
          <button v-for="v in seriesCars(entry.vehicles)" :key="v.id" type="button" class="series-car" :aria-label="save.cars[v.id] ? t('Voir {name} {version}', { name: v.name, version: v.version }) : t('Voir {name} {version} · manquante', { name: v.name, version: v.version })" @click="emit('inspect', 'car', v.id)">
            <img v-if="save.cars[v.id]" :src="edition(v.id, save.cars[v.id].shown).art" alt="" />
            <svg v-else class="series-silhouette" viewBox="0 0 120 90" aria-hidden="true"><path d="M10 55 17 43 35 39 48 25H79L96 41 110 47V65H99a12 12 0 0 1-24 0H44a12 12 0 0 1-24 0H10Z" /></svg>
            <span v-if="save.cars[v.id] && !save.seenCars?.includes(v.id)" class="new-car-badge">{{ t('Nouveau') }}</span>
            <strong>{{ v.name }}</strong><span>{{ v.version }}</span>
            <small>{{ save.cars[v.id] ? t(save.cars[v.id].shown) : t('Manquante') }}</small>
          </button>
        </div>
        <p v-if="save.series.includes(entry.id)" role="status">{{ t('Récompense récupérée') }}</p>
        <button v-else-if="seriesComplete(save, entry)" class="button primary" type="button" @click="collectSeries(entry.id)">{{ t('Récupérer la récompense') }}</button>
      </section>
    </div>
  </main>
</template>


<style scoped>
.transit-tag {
  display: block;
  padding: 3px;
  background: var(--night);
  color: var(--text);
  font-size: .75rem;
  font-weight: 700;
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
