<script setup lang="ts">
import { computed } from 'vue'
import { vehicles, rarities, rarityClass, type Rarity } from '../game/data'
import type { BrowserView } from '../game/carBrowser'
import GvButton from './GvButton.vue'
const props = defineProps<{ mode: 'browse' | 'pick'; count: number; rarityCount: (rarity?: Rarity) => number }>()
const garageFilter = defineModel<BrowserView>('view', { required: true })
const query = defineModel<string>('query', { required: true })
const category = defineModel<string>('category', { required: true })
const rarityFilter = defineModel<'' | Rarity>('rarity', { required: true })
const sort = defineModel<string>('sort', { required: true })
const cols = defineModel<number>('cols', { required: true })
const garageFilters = computed(() => [
  { id: 'owned' as const, label: 'Mes voitures' }, { id: 'favorites' as const, label: '★ Favoris' },
  { id: 'lineup' as const, label: props.mode === 'pick' ? 'Sélection' : 'Écurie' },
  ...(props.mode === 'browse' ? [{ id: 'collection' as const, label: 'Collection' }] : []),
])
const quickSorts = [
  { id: 'number', label: 'Collection', icon: '▦' }, { id: 'rarity', label: 'Rareté', icon: '◆' },
  { id: 'power', label: 'Puissance', icon: 'ϟ' }, { id: 'name', label: 'Nom', icon: 'A↓' }, { id: 'copies', label: 'Doublons', icon: '▣' },
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
const categories = [...new Set(vehicles.flatMap(v => [...v.tags, ...(v.culture?.aura ?? [])]))].sort((a, b) => a.localeCompare(b, 'fr'))
</script>
<template>
  <div class="garage-tools">
    <div class="garage-filters" aria-label="Afficher les voitures">
      <GvButton variant="tab" v-for="f in garageFilters" :key="f.id" type="button" :aria-pressed="garageFilter === f.id" @click="garageFilter = f.id">{{ f.label }}</GvButton>
    </div>
    <div class="garage-toolbar-main">
      <div class="garage-search-group">
        <label class="garage-search">
          <span class="visually-hidden">Rechercher une voiture</span>
          <input v-model="query" type="search" placeholder="Rechercher une voiture (nom, année…)" />
        </label>
        <div class="garage-rarity-chips" role="group" aria-label="Filtrer par rareté">
          <GvButton variant="filter" :aria-label="`Toutes, ${rarityCount()} voitures`" :aria-pressed="rarityFilter === ''" @click="rarityFilter = ''"><span aria-hidden="true">◈</span> Toutes <b>{{ rarityCount() }}</b></GvButton>
          <GvButton variant="filter" tone="var(--rarity-color)" :aria-label="`${r}, ${rarityCount(r)} voiture${rarityCount(r) > 1 ? 's' : ''}`" v-for="r in rarities" :key="r" type="button" :class="`rarity-${rarityClass[r]}`" :aria-pressed="rarityFilter === r" @click="rarityFilter = r"><span class="rarity-gem" aria-hidden="true">◆</span><span class="visually-hidden">{{ r }}</span><b>{{ rarityCount(r) }}</b></GvButton>
        </div>
        <div class="garage-sort-chips" role="group" aria-label="Trier les voitures">
          <GvButton variant="tab" :aria-label="option.label" :title="option.label" v-for="option in quickSorts" :key="option.id" type="button" :aria-pressed="sort === option.id" @click="sort = option.id"><span aria-hidden="true">{{ option.icon }}</span><span class="visually-hidden">{{ option.label }}</span></GvButton>
        </div>
      </div>
      <div class="garage-selects cars-selects">
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
            <option v-if="mode === 'pick'" value="circuit">Adaptée au circuit</option>
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
      </div>
    </div>

    <div class="garage-density-bar">
      <span class="garage-count">{{ count }} voiture{{ count > 1 ? 's' : '' }}</span>
      <div class="garage-density" role="group" aria-label="Nombre de voitures par ligne">
        <span class="density-label">Par ligne</span>
        <div class="density-chips">
          <GvButton variant="icon"
            v-for="opt in colOptions"
            :key="opt.value"
            type="button"
            :class="`col-opt-${opt.value}`"
            :aria-pressed="cols === opt.value"
            :aria-label="opt.value === 0 ? 'Nombre de colonnes automatique' : `${opt.value} voiture${opt.value > 1 ? 's' : ''} par ligne`"
            @click="cols = opt.value"
          >
            <span v-if="opt.value === 0" aria-hidden="true">▦</span><span v-else class="density-icon" aria-hidden="true"><i v-for="n in opt.value" :key="n"></i></span>
          </GvButton>
        </div>
      </div>
    </div>
  </div>
</template>
