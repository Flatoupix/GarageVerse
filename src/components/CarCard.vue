<script setup lang="ts">
import { computed } from 'vue'
import { edition } from '../game/art'
import { partById, rarityClass, rarityMark, sectorIcons, statLabels, statShort, styleLabel, vehicleById, vehicles, type EditionStyle, type StatKey } from '../game/data'
import { partUnlockLevel, STAT_CAP, statsOf, upgrades, type Prep } from '../game/rules'

const props = defineProps<{ id: string; styleName?: EditionStyle; prep?: Prep; cinematic?: boolean; compact?: boolean }>()
const v = computed(() => vehicleById.get(props.id)!)
const look = computed(() => edition(props.id, props.styleName))
const stats = computed(() => statsOf(v.value, props.prep ?? { stage: 0, parts: [] }))
const keys: StatKey[] = ['acc', 'vit', 'man', 'end']
const category = computed(() => v.value.culture?.aura[0] ?? v.value.tags[0])
const title = computed(() => props.id === 'venom' ? 'Venom F5' : v.value.name)
// Emplacements d'amélioration, un par groupe d'atelier et alignés sous la statistique qu'il améliore :
// éteint d'origine, à moitié allumé au niveau 1, pleinement allumé au niveau 2, avec un voyant par pièce montée.
const mods = computed(() => props.prep && keys.map(key => {
  const level = Math.min(partUnlockLevel, props.prep!.upgrades?.[key] ?? 0)
  const fitted = props.prep!.parts.map(id => partById.get(id)).filter(part => part && (upgrades[key].families as string[]).includes(part.family))
  const text = [`niveau ${level} sur ${partUnlockLevel}`, ...fitted.map(part => part!.name)].join(', ')
  return { key, level, fitted, label: `${upgrades[key].label} : ${text}` }
}))
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
      <div v-if="look.scene" class="pixel-scene" :class="look.scene.fx.map(fx => `fx-${fx}`)" :style="{ '--scene-bg': `url(${look.scene.bg})` }" aria-hidden="true">
        <div class="scene-bg"></div>
        <div v-if="look.scene.fx.includes('speed')" class="scene-speed"><i></i><i></i><i></i></div>
        <div v-if="look.scene.fx.includes('dust') || look.scene.fx.includes('smoke')" class="scene-cloud"><i></i><i></i><i></i><i></i></div>
        <img v-if="look.scene.chaser" :src="look.scene.chaser" alt="" class="scene-chaser" draggable="false" />
        <div class="scene-car">
          <img :src="look.scene.car" alt="" draggable="false" />
          <i v-if="look.scene.fx.includes('flames') || look.scene.fx.includes('turbine')" class="scene-flame"></i>
          <i v-if="look.scene.fx.includes('headlights')" class="scene-beam"></i>
          <i v-if="look.scene.fx.includes('scanner')" class="scene-scanner"></i>
          <span v-if="look.scene.fx.includes('sparks')" class="scene-sparks"><i></i><i></i><i></i><i></i></span>
        </div>
      </div>
      <img v-else-if="look.art" :src="look.art" alt="" draggable="false" :class="{ pixel: look.style === 'Pixel Art' }" />
      <div v-else class="art-missing" aria-hidden="true"><span>{{ v.name }}</span></div>
      <div v-if="cinematic && look.drift" class="drift-scene" aria-hidden="true">
        <img :src="look.drift.backdrop" alt="" class="drift-backdrop" />
        <div class="drift-tracks"></div>
        <div class="drift-smoke"></div>
        <img :src="look.drift.car" alt="" class="drift-car" />
        <div class="drift-flare"></div>
      </div>
      <ul v-if="mods" class="mod-row mod-rail" aria-label="Améliorations">
        <li v-for="mod in mods" :key="mod.key" class="mod-slot mod-crest" :class="[`level-${mod.level}`, { 'has-part': mod.fitted.length > 0 }]" :title="mod.label">
          <span class="visually-hidden">{{ mod.label }}</span>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <g v-if="mod.key === 'man'"><circle cx="8" cy="8" r="5.6" /><circle cx="8" cy="8" r="2" /><path d="M3 8h3M10 8h3M8 10v3.5" /></g>
            <path v-else-if="mod.key === 'acc'" d="M4.2 3.5v9M8 3.5v9M11.8 3.5v4.5M4.2 8h7.6" />
            <path v-else-if="mod.key === 'vit'" d="M8.8 2.2 4.2 8.8h3.5l-.8 5L11.8 7H8.3z" />
            <g v-else><circle cx="7.2" cy="8" r="5.2" /><circle cx="7.2" cy="8" r="1.5" /><path class="mod-caliper" d="M11.8 4.8a5.8 5.8 0 0 1 0 6.4" /></g>
          </svg>
          <span v-if="mod.fitted.length" class="mod-lamps" aria-hidden="true">
            <i v-for="part in mod.fitted" :key="part!.id" :class="`fitted rarity-${rarityClass[part!.rarity]}`"></i>
          </span>
        </li>
      </ul>
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
