<script setup lang="ts">
import { computed } from 'vue'
import { edition } from '../game/art'
import { rarityClass, rarityMark, statShort, vehicleById, type EditionStyle, type StatKey } from '../game/data'
import { statsOf, type Prep } from '../game/rules'

const props = defineProps<{ id: string; styleName?: EditionStyle; prep?: Prep; cinematic?: boolean; compact?: boolean }>()
const v = computed(() => vehicleById.get(props.id)!)
const look = computed(() => edition(props.id, props.styleName))
const stats = computed(() => statsOf(v.value, props.prep ?? { stage: 0, parts: [] }))
const keys: StatKey[] = ['acc', 'vit', 'man', 'end']
</script>

<template>
  <article class="gv-card car-card" :class="[`finish-${rarityClass[v.rarity]}`, { compact, 'is-culture': v.culture }]"
    :data-edition="`${id}-${look.style}`">
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
    <header class="card-top">
      <span class="cost" :title="`Coût d'écurie ${v.cost}`"><small>COÛT</small>{{ v.cost }}</span>
      <span class="rarity"><span aria-hidden="true">{{ rarityMark[v.rarity] }}</span> {{ v.rarity }}</span>
      <span class="number">{{ v.number }}/50</span>
    </header>
    <div class="card-body">
      <div class="card-title">
        <strong>{{ v.name }}</strong>
        <span>{{ v.version }}<template v-if="prep && prep.stage"> · Stage {{ prep.stage }}</template></span>
      </div>
      <dl class="stat-grid">
        <div v-for="key in keys" :key="key" :class="{ boosted: stats[key] > v.stats[key], lowered: stats[key] < v.stats[key] }">
          <dt>{{ statShort[key] }}</dt>
          <dd><span class="bar" :style="{ '--fill': stats[key] / 12 }"></span><b>{{ stats[key] }}</b></dd>
        </div>
      </dl>
      <div v-if="!compact" class="signature">
        <b>{{ v.signature.name }}</b>
        <span>{{ v.signature.text }}</span>
      </div>
      <footer class="card-foot">
        <span>{{ v.culture ? v.culture.aura.join(' · ') : v.tags.slice(0, 2).join(' · ') }}</span>
        <span>{{ look.style }}</span>
      </footer>
    </div>
  </article>
</template>
