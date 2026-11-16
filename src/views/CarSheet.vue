<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { art, edition } from '../game/art'
import { families, partById, parts, progression, statLabels, styleLabel, stylesOf, vehicleById, vehicles, type EditionStyle, type Rival, type StatKey } from '../game/data'
import { confetti, flash, palettes, pop, rarityPalette, ring, shake, sparks, vTilt, tone } from '../game/fx'
import { vHelp } from '../game/help'
import { circuitScores, compatibility, engagements, partUnlockLevel, potential, prepUsed, racer, STAT_CAP, statsOf, statUse,
  upgradeKeys, upgradePrices, upgrades } from '../game/rules'
import { applyAutoUpgrade, autoUpgradePlan, craft, craftCheck, editionDuplicates, editionPrice, freeParts, install, installCheck, prepOf,
  selectEdition, sellCar, sellCheck, sellPrice, stageCost, uninstall, unlockEdition, unlockEditionCheck, upgrade, upgradeCheck, upgradeStat } from '../game/save'
import { recycle, undoRecycle, type RecycleReceipt } from '../game/recycle'
import { boundZoom, toggleZoom } from '../game/zoom'
import { act, buzz, reducedMotion, save } from '../game/store'
import { tutorialAction } from '../game/tutorial'
import CarCard from '../components/CarCard.vue'

