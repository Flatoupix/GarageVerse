<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { edition } from '../game/art'
import { theme } from '../game/theme'
import { partById, rarityClass, rarityMark, sectorIcons, statLabels, statShort, styleLabel, vehicleById, vehicles, type EditionStyle, type StatKey } from '../game/data'
import { partUnlockLevel, STAT_CAP, statsOf, upgrades, type Prep } from '../game/rules'
import { t, tc } from '../i18n'

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
  const text = [t('niveau {level} sur {max}', { level, max: partUnlockLevel }), ...fitted.map(part => t(part!.name))].join(', ')
  return { key, level, fitted, label: t('{label} : {text}', { label: t(upgrades[key].label), text }) }
}))
// Le nom tient toujours sur deux lignes au plus, coupé seulement entre les mots : la taille du texte se réduit
// jusqu'à ce qu'il rentre en largeur et en hauteur, puis se recalcule quand la carte change de taille.
const nameEl = ref<HTMLElement>()
function fitName() {
  const el = nameEl.value
  if (!el) return
  el.style.fontSize = ''
  const style = getComputedStyle(el)
  let size = parseFloat(style.fontSize)
  const ratio = (parseFloat(style.lineHeight) || size * 1.1) / size
  for (let i = 0; i < 60 && size > 3; i++) {
    if (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= size * ratio * 2 + 2) break
    size *= 0.94
    el.style.fontSize = `${size}px`
  }
}
let observer: ResizeObserver | undefined
onMounted(() => {
  fitName()
  void document.fonts?.ready.then(fitName)
  if (nameEl.value?.parentElement) {
    observer = new ResizeObserver(() => fitName())
    observer.observe(nameEl.value.parentElement)
  }
})
// Un thème change la police et la taille de base : le nom est recalculé, et de nouveau quand ses polices ont fini de charger.
const refit = () => nextTick(fitName)
watch([() => props.id, theme], refit)
document.fonts?.addEventListener('loadingdone', refit)
onBeforeUnmount(() => { observer?.disconnect(); document.fonts?.removeEventListener('loadingdone', refit) })
const statMarks: Record<StatKey, string> = { acc: sectorIcons.depart, vit: sectorIcons.ligne, man: sectorIcons.virage, end: sectorIcons.endurance }
</script>

<template>
  <article class="gv-card car-card" :class="[`finish-${rarityClass[v.rarity]}`, { compact, 'is-culture': v.culture }]"
    :data-edition="`${id}-${look.style}`">
    <header class="car-masthead">
      <div class="car-masthead-meta">
        <span>{{ tc('tag', category) }}</span>
        <span v-if="id === 'venom'" class="car-maker">Hennessey</span>
        <span v-if="prep && prep.stage" class="car-stage" :aria-label="t('Stage {n} sur 3', { n: prep.stage })">
          <span aria-hidden="true"><span class="car-stage-word">{{ t('Stage') }} </span>{{ prep.stage }}</span>
          <span class="car-stage-pips" aria-hidden="true"><i v-for="n in 3" :key="n" :class="{ on: n <= prep.stage }"></i></span>
        </span>
      </div>
      <div class="car-masthead-main">
        <div class="car-model" :class="{ 'long-model': title.length > 19 }">
          <strong v-if="id === 'venom'" ref="nameEl">Venom <em>F5</em></strong>
          <strong v-else ref="nameEl">{{ title }}</strong>
          <span>{{ v.version }}</span>
        </div>
        <span class="car-lineup-cost" :title="t('Coût d’écurie {n}', { n: v.cost })"><span>{{ t('Coût') }}<span class="visually-hidden"> {{ t('d’écurie') }}</span></span><b>{{ v.cost }}</b></span>
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
      <ul v-if="mods" class="mod-row mod-rail" :aria-label="t('Améliorations')">
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
        <span class="car-rarity"><span aria-hidden="true">{{ rarityMark[v.rarity] }}</span> {{ t(v.rarity) }}</span>
        <span class="car-number">{{ v.number }}/{{ vehicles.length }}</span>
      </div>
      <dl class="stat-grid">
        <div v-for="key in keys" :key="key" :class="{ boosted: stats[key] > v.stats[key], lowered: stats[key] < v.stats[key] }">
          <dt><span v-if="compact" class="visually-hidden">{{ t(statLabels[key]) }}</span><span :aria-hidden="compact">{{ compact ? t(statShort[key]) : t(statLabels[key]) }}</span></dt>
          <dd><span v-if="!compact" class="stat-mark" aria-hidden="true">{{ statMarks[key] }}</span><b>{{ stats[key] }}</b>
            <span class="bar" :style="{ '--fill': stats[key] / STAT_CAP }" aria-hidden="true"></span></dd>
        </div>
      </dl>
      <div v-if="!compact" class="signature">
        <span class="signature-mark" aria-hidden="true">✦</span>
        <div><b>{{ v.signature.name }}</b><span>{{ t(v.signature.text) }}</span></div>
      </div>
      <footer class="car-card-foot">
        <span v-if="!compact">{{ v.year }} · {{ t(v.origin) }}</span>
        <span>{{ t(styleLabel(v, look.style)) }}</span>
      </footer>
    </div>
  </article>
</template>
