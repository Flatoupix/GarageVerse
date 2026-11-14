<script setup lang="ts">
import { computed } from 'vue'
import { edition } from '../game/art'
import { rarityClass, rarityMark, sectorIcons, statLabels, statShort, styleLabel, vehicleById, vehicles, type EditionStyle, type StatKey } from '../game/data'
import { STAT_CAP, statsOf, type Prep } from '../game/rules'

const props = defineProps<{ id: string; styleName?: EditionStyle; prep?: Prep; cinematic?: boolean; compact?: boolean }>()
const v = computed(() => vehicleById.get(props.id)!)
const look = computed(() => edition(props.id, props.styleName))
const stats = computed(() => statsOf(v.value, props.prep ?? { stage: 0, parts: [] }))
const keys: StatKey[] = ['acc', 'vit', 'man', 'end']
const category = computed(() => v.value.culture?.aura[0] ?? v.value.tags[0])
const title = computed(() => props.id === 'venom' ? 'Venom F5' : v.value.name)
const statMarks: Record<StatKey, string> = { acc: sectorIcons.depart, vit: sectorIcons.ligne, man: sectorIcons.virage, end: sectorIcons.endurance }
</script>

<template>
  <article class="gv-card car-card" :class="[`finish-${rarityClass[v.rarity]}`, { compact, 'is-culture': v.culture }]"
    :data-edition="`${id}-${look.style}`">
    <header class="car-masthead">
      <div class="car-masthead-meta">
        <span>{{ category }}</span>
        <span v-if="id === 'venom'" class="car-maker">Hennessey</span>
      </div>
      <div class="car-masthead-main">
        <div class="car-model" :class="{ 'long-model': title.length > 19 }">
          <strong v-if="id === 'venom'">Venom <em>F5</em></strong>
          <strong v-else>{{ title }}</strong>
          <span>{{ v.version }}<template v-if="prep && prep.stage"> · Stage {{ prep.stage }}</template></span>
        </div>
        <span class="car-lineup-cost" :title="`Coût d’écurie ${v.cost}`"><span>Coût<span class="visually-hidden"> d’écurie</span></span><b>{{ v.cost }}</b></span>
      </div>
    </header>
    <div class="card-art">
      <img v-if="look.art" :src="look.art" alt="" draggable="false" :class="{ pixel: look.style === 'Pixel Art' }" />
      <div v-else class="art-missing" aria-hidden="true"><span>{{ v.name }}</span></div>
      <div v-if="cinematic && look.drift" class="drift-scene" aria-hidden="true">
        <img :src="look.drift.backdrop" alt="" class="drift-backdrop" />
        <div class="drift-tracks"></div>
        <div class="drift-smoke"></div>
        <img :src="look.drift.car" alt="" class="drift-car" />
        <div class="drift-flare"></div>
      </div>
    </div>
    <div class="car-card-details">
      <div class="car-metadata">
        <span class="car-engine">{{ v.engine }} · {{ v.drive }}</span>
        <span class="car-rarity"><span aria-hidden="true">{{ rarityMark[v.rarity] }}</span> {{ v.rarity }}</span>
        <span class="car-number">{{ v.number }}/{{ vehicles.length }}</span>
      </div>
      <dl class="stat-grid">
        <div v-for="key in keys" :key="key" :class="{ boosted: stats[key] > v.stats[key], lowered: stats[key] < v.stats[key] }">
          <dt><span v-if="compact" class="visually-hidden">{{ statLabels[key] }}</span><span :aria-hidden="compact">{{ compact ? statShort[key] : statLabels[key] }}</span></dt>
          <dd><span v-if="!compact" class="stat-mark" aria-hidden="true">{{ statMarks[key] }}</span><b>{{ stats[key] }}</b>
            <span class="bar" :style="{ '--fill': stats[key] / STAT_CAP }" aria-hidden="true"></span></dd>
        </div>
      </dl>
      <div v-if="!compact" class="signature">
        <span class="signature-mark" aria-hidden="true">✦</span>
        <div><b>{{ v.signature.name }}</b><span>{{ v.signature.text }}</span></div>
      </div>
      <footer class="car-card-foot">
        <span v-if="!compact">{{ v.year }} · {{ v.origin }}</span>
        <span>{{ styleLabel(v, look.style) }}</span>
      </footer>
    </div>
  </article>
</template>