const props = defineProps<{ id: string; circuit?: Rival['circuit']; suggestedStat?: StatKey; showCard?: boolean }>()
const emit = defineEmits<{ open: [id: string]; close: [] }>()
const v = computed(() => vehicleById.get(props.id)!)
const car = computed(() => save.cars[props.id])
const panel = ref<'overview' | 'workshop' | 'card'>(props.suggestedStat && car.value ? 'workshop' : !car.value || props.showCard ? 'card' : 'overview')
const zoomFrame = ref<HTMLElement>()
const zoom = ref({ scale: 1, x: 0, y: 0 })
function setZoom(scale: number, x = zoom.value.x, y = zoom.value.y) {
  const frame = zoomFrame.value
  zoom.value = boundZoom(scale, x, y, frame?.clientWidth ?? 0, frame?.clientHeight ?? 0)
}
function resetZoom() { zoom.value = { scale: 1, x: 0, y: 0 } }
function switchZoom() { setZoom(toggleZoom(zoom.value.scale)) }
function wheelZoom(event: WheelEvent) {
  event.preventDefault()
  setZoom(zoom.value.scale * Math.exp(-event.deltaY * 0.002))
}
let drag: { x: number; y: number; id: number } | undefined
function pointerDown(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || event.button !== 0 || zoom.value.scale === 1) return
  drag = { x: event.clientX, y: event.clientY, id: event.pointerId }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function pointerMove(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return
  setZoom(zoom.value.scale, zoom.value.x + event.clientX - drag.x, zoom.value.y + event.clientY - drag.y)
  drag.x = event.clientX
  drag.y = event.clientY
}
let touch: { x: number; y: number; distance: number } | undefined
let lastTap: { time: number; x: number; y: number } | undefined
let tapStart: { time: number; x: number; y: number } | undefined
function touchGeometry(touches: TouchList) {
  const a = touches[0]!
  const b = touches[1] ?? a
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2,
    distance: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) }
}
function touchStart(event: TouchEvent) {
  touch = touchGeometry(event.touches)
  tapStart = event.touches.length === 1 ? { time: Date.now(), x: touch.x, y: touch.y } : undefined
  if (event.touches.length > 1) { event.preventDefault(); lastTap = undefined }
}
function touchMove(event: TouchEvent) {
  const next = touchGeometry(event.touches)
  if (touch && (event.touches.length > 1 || zoom.value.scale > 1)) {
    event.preventDefault()
    const scale = touch.distance && next.distance ? zoom.value.scale * next.distance / touch.distance : zoom.value.scale
    setZoom(scale, zoom.value.x + next.x - touch.x, zoom.value.y + next.y - touch.y)
  }
  if (tapStart && Math.hypot(next.x - tapStart.x, next.y - tapStart.y) > 10) tapStart = undefined
  touch = next
}
function touchEnd(event: TouchEvent) {
  if (!event.touches.length && tapStart && Date.now() - tapStart.time < 300) {
    if (lastTap && Date.now() - lastTap.time < 350 && Math.hypot(tapStart.x - lastTap.x, tapStart.y - lastTap.y) < 30) {
      event.preventDefault()
      switchZoom()
      lastTap = undefined
    } else lastTap = tapStart
  }
  tapStart = undefined
  touch = event.touches.length ? touchGeometry(event.touches) : undefined
}
function clearZoom() { resetZoom(); drag = undefined; touch = undefined; tapStart = undefined; lastTap = undefined }
watch(() => props.id, () => {
  clearZoom()
  panel.value = props.suggestedStat && car.value ? 'workshop' : !car.value || props.showCard ? 'card' : 'overview'
})
onBeforeUnmount(clearZoom)
const confirmingSale = ref(false)
const confirmingRecycle = ref(false)
const receipt = shallowRef<RecycleReceipt>()
let recycleTimer: ReturnType<typeof setTimeout> | undefined
function clearRecycle() {
  clearTimeout(recycleTimer)
  receipt.value = undefined
  confirmingRecycle.value = false
}
watch(() => props.id, id => {
  clearRecycle()
  if (save.cars[id] && !save.seenCars?.includes(id)) act(s => { (s.seenCars ??= []).push(id) })
}, { immediate: true })
onBeforeUnmount(clearRecycle)
function confirmRecycle() {
  const result = recycle(save, props.id)
  if (!result) { confirmingRecycle.value = false; return }
  clearRecycle()
  receipt.value = result
  act(() => {}, undefined, 'collect')
  sparks('.car-sheet-portrait', palettes.cyan, 18, 0.6)
  recycleTimer = setTimeout(clearRecycle, 6000)
}
function cancelRecycle() {
  if (receipt.value && act(s => undoRecycle(s, receipt.value!, props.id), 'Doublon restitué', 'flip')) clearRecycle()
}
const salePrice = computed(() => sellPrice(save, props.id))
const saleProblem = computed(() => sellCheck(save, props.id))
watch(() => props.id, () => { confirmingSale.value = false })
function sell() {
  if (act(s => sellCar(s, props.id), `+${salePrice.value} crédits`)) emit('close')
}
const selected = ref<StatKey | undefined>(props.suggestedStat)
const prep = computed(() => prepOf(save, props.id))
const stats = computed(() => statsOf(v.value, prep.value))
const image = computed(() => edition(props.id, car.value?.shown).art)
const next = computed(() => stageCost(save, props.id))
const stageProblem = computed(() => {
  if (!car.value || !next.value) return 'Préparation maximale atteinte'
  const missing = []
  const credits = next.value.credits - save.credits
  const duplicates = next.value.duplicates - (car.value.copies - 1)
  if (credits > 0) missing.push(`Il te manque ${credits} crédits`)
  if (duplicates > 0) missing.push(`Il te manque ${duplicates} doublon${duplicates > 1 ? 's' : ''}`)
  return missing.length ? missing.join(' · ') : undefined
})
const evolutions = computed(() => vehicles.filter(e => e.evolvesFrom === props.id))
const base = computed(() => vehicleById.get(v.value.evolvesFrom ?? v.value.culture?.base ?? ''))
const variants = computed(() => vehicles.filter(e => e.culture?.base === props.id && e.evolvesFrom !== props.id))
const inLineup = computed(() => save.lineup.includes(props.id))
const courseScores = computed(() => props.circuit ? circuitScores(racer(props.id, prep.value), props.circuit) : [])
const readiness = computed(() => [...courseScores.value].sort((a, b) => b.average - a.average))
const autoPlan = computed(() => autoUpgradePlan(save, props.id, props.circuit, selected.value ?? props.suggestedStat))
const allStyles = computed(() => stylesOf(props.id).map(style => ({
  style,
  label: styleLabel(v.value, style),
  owned: Boolean(car.value?.editions.includes(style)),
  shown: car.value?.shown === style,
  price: editionPrice(props.id),
  problem: unlockEditionCheck(save, props.id, style),
})))
// Les crédits et doublons demandés sont les mêmes pour tous les styles d'une voiture : une seule raison est écrite.
const lockedProblem = computed(() => allStyles.value.find(item => !item.owned && item.problem)?.problem)

