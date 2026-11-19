<script setup lang="ts">
import { computed, ref } from 'vue'
import { locale, t, tp } from '../i18n'
import { rarityClass, rarityMark, rarities, vehicleById } from '../game/data'
import type { TradeGoods } from '../game/trade'
import { edition } from '../game/art'
import TradeCard from './TradeCard.vue'

const props = defineProps<{
  cars: TradeGoods['cars']
  selected: string[]
  problem: (id: string) => string | undefined
  selectionProblem?: (id: string) => string | undefined
  disabled?: boolean
  searchable?: boolean
}>()
const emit = defineEmits<{ toggle: [id: string] }>()
const query = ref('')
const sort = ref<'name' | 'rarity' | 'copies'>('name')
const reveal = ref(false)
const detail = ref<string>()
const entries = computed(() => [...new Set([...Object.keys(props.cars), ...props.selected])].map(id => {
  const car = props.cars[id]
  const model = vehicleById.get(id)
  return {
    id, car, name: model?.name ?? t('Carte indisponible'), version: model ? t(model.version) : undefined,
    rarity: model?.rarity, art: model ? edition(id, car?.shown).art : undefined,
    selected: props.selected.includes(id), unavailable: props.problem(id),
  }
}))
const normalize = (value: string) => value.toLocaleLowerCase(locale).normalize('NFD').replace(/\p{M}/gu, '')
const matches = computed(() => {
  const search = normalize(query.value.trim())
  return entries.value.filter(item => normalize([item.name, item.version].join(' ')).includes(search)).sort((a, b) => {
    const rank = sort.value === 'rarity' ? (b.rarity ? rarities.indexOf(b.rarity) : -1) - (a.rarity ? rarities.indexOf(a.rarity) : -1)
      : sort.value === 'copies' ? (b.car?.copies ?? 0) - (a.car?.copies ?? 0) : 0
    return rank || a.name.localeCompare(b.name, locale)
  })
})
const unavailable = computed(() => matches.value.filter(item => item.unavailable && !item.selected).length)
const visible = computed(() => matches.value.filter(item => reveal.value || !item.unavailable || item.selected).map(item => ({
  ...item, reason: item.unavailable || (!item.selected ? props.selectionProblem?.(item.id) : undefined),
})))
</script>

<template>
  <div class="trade-picker">
    <div v-if="searchable" class="picker-filters">
      <label>{{ t('Rechercher par nom') }} <input v-model="query" type="search"></label>
      <label>{{ t('Trier par') }}
        <select v-model="sort">
          <option value="name">{{ t('Nom') }}</option>
          <option value="rarity">{{ t('Rareté') }}</option>
          <option value="copies">{{ t('Doublons d’abord') }}</option>
        </select>
      </label>
    </div>
    <p v-if="query.trim() && !matches.length" role="status">{{ t('Aucune voiture ne correspond à ta recherche.') }}</p>
    <button v-if="unavailable" type="button" class="button ghost picker-reveal" :aria-expanded="reveal"
      @click="reveal = !reveal">
      {{ reveal ? t('Masquer les voitures indisponibles') : t('Afficher les voitures indisponibles ({n})', { n: unavailable }) }}
    </button>
    <div class="picker-grid">
      <article v-for="item in visible" :key="item.id" class="picker-item">
        <button type="button" class="picker-car" :aria-pressed="item.selected" :disabled="disabled || (!!item.reason && !item.selected)"
          :aria-describedby="item.reason ? `picker-problem-${item.id}` : undefined" @click="emit('toggle', item.id)">
          <img v-if="item.art" :src="item.art" alt="" loading="lazy" decoding="async">
          <span>
            <strong>{{ item.name }}</strong>
            <small v-if="item.version">{{ item.version }}</small>
            <small v-if="item.rarity" class="rarity-label" :class="`rarity-${rarityClass[item.rarity]}`"><span aria-hidden="true">{{ rarityMark[item.rarity] }}</span> {{ t(item.rarity) }}</small>
            <small v-if="item.car && item.car.copies > 1">{{ tp('{n} exemplaire', '{n} exemplaires', item.car.copies) }}</small>
          </span>
          <span v-if="item.selected" class="picker-tick" aria-hidden="true">✓</span>
        </button>
        <small v-if="item.reason" :id="`picker-problem-${item.id}`">{{ item.reason }}</small>
        <button v-if="item.car" type="button" class="button ghost picker-detail"
          :aria-expanded="detail === item.id" :aria-label="t('Détails de {name}', { name: item.name })"
          @click="detail = detail === item.id ? undefined : item.id">{{ t('Détails') }}</button>
        <TradeCard class="picker-full-card" v-if="detail === item.id && item.car" :id="item.id" :snapshot="item.car" compact />
      </article>
    </div>
  </div>
</template>

<style scoped>
.trade-picker, .picker-grid, .picker-item { display: grid; gap: 8px; min-width: 0; }
.picker-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); align-items: start; }
.picker-item { overflow-wrap: anywhere; }
.picker-filters { display: flex; flex-wrap: wrap; gap: 8px; }
.picker-filters :is(input, select) { min-height: 44px; min-width: 0; max-width: 100%; }
.picker-car {
  display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 64px; padding: 6px;
  text-align: start; border: 2px solid var(--line); border-radius: var(--radius);
  background: var(--panel); color: var(--text);
}
.picker-car[aria-pressed="true"] { border-color: var(--cyan); background: color-mix(in srgb, var(--cyan) 28%, var(--night)); color: var(--text); }
.picker-car img { width: 52px; aspect-ratio: 1; object-fit: cover; border-radius: var(--radius); }
.picker-car small { display: block; }
.picker-tick { margin-inline-start: auto; font-weight: 900; }
.picker-reveal { justify-self: start; text-align: start; }
.picker-reveal, .picker-detail { min-height: 44px; }
.picker-detail { justify-self: start; }
.picker-full-card { width: min(100%, 220px); }
.picker-car:disabled { opacity: .65; cursor: not-allowed; }
</style>