const modules = computed(() => upgradeKeys.map(key => {
  const config = upgrades[key]
  const level = car.value?.upgrades[key] ?? 0
  const fitting = parts.filter(p => config.families.includes(p.family) && !compatibility(p, v.value))
  const installed = fitting.filter(p => car.value?.parts.includes(p.id))
  const available = fitting.filter(p => !car.value?.parts.includes(p.id) && (save.parts[p.id] ?? 0) > 0)
    .map(part => {
      const replaced = installed.find(p => p.family === part.family)
      const candidate = { ...prep.value, parts: [...prep.value.parts.filter(id => id !== replaced?.id), part.id] }
      const result = statsOf(v.value, candidate)
      const changes = upgradeKeys.filter(k => result[k] !== stats.value[k])
        .map(k => `${statLabels[k]} ${stats.value[k]} → ${result[k]}`)
      return { part, replaced, changes, problem: installCheck(save, props.id, part.id) }
    })
  const nextStats = { ...prep.value, upgrades: { ...prep.value.upgrades, [key]: level + 1 } }
  return { key, config, level, installed, available, price: upgradePrices[level], problem: upgradeCheck(save, props.id, key),
    nextValue: statsOf(v.value, nextStats)[key], hasCompatiblePart: fitting.length > 0 }
}))

function improve(key: StatKey) {
  const level = (car.value?.upgrades[key] ?? 0) + 1
  if (!act(s => upgradeStat(s, props.id, key), `${upgrades[key].label} · niveau ${level}`, 'upgrade')) return
  tutorialAction(10, 11)
  buzz(18)
  sparks('.car-sheet-portrait', palettes.cyan, 22, 0.8)
}
function autoImprove() {
  const summary = autoPlan.value?.summary || 'Préparation automatique appliquée'
  if (!act(s => applyAutoUpgrade(s, props.id, props.circuit, selected.value ?? props.suggestedStat), summary, 'upgrade')) return
  tutorialAction(10, 11)
  buzz([18, 25, 35])
  flash(tone.cyan, 0.22)
  sparks('.car-sheet-portrait', palettes.cyan, 34, 1)
}
function chooseStyle(style: EditionStyle) {
  const label = styleLabel(v.value, style)
  if (car.value?.editions.includes(style)) {
    act(s => selectEdition(s, props.id, style), `Style ${label} appliqué`, 'flip')
    return
  }
  if (!act(s => unlockEdition(s, props.id, style), `Style ${label} débloqué`, 'rare')) return
  buzz([15, 30, 20])
  sparks('.car-sheet-portrait', palettes.pink, 28, 1)
}
function stageUp() {
  const stage = (car.value?.stage ?? 0) + 1
  if (!act(s => upgrade(s, props.id), `Stage ${stage} atteint`, 'upgrade')) return
  buzz([20, 30, 40])
  flash(tone.gold, 0.22); shake(stage === 3 ? 2 : 1)
  sparks('.sheet-card', palettes.sun, 30 + stage * 14, 1.1); ring('.sheet-card', tone.gold, 700)
  pop('.sheet-card', 1.08, 420)
}
function fit(partId: string, name: string) {
  if (!act(s => install(s, props.id, partId), `Pièce installée · ${name}`, 'upgrade')) return
  buzz(18)
  void nextTick(() => pop('.car-sheet-portrait', 1.05))
}
function unlock(id: string, open = false) {
  const e = vehicleById.get(id)!
  if (!act(s => craft(s, id), `${e.name} ${e.version} débloquée`, 'legend')) return
  buzz([30, 50, 40, 50, 60])
  flash(tone.light, 0.6); shake(2); confetti(rarityPalette[e.rarity]); sparks('.sheet-card', rarityPalette[e.rarity], 60, 1.3)
  if (open) emit('open', id)
}
function toggleLineup() {
  act(s => {
    if (s.lineup.includes(props.id)) { s.lineup = s.lineup.filter(x => x !== props.id); return }
    if (s.lineup.length >= 3) return 'Ton écurie compte déjà trois voitures'
    s.lineup = [...s.lineup, props.id]
  })
}
function workshop(key?: StatKey) {
  selected.value = key
  panel.value = 'workshop'
}
</script>

<template>
  <div class="sheet car-sheet">
    <header class="car-sheet-header">
      <div class="car-sheet-portrait"><img v-if="image" :src="image" alt="" /></div>
      <div class="car-sheet-title">
        <p>{{ v.version }}</p>
        <h2>{{ v.name }}</h2>
        <span>{{ v.rarity }} · Coût d’écurie {{ v.cost }}</span>
      </div>
      <button v-if="car" type="button" class="favorite-button" aria-label="Favori" :aria-pressed="car.favorite"
        @click="act(() => { car.favorite = !car.favorite })"><span aria-hidden="true">{{ car.favorite ? '★' : '☆' }}</span></button>
    </header>

    <div v-if="car" class="tabs car-sheet-tabs" aria-label="Fiche voiture">
      <button type="button" :aria-pressed="panel === 'overview'" @click="panel = 'overview'">Performances</button>
      <button type="button" :aria-pressed="panel === 'workshop'" @click="workshop()">Atelier</button>
      <button type="button" :aria-pressed="panel === 'card'" @click="panel = 'card'">Carte</button>
    </div>

    <div class="car-sheet-layout" :class="{ 'has-car': Boolean(car) }">
      <aside class="car-sheet-aside" :class="{ 'mobile-hidden': car && panel !== 'card' }">
        <div ref="zoomFrame" class="sheet-card zoom-frame" :class="{ 'is-zoomed': zoom.scale > 1, 'reduce-zoom-motion': reducedMotion }"
          :style="{ touchAction: zoom.scale > 1 ? 'none' : 'pan-y' }"
          @wheel="wheelZoom" @dblclick="switchZoom" @dragstart.prevent
          @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="drag = undefined" @pointercancel="drag = undefined"
          @touchstart="touchStart" @touchmove="touchMove" @touchend="touchEnd" @touchcancel="clearZoom">
          <div class="card-zoom-transform" :style="{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` }">
            <div v-tilt><CarCard :id="id" :style-name="car?.shown" :prep="car ? prep : undefined" /></div>
          </div>
        </div>
      </aside>

      <div class="car-sheet-main">
        <section v-if="receipt" class="sheet-section" role="status">
          <p>Doublon recyclé · +{{ receipt.credits }} crédits</p>
          <button type="button" class="button ghost" @click="cancelRecycle">Annuler</button>
        </section>
        <section v-if="car && panel !== 'card'" class="sheet-section auto-upgrade-box">
          <div class="section-row">
            <h3>Amélioration automatique</h3>
            <span class="hint">Potentiel {{ prepUsed(prep) }}/{{ potential(v, car.stage) }} · Stage {{ car.stage }}/3</span>
          </div>
          <template v-if="autoPlan && autoPlan.steps.length">
            <p class="hint">Ce que l’amélioration va faire :</p>
            <ul class="auto-upgrade-steps">
              <li v-for="(stepText, i) in autoPlan.steps" :key="i">{{ stepText }}</li>
            </ul>
            <p v-if="autoPlan.statChanges.length || autoPlan.staminaAfter > autoPlan.staminaBefore" class="upgrade-preview">
              {{ [
                ...autoPlan.statChanges.map(c => `${c.label} ${c.before} → ${c.after}`),
                ...(autoPlan.staminaAfter > autoPlan.staminaBefore ? [`Secteurs avant surchauffe ${autoPlan.staminaBefore} → ${autoPlan.staminaAfter}`] : []),
              ].join(' · ') }}
            </p>
            <button type="button" class="button primary wide" @click="autoImprove">
              Améliorer automatiquement · {{ autoPlan.credits ? `${autoPlan.credits} crédits` : 'Gratuit (pièces en stock)' }}<template v-if="autoPlan.duplicates"> + {{ autoPlan.duplicates }} doublon{{ autoPlan.duplicates > 1 ? 's' : '' }}</template>
            </button>
          </template>
          <template v-else>
            <p class="hint">{{ autoPlan?.blockedReason ?? 'Voiture déjà préparée au maximum avec ton stock actuel.' }}</p>
            <button type="button" class="button ghost wide" disabled>Améliorer automatiquement</button>
          </template>
        </section>

        <section v-if="car && (panel === 'overview' || panel === 'card')" class="sheet-section edition-section">
          <div class="section-row">
            <h3><span v-help="'edition'">Styles & Éditions</span></h3>
            <small class="hint">{{ car.editions.length }}/{{ allStyles.length }} débloqué{{ car.editions.length > 1 ? 's' : '' }}</small>
          </div>
          <p class="hint">Change l’apparence de ta carte ou débloque un autre style créé pour cette voiture avec des crédits et {{ editionDuplicates }} doublons.</p>
          <div class="edition-picker">
            <button v-for="item in allStyles" :key="item.style" type="button"
              :class="{ 'is-locked': !item.owned }"
              :aria-pressed="item.shown"
              :disabled="!item.owned && Boolean(item.problem)"
              @click="chooseStyle(item.style)">
              <b>{{ item.label }}</b>
              <small v-if="item.shown">✓ Affiché</small>
              <small v-else-if="item.owned">Appliquer</small>
              <small v-else>Débloquer · {{ item.price }} ₡ + {{ editionDuplicates }} doublons</small>
            </button>
          </div>
          <p v-if="lockedProblem" class="hint">{{ lockedProblem }}</p>
          <p class="hint">Éditions possédées : {{ car.editions.map(style => styleLabel(v, style)).join(', ') }}</p>
        </section>

        <template v-if="car && panel === 'overview'">
          <section v-if="circuit" class="sheet-section">
            <h3>Sur {{ circuit.name }}</h3>
            <p v-if="readiness.length" class="hint">Meilleur secteur estimé · {{ readiness[0].label }} ({{ readiness[0].average.toFixed(1).replace('.', ',') }} pts)</p>
            <p class="hint">Les estimations incluent le terrain et les bonus propres à la voiture.</p>
            <button type="button" class="button small ghost" @click="workshop(courseScores[0]?.stat)">Préparer pour ce circuit</button>
          </section>

          <section class="sheet-section">
            <h3>Statistiques</h3>
            <ul class="car-stats">
              <li v-for="key in upgradeKeys" :key="key">
                <b v-help="key">{{ statLabels[key] }}</b><strong>{{ stats[key] }}<small>/{{ STAT_CAP }}</small></strong>
                <span class="stat-track" aria-hidden="true"><span :style="{ width: `${stats[key] / STAT_CAP * 100}%` }"></span></span>
                <p>{{ statUse[key] }}</p>
              </li>
            </ul>
            <p class="hint">{{ engagements(v, prep) }} secteurs avant surchauffe avec cette préparation.</p>
          </section>

          <section class="sheet-section">
            <h3>{{ v.signature.name }}</h3>
            <p class="hint">{{ v.signature.text }}</p>
            <button type="button" class="button small ghost" @click="toggleLineup">{{ inLineup ? 'Retirer de l’écurie' : 'Ajouter à l’écurie' }}</button>
          </section>

          <section class="sheet-section">
            <h3><span v-help="'stage'">Stage</span> {{ car.stage }}/3 & Doublons</h3>
            <p class="hint">{{ next ? next.text : 'Stage maximal atteint.' }}</p>
            <button v-if="next" type="button" class="button ghost" :disabled="Boolean(stageProblem)" @click="stageUp">
              Passer au Stage {{ next.stage }} · {{ next.credits }} crédits<template v-if="next.duplicates"> + {{ next.duplicates }} doublon{{ next.duplicates > 1 ? 's' : '' }}</template>
            </button>
            <p v-if="next && stageProblem" class="hint">{{ stageProblem }}</p>
            <template v-if="car.copies > 1">
              <p class="hint">{{ car.copies - 1 }} doublon(s) en stock.</p>
              <template v-if="confirmingRecycle">
                <p role="status">Recycler ce doublon pour +{{ progression.scrap[v.rarity] }} crédits ?</p>
                <div class="car-sale-actions">
                  <button type="button" class="button primary" @click="confirmRecycle">Confirmer</button>
                  <button type="button" class="button ghost" @click="confirmingRecycle = false">Annuler</button>
                </div>
              </template>
              <button v-else type="button" class="button small quiet" @click="confirmingRecycle = true">Recycler un doublon · +{{ progression.scrap[v.rarity] }} crédits</button>
            </template>
          </section>
        </template>

        <template v-else-if="car && panel === 'workshop'">
          <p class="hint workshop-intro">Les niveaux restent acquis à cette voiture. Au niveau {{ partUnlockLevel }}, tu peux monter les pièces compatibles de ton stock.</p>
          <ul class="workshop-list">
            <li v-for="module in modules" :key="module.key" class="workshop-module" :class="{ 'module-selected': selected === module.key }">
              <button type="button" class="module-trigger" :aria-expanded="selected === module.key" :aria-controls="`module-${module.key}`"
                @click="selected = selected === module.key ? undefined : module.key">
                <img :src="art.part(module.config.art)" alt="" />
                <span><b>{{ module.config.label }}</b><small>{{ statLabels[module.key] }} {{ stats[module.key] }}/{{ STAT_CAP }}</small></span>
                <span class="module-level">Niv. {{ module.level }}/{{ partUnlockLevel }}</span>
                <span aria-hidden="true">{{ selected === module.key ? '−' : '+' }}</span>
              </button>
              <div v-show="selected === module.key" :id="`module-${module.key}`" class="module-content">
                <p class="hint">{{ statUse[module.key] }}</p>
                <template v-if="module.price !== undefined">
                  <p v-if="module.nextValue > stats[module.key]" class="upgrade-preview">{{ statLabels[module.key] }} {{ stats[module.key] }} → {{ module.nextValue }}</p>
                  <p v-else class="hint">{{ statLabels[module.key] }} atteint déjà {{ STAT_CAP }} avec cette préparation.</p>
                  <button type="button" class="button primary wide" :disabled="Boolean(module.problem)" @click="improve(module.key)">
                    {{ `Passer au niveau ${module.level + 1} · ${module.price} crédits` }}
                  </button>
                  <p v-if="module.problem" class="hint">{{ module.problem }}</p>
                </template>
                <div v-if="module.installed.length || module.available.length || module.level === partUnlockLevel" class="module-parts">
                  <div class="section-row">
                    <h3>Cartes Mécanique</h3>
                    <span class="hint">Potentiel {{ prepUsed(prep) }}/{{ potential(v, car.stage) }}</span>
                  </div>
                  <article v-for="part in module.installed" :key="part.id" class="workshop-part fitted">
                    <img :src="art.part(part.id)" alt="" />
                    <div><small>{{ families[part.family] }} · Installée</small><b>{{ part.name }}</b><p>{{ part.text }}</p>
                      <button type="button" class="button small quiet" @click="act(s => uninstall(s, id, part.id), 'Pièce rendue au stock')">Retirer</button>
                    </div>
                  </article>
                  <article v-for="o in module.available" :key="o.part.id" class="workshop-part">
                    <img :src="art.part(o.part.id)" alt="" />
                    <div><small>{{ families[o.part.family] }} · {{ o.part.rarity }} · {{ freeParts(save, o.part.id) }} libre(s)</small><b>{{ o.part.name }}</b>
                      <p>{{ o.part.text }} · {{ o.part.cost }} de potentiel</p>
                      <p v-if="o.replaced">Remplace {{ o.replaced.name }} (rendue au stock).</p>
                      <p v-if="o.changes.length" class="upgrade-preview">{{ o.changes.join(' · ') }}</p>
                      <p v-if="o.problem" class="hint">{{ o.problem }}</p>
                      <button type="button" class="button small ghost" :disabled="Boolean(o.problem)" :aria-label="`Installer ${o.part.name}`" @click="fit(o.part.id, o.part.name)">Installer</button>
                    </div>
                  </article>
                  <p v-if="!module.installed.length && !module.available.length" class="hint">
                    {{ module.hasCompatiblePart ? 'Aucune pièce compatible en stock. Tu peux en trouver dans les boosters.' : 'Aucune carte Mécanique de cette famille ne convient à cette voiture.' }}
                  </p>
                </div>
              </div>
            </li>
          </ul>
          <section class="sheet-section">
            <h3><span v-help="'stage'">Stage</span> {{ car.stage }}/3</h3>
            <p class="hint">Les stages augmentent le potentiel pour monter des cartes Mécanique. Ils donnent accès aux évolutions lorsqu’il y en a.</p>
            <button v-if="next" type="button" class="button ghost" :disabled="Boolean(stageProblem)" @click="stageUp">
              Passer au Stage {{ next.stage }} · {{ next.credits }} crédits<template v-if="next.duplicates"> + {{ next.duplicates }} doublon{{ next.duplicates > 1 ? 's' : '' }}</template>
            </button>
            <p v-if="next" class="hint">{{ stageProblem ?? next.text }}</p>
          </section>
        </template>

        <template v-else>
          <section v-if="!car" class="sheet-section">
            <h3>Pas encore dans ton garage</h3>
            <p v-if="v.craft" class="hint">Évolution de {{ base?.name }} {{ base?.version }}. Prépare-la au Stage {{ v.craft.stage }}, puis débloque-la pour {{ v.craft.credits }} crédits.<template v-if="v.craft.inBoosters"> Elle sort aussi des boosters.</template></p>
            <p v-else class="hint">Disponible dans les boosters.</p>
            <button v-if="v.craft" type="button" class="button primary" :disabled="Boolean(craftCheck(save, id))" @click="unlock(id, true)">
              {{ `Débloquer · ${v.craft.credits} crédits` }}
            </button>
            <p v-if="v.craft && craftCheck(save, id)" class="hint">{{ craftCheck(save, id) }}</p>
          </section>
          <section v-else class="sheet-section">
            <h3><span v-help="'stage'">Stage</span> {{ car.stage }}/3</h3>
            <p class="hint">Les stages augmentent le potentiel pour monter des cartes Mécanique. Ils donnent accès aux évolutions lorsqu’il y en a.</p>
            <button v-if="next" type="button" class="button ghost" :disabled="Boolean(stageProblem)" @click="stageUp">
              Passer au Stage {{ next.stage }} · {{ next.credits }} crédits<template v-if="next.duplicates"> + {{ next.duplicates }} doublon{{ next.duplicates > 1 ? 's' : '' }}</template>
            </button>
            <p v-if="next" class="hint">{{ stageProblem ?? next.text }}</p>
            <template v-if="car.copies > 1">
              <p class="hint">{{ car.copies - 1 }} doublon(s) en stock.</p>
              <template v-if="confirmingRecycle">
                <p role="status">Recycler ce doublon pour +{{ progression.scrap[v.rarity] }} crédits ?</p>
                <div class="car-sale-actions">
                  <button type="button" class="button primary" @click="confirmRecycle">Confirmer</button>
                  <button type="button" class="button ghost" @click="confirmingRecycle = false">Annuler</button>
                </div>
              </template>
              <button v-else type="button" class="button small quiet" @click="confirmingRecycle = true">Recycler un doublon · +{{ progression.scrap[v.rarity] }} crédits</button>
            </template>
          </section>
          <section v-if="car && evolutions.length" class="sheet-section">
            <h3>Évolutions</h3>
            <div v-for="e in evolutions" :key="e.id" class="evolution">
              <span><b>{{ e.name }} {{ e.version }}</b><small>{{ e.signature.name }} · {{ e.signature.text }}</small></span>
              <button v-if="save.cars[e.id]" type="button" class="button small ghost" @click="emit('open', e.id)">Voir</button>
              <button v-else type="button" class="button small primary" :disabled="Boolean(craftCheck(save, e.id))" @click="unlock(e.id)">
                {{ `Débloquer · ${e.craft!.credits} cr.` }}
              </button>
              <p v-if="!save.cars[e.id] && craftCheck(save, e.id)" class="hint">{{ craftCheck(save, e.id) }}</p>
            </div>
          </section>
          <section class="sheet-section spec">
            <h3>Caractéristiques</h3>
            <dl>
              <div><dt>Année</dt><dd>{{ v.year }}</dd></div>
              <div><dt>Origine</dt><dd>{{ v.origin }}</dd></div>
              <div><dt>Transmission</dt><dd>{{ v.drive }}</dd></div>
              <div><dt>Moteur</dt><dd>{{ v.engine }}</dd></div>
              <div><dt>Catégories</dt><dd>{{ v.tags.join(', ') }}</dd></div>
              <div v-if="v.culture"><dt>Œuvre</dt><dd>{{ v.culture.work }} · aura {{ v.culture.aura.join(', ') }}</dd></div>
              <div v-if="base"><dt>Version de base</dt><dd><button type="button" class="link" @click="emit('open', base.id)">{{ base.name }} {{ base.version }}</button></dd></div>
              <div v-if="variants.length"><dt>Éditions culturelles</dt><dd>
                <button v-for="x in variants" :key="x.id" type="button" class="link" @click="emit('open', x.id)">{{ x.name }}</button>
              </dd></div>
              <div v-if="v.spec"><dt>Donnée réelle</dt><dd>{{ v.spec }} <small>(à vérifier)</small></dd></div>
            </dl>
          </section>
          <section v-if="v.story" class="sheet-section car-story">
            <h3>Histoire</h3>
            <p>{{ v.story }}</p>
          </section>
        </template>

        <section v-if="car" class="sheet-section car-sale">
          <div class="section-row">
            <h3><span v-help="'vente'">Revente</span></h3>
            <span v-if="car.copies > 1" class="hint">{{ car.copies }} exemplaires</span>
          </div>
          <template v-if="confirmingSale">
            <p>Vendre {{ v.name }} ? Elle quittera ta collection.</p>
            <div class="car-sale-actions">
              <button type="button" class="button primary" :disabled="Boolean(saleProblem)" @click="sell">Confirmer la vente</button>
              <button type="button" class="button ghost" @click="confirmingSale = false">Annuler</button>
            </div>
          </template>
          <button v-else type="button" class="button ghost" :disabled="Boolean(saleProblem)" @click="confirmingSale = true">Vendre · {{ salePrice }} crédits</button>
          <p v-if="saleProblem" class="hint" role="status">{{ saleProblem }}</p>
        </section>
      </div>
    </div>
  </div>
</template>
