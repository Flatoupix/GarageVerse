<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { playEditionCue } from '../feedback'
import { art, edition } from '../game/art'
import { families, partById, parts, progression, statLabels, styleLabel, stylesOf, vehicleById, vehicles, type EditionStyle, type Rival, type StatKey } from '../game/data'
import { confetti, flash, palettes, pop, rarityPalette, ring, shake, sparks, vTilt, tone } from '../game/fx'
import { vHelp } from '../game/help'
import { circuitScores, compatibility, engagements, EXTRA_SLOT_POTENTIAL, EXTRA_SLOT_PRICE, extraSlotFamily, partUnlockLevel, potential, prepUsed, racer, STAT_CAP, statsOf, statUse,
  upgradeKeys, upgradePrices, upgrades } from '../game/rules'
import { applyAutoUpgrade, autoUpgradePlan, craft, craftCheck, discardEditionPurchase, editionDuplicates, editionPrice, editionUndoDuration, extraSlotCheck, freeParts, install, installCheck, isCarMaxedForExtraSlot, partReplacedOnInstall, prepOf,
  selectEdition, sellCar, sellCheck, sellPrice, stageCost, undoableEditionPurchase, undoEditionUnlock, uninstall, unlockEdition, unlockEditionCheck, unlockExtraSlot, upgrade, upgradeCheck, upgradeStat } from '../game/save'
import { inTransit } from '../game/trade'
import { recycle, undoRecycle, type RecycleReceipt } from '../game/recycle'
import { act, buzz, persist, reducedMotion, save } from '../game/store'
import { tutorialAction } from '../game/tutorial'
import CarCard from '../components/CarCard.vue'
import { t, tp, tc } from '../i18n'

const props = defineProps<{ id: string; circuit?: Rival['circuit']; suggestedStat?: StatKey; showCard?: boolean; showWorkshop?: boolean }>()
const emit = defineEmits<{ open: [id: string]; close: [] }>()
const v = computed(() => vehicleById.get(props.id)!)
const transit = computed(() => inTransit(save, props.id))
const car = computed(() => transit.value ? undefined : save.cars[props.id])
function toggleFavorite() {
  act(s => {
    const owned = s.cars[props.id]
    if (!owned || inTransit(s, props.id)) return
    owned.favorite = !owned.favorite
  })
}
const panel = ref<'overview' | 'workshop' | 'card'>((props.suggestedStat || props.showWorkshop) && car.value ? 'workshop' : !car.value || props.showCard ? 'card' : 'overview')
watch(() => props.id, () => {
  panel.value = (props.suggestedStat || props.showWorkshop) && car.value ? 'workshop' : !car.value || props.showCard ? 'card' : 'overview'
})
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
  if (save.cars[id] && !inTransit(save, id) && !save.seenCars?.includes(id)) act(s => { (s.seenCars ??= []).push(id) })
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
  if (receipt.value && act(s => undoRecycle(s, receipt.value!, props.id), t('Doublon restitué'), 'flip')) clearRecycle()
}
const salePrice = computed(() => sellPrice(save, props.id))
const saleProblem = computed(() => sellCheck(save, props.id))
watch(() => props.id, () => { confirmingSale.value = false })
function sell() {
  if (act(s => sellCar(s, props.id), t('+{n} crédits', { n: salePrice.value }))) emit('close')
}
const selected = ref<StatKey | undefined>(props.suggestedStat)
const prep = computed(() => prepOf(save, props.id))
const stats = computed(() => statsOf(v.value, prep.value))
const previewStyle = ref<EditionStyle>()
const shownStyle = computed(() => (car.value && previewStyle.value) || (transit.value ?? car.value)?.shown)
const image = computed(() => edition(props.id, shownStyle.value).art)
const next = computed(() => stageCost(save, props.id))
const stageProblem = computed(() => {
  if (!car.value || !next.value) return t('Préparation maximale atteinte')
  const missing = []
  const credits = next.value.credits - save.credits
  const duplicates = next.value.duplicates - (car.value.copies - 1)
  if (credits > 0) missing.push(t('Il te manque {n} crédits', { n: credits }))
  if (duplicates > 0) missing.push(tp('Il te manque {n} doublon', 'Il te manque {n} doublons', duplicates))
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
  shown: shownStyle.value === style,
  price: editionPrice(props.id),
  problem: unlockEditionCheck(save, props.id, style),
})))
const preview = computed(() => allStyles.value.find(item => item.style === previewStyle.value && !item.owned))

const modules = computed(() => upgradeKeys.map(key => {
  const config = upgrades[key]
  const level = car.value?.upgrades[key] ?? 0
  const fitting = parts.filter(p => config.families.includes(p.family) && !compatibility(p, v.value))
  const installed = fitting.filter(p => car.value?.parts.includes(p.id))
  const available = fitting.filter(p => !car.value?.parts.includes(p.id) && (save.parts[p.id] ?? 0) > 0)
    .map(part => {
      const replaced = car.value ? partReplacedOnInstall(car.value, part) : installed.find(p => p.family === part.family)
      const candidate = { ...prep.value, parts: [...prep.value.parts.filter(id => id !== replaced?.id), part.id] }
      const result = statsOf(v.value, candidate)
      const changes = upgradeKeys.filter(k => result[k] !== stats.value[k])
        .map(k => `${statLabels[k]} ${stats.value[k]} → ${result[k]}`)
      return { part, replaced, changes, problem: installCheck(save, props.id, part.id) }
    })
  const nextStats = { ...prep.value, upgrades: { ...prep.value.upgrades, [key]: level + 1 } }
  return { key, config, level, installed, available, price: upgradePrices[level], problem: upgradeCheck(save, props.id, key),
    nextValue: statsOf(v.value, nextStats)[key], hasCompatiblePart: fitting.length > 0,
    extraFamily: extraSlotFamily[key] && families[extraSlotFamily[key]!],
    extraSlotActive: car.value?.extraSlot === key,
    extraSlotProblem: extraSlotCheck(save, props.id, key) }
}))

function improve(key: StatKey) {
  const level = (car.value?.upgrades[key] ?? 0) + 1
  if (!act(s => upgradeStat(s, props.id, key), t('{label} · niveau {level}', { label: t(upgrades[key].label), level }), 'upgrade')) return
  tutorialAction(10, 11)
  buzz(18)
  sparks('.car-sheet-portrait', palettes.cyan, 22, 0.8)
}
function autoImprove() {
  const summary = autoPlan.value?.summary || t('Préparation automatique appliquée')
  if (!act(s => applyAutoUpgrade(s, props.id, props.circuit, selected.value ?? props.suggestedStat), summary, 'upgrade')) return
  tutorialAction(10, 11)
  buzz([18, 25, 35])
  flash(tone.cyan, 0.22)
  sparks('.car-sheet-portrait', palettes.cyan, 34, 1)
}
const purchase = shallowRef<typeof save.editionPurchase>()
const undoPurchase = computed(() => purchase.value && undoableEditionPurchase(save, props.id) === purchase.value ? purchase.value : undefined)
const editionMessage = ref('')
let editionTimer: ReturnType<typeof setTimeout> | undefined
let stopSparks: (() => void) | undefined
let stopCue: (() => void) | undefined

function stopEditionEffects() {
  stopSparks?.()
  stopCue?.()
  stopSparks = stopCue = undefined
}
function clearEditionUndo() {
  clearTimeout(editionTimer)
  if (purchase.value && save.editionPurchase === purchase.value) discardEditionPurchase(save, purchase.value.id)
  purchase.value = undefined
  stopEditionEffects()
}
watch(undoPurchase, current => { if (!current) clearEditionUndo() })
watch(reducedMotion, reduced => { if (reduced) stopEditionEffects() })
watch(() => props.id, () => {
  clearEditionUndo()
  previewStyle.value = undefined
  editionMessage.value = ''
})
onBeforeUnmount(clearEditionUndo)

function chooseStyle(style: EditionStyle) {
  if (!car.value?.editions.includes(style)) {
    previewStyle.value = style
    return
  }
  previewStyle.value = undefined
  act(s => selectEdition(s, props.id, style), t('Style {label} appliqué', { label: t(styleLabel(v.value, style)) }), 'flip')
}
function buyStyle() {
  const item = preview.value
  if (!item || item.problem || !act(s => unlockEdition(s, props.id, item.style))) return
  clearEditionUndo()
  previewStyle.value = undefined
  editionMessage.value = ''
  const current = undoableEditionPurchase(save, props.id)
  if (!current) {
    discardEditionPurchase(save, props.id)
    editionMessage.value = t('Style {label} débloqué', { label: t(item.label) })
    return
  }
  purchase.value = current
  editionTimer = setTimeout(clearEditionUndo, Math.max(0, current.at + editionUndoDuration - Date.now()))
  if (reducedMotion.value) return
  if (save.preferences.sound) stopCue = playEditionCue()
  buzz([15, 30, 20])
  stopSparks = sparks('.car-sheet-portrait', palettes.pink, 28, 1)
}
function cancelEdition() {
  const result = undoPurchase.value && undoEditionUnlock(save, props.id)
  clearEditionUndo()
  if (!result) return
  previewStyle.value = undefined
  persist()
  editionMessage.value = t('Achat annulé : {credits} ₡ et {n} doublons rendus', { credits: result.credits, n: result.duplicates })
}
function stageUp() {
  const stage = (car.value?.stage ?? 0) + 1
  if (!act(s => upgrade(s, props.id), t('Stage {n} atteint', { n: stage }), 'upgrade')) return
  buzz([20, 30, 40])
  flash(tone.gold, 0.22); shake(stage === 3 ? 2 : 1)
  sparks('.sheet-card', palettes.sun, 30 + stage * 14, 1.1); ring('.sheet-card', tone.gold, 700)
  pop('.sheet-card', 1.08, 420)
}
function fit(partId: string, name: string) {
  if (!act(s => install(s, props.id, partId), t('Pièce installée · {name}', { name: t(name) }), 'upgrade')) return
  buzz(18)
  void nextTick(() => pop('.car-sheet-portrait', 1.05))
}
function buyExtraSlot(key: StatKey) {
  if (!act(s => unlockExtraSlot(s, props.id, key), t('3ᵉ emplacement débloqué · {label}', { label: t(upgrades[key].label) }), 'legend')) return
  buzz([25, 40, 50])
  flash(tone.gold, 0.3)
  sparks('.car-sheet-portrait', palettes.gold, 40, 1.1)
}
function unlock(id: string, open = false) {
  const e = vehicleById.get(id)!
  if (!act(s => craft(s, id), t('{name} {version} débloquée', { name: e.name, version: e.version }), 'legend')) return
  buzz([30, 50, 40, 50, 60])
  const colors = rarityPalette(e.rarity)
  flash(colors[1], 0.6); shake(2); confetti(colors); sparks('.sheet-card', colors, 60, 1.3)
  if (open) emit('open', id)
}
function toggleLineup() {
  act(s => {
    if (s.lineup.includes(props.id)) { s.lineup = s.lineup.filter(x => x !== props.id); return }
    if (s.lineup.length >= 3) return t('Ton écurie compte déjà trois voitures')
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
        <p v-if="transit">{{ t('En transit') }}</p>
        <span>{{ t('{rarity} · Coût d’écurie {cost}', { rarity: t(v.rarity), cost: v.cost }) }}</span>
      </div>
      <button v-if="car" type="button" class="favorite-button" :aria-label="t('Favori')" :aria-pressed="car.favorite"
        @click="toggleFavorite"><span aria-hidden="true">{{ car.favorite ? '★' : '☆' }}</span></button>
    </header>

    <div v-if="car" class="tabs car-sheet-tabs" :aria-label="t('Fiche voiture')">
      <button type="button" :aria-pressed="panel === 'overview'" @click="panel = 'overview'">{{ t('Performances') }}</button>
      <button type="button" :aria-pressed="panel === 'workshop'" @click="workshop()">{{ t('Atelier') }}</button>
      <button type="button" :aria-pressed="panel === 'card'" @click="panel = 'card'">{{ t('Carte') }}</button>
    </div>

    <div class="car-sheet-layout" :class="{ 'has-car': Boolean(car) }">
      <aside class="car-sheet-aside" :class="{ 'mobile-hidden': car && panel !== 'card' && !preview }">
        <div class="sheet-card" @dragstart.prevent>
          <div v-tilt><CarCard :id="id" :style-name="shownStyle" :prep="transit ?? (car ? prep : undefined)" /></div>
        </div>
      </aside>

      <div v-if="transit" class="car-sheet-main">
        <p role="status">{{ saleProblem }}</p>
      </div>
      <div v-else class="car-sheet-main">
        <section v-if="receipt" class="sheet-section" role="status">
          <p>{{ t('Doublon recyclé · +{n} crédits', { n: receipt.credits }) }}</p>
          <button type="button" class="button ghost" @click="cancelRecycle">{{ tc('retour', 'Annuler') }}</button>
        </section>
        <section v-if="car && panel !== 'card'" class="sheet-section auto-upgrade-box">
          <div class="section-row">
            <h3>{{ t('Amélioration automatique') }}</h3>
            <span class="hint">{{ t('Potentiel {used}/{max} · Stage {stage}/3', { used: prepUsed(prep), max: potential(v, car.stage, car.extraSlot), stage: car.stage }) }}</span>
          </div>
          <template v-if="autoPlan && autoPlan.steps.length">
            <p class="hint">{{ t('Ce que l’amélioration va faire :') }}</p>
            <ul class="auto-upgrade-steps">
              <li v-for="(stepText, i) in autoPlan.steps" :key="i">{{ stepText }}</li>
            </ul>
            <p v-if="autoPlan.statChanges.length || autoPlan.staminaAfter > autoPlan.staminaBefore" class="upgrade-preview">
              {{ [
                ...autoPlan.statChanges.map(c => `${t(c.label)} ${c.before} → ${c.after}`),
                ...(autoPlan.staminaAfter > autoPlan.staminaBefore ? [t('Secteurs avant surchauffe {before} → {after}', { before: autoPlan.staminaBefore, after: autoPlan.staminaAfter })] : []),
              ].join(' · ') }}
            </p>
            <button type="button" class="button primary wide" @click="autoImprove">
              {{ t('Améliorer automatiquement') }} · {{ autoPlan.credits ? t('{n} crédits', { n: autoPlan.credits }) : t('Gratuit (pièces en stock)') }}<template v-if="autoPlan.duplicates"> + {{ tp('{n} doublon', '{n} doublons', autoPlan.duplicates) }}</template>
            </button>
          </template>
          <template v-else>
            <p class="hint">{{ autoPlan?.blockedReason ?? t('Voiture déjà préparée au maximum avec ton stock actuel.') }}</p>
            <button type="button" class="button ghost wide" disabled>{{ t('Améliorer automatiquement') }}</button>
          </template>
        </section>

        <section v-if="car && (panel !== 'workshop' || undoPurchase || editionMessage)" class="sheet-section edition-section">
          <template v-if="panel !== 'workshop'">
            <div class="section-row">
              <h3><span v-help="'edition'">{{ t('Styles & Éditions') }}</span></h3>
              <small class="hint">{{ tp('{n}/{total} débloqué', '{n}/{total} débloqués', car.editions.length, { total: allStyles.length }) }}</small>
            </div>
            <p class="hint">{{ t('Change l’apparence de ta carte ou débloque un autre style créé pour cette voiture avec des crédits et {n} doublons.', { n: editionDuplicates }) }}</p>
            <div class="edition-picker">
              <button v-for="item in allStyles" :key="item.style" type="button"
                :class="{ 'is-locked': !item.owned }"
                :aria-pressed="item.shown"
                @click="chooseStyle(item.style)">
                <b>{{ t(item.label) }}</b>
                <small v-if="item.shown && item.owned">{{ t('✓ Affiché') }}</small>
                <small v-else-if="item.owned">{{ t('Appliquer') }}</small>
                <small v-else>{{ t('Aperçu') }}</small>
              </button>
            </div>
            <template v-if="preview">
              <button type="button" class="button primary wide" :disabled="Boolean(preview.problem)" @click="buyStyle">
                {{ t('Débloquer · {price} ₡ + {n} doublons', { price: preview.price, n: editionDuplicates }) }}
              </button>
              <p v-if="preview.problem" class="hint">{{ preview.problem }}</p>
            </template>
            <p class="hint">{{ t('Éditions possédées : {list}', { list: car.editions.map(style => t(styleLabel(v, style))).join(', ') }) }}</p>
          </template>
          <div v-if="undoPurchase || editionMessage">
            <p role="status">{{ undoPurchase ? t('Style {label} débloqué', { label: t(styleLabel(v, undoPurchase.style)) }) : editionMessage }}</p>
            <button v-if="undoPurchase" type="button" class="button ghost" @click="cancelEdition">{{ t('Annuler') }}</button>
          </div>
        </section>

        <template v-if="car && panel === 'overview'">
          <section v-if="circuit" class="sheet-section">
            <h3>{{ t('Sur {name}', { name: circuit.name }) }}</h3>
            <p v-if="readiness.length" class="hint">{{ t('Meilleur secteur estimé · {sector} ({pts} pts)', { sector: t(readiness[0].label), pts: readiness[0].average.toFixed(1).replace('.', ',') }) }}</p>
            <p class="hint">{{ t('Les estimations incluent le terrain et les bonus propres à la voiture.') }}</p>
            <button type="button" class="button small ghost" @click="workshop(courseScores[0]?.stat)">{{ t('Préparer pour ce circuit') }}</button>
          </section>

          <section class="sheet-section">
            <h3>{{ t('Statistiques') }}</h3>
            <ul class="car-stats">
              <li v-for="key in upgradeKeys" :key="key">
                <b v-help="key">{{ t(statLabels[key]) }}</b><strong>{{ stats[key] }}<small>/{{ STAT_CAP }}</small></strong>
                <span class="stat-track" aria-hidden="true"><span :style="{ width: `${stats[key] / STAT_CAP * 100}%` }"></span></span>
                <p>{{ t(statUse[key]) }}</p>
              </li>
            </ul>
            <p class="hint">{{ t('{n} secteurs avant surchauffe avec cette préparation.', { n: engagements(v, prep) }) }}</p>
          </section>

          <section class="sheet-section">
            <h3>{{ v.signature.name }}</h3>
            <p class="hint">{{ t(v.signature.text) }}</p>
            <button type="button" class="button small ghost" @click="toggleLineup">{{ inLineup ? t('Retirer de l’écurie') : t('Ajouter à l’écurie') }}</button>
          </section>

          <section class="sheet-section">
            <h3><span v-help="'stage'">{{ t('Stage') }}</span> {{ car.stage }}/3 & {{ t('Doublons') }}</h3>
            <p class="hint">{{ next ? t(next.text) : t('Stage maximal atteint.') }}</p>
            <button v-if="next" type="button" class="button ghost" :disabled="Boolean(stageProblem)" @click="stageUp">
              {{ t('Passer au Stage {n} · {credits} crédits', { n: next.stage, credits: next.credits }) }}<template v-if="next.duplicates"> + {{ tp('{n} doublon', '{n} doublons', next.duplicates) }}</template>
            </button>
            <p v-if="next && stageProblem" class="hint">{{ stageProblem }}</p>
            <template v-if="car.copies > 1">
              <p class="hint">{{ tp('{n} doublon en stock.', '{n} doublons en stock.', car.copies - 1) }}</p>
              <template v-if="confirmingRecycle">
                <p role="status">{{ t('Recycler ce doublon pour +{n} crédits ?', { n: progression.scrap[v.rarity] }) }}</p>
                <div class="car-sale-actions">
                  <button type="button" class="button primary" @click="confirmRecycle">{{ t('Confirmer') }}</button>
                  <button type="button" class="button ghost" @click="confirmingRecycle = false">{{ t('Annuler') }}</button>
                </div>
              </template>
              <button v-else type="button" class="button small quiet" @click="confirmingRecycle = true">{{ t('Recycler un doublon · +{n} crédits', { n: progression.scrap[v.rarity] }) }}</button>
            </template>
          </section>
        </template>

        <template v-else-if="car && panel === 'workshop'">
          <p class="hint workshop-intro">{{ t('Les niveaux restent acquis à cette voiture. Au niveau {level}, tu peux monter les pièces compatibles de ton stock.', { level: partUnlockLevel }) }} <template v-if="isCarMaxedForExtraSlot(car)">{{ t('Voiture maxée : tu peux débloquer un 3ᵉ emplacement de pièce (+{n} potentiel) dans un atelier de ton choix, sauf Pneus et suspension. Il accueille une 2ᵉ pièce d’une famille de cet atelier.', { n: EXTRA_SLOT_POTENTIAL }) }}</template></p>
          <ul class="workshop-list">
            <li v-for="module in modules" :key="module.key" class="workshop-module" :class="{ 'module-selected': selected === module.key }">
              <button type="button" class="module-trigger" :aria-expanded="selected === module.key" :aria-controls="`module-${module.key}`"
                @click="selected = selected === module.key ? undefined : module.key">
                <img :src="art.part(module.config.art)" alt="" />
                <span><b>{{ t(module.config.label) }}</b><small>{{ t(statLabels[module.key]) }} {{ stats[module.key] }}/{{ STAT_CAP }}</small></span>
                <span class="module-level">{{ t('Niv. {level}/{max}', { level: module.level, max: partUnlockLevel }) }}<template v-if="module.extraSlotActive"> · {{ t('★ 3 pièces') }}</template></span>
                <span aria-hidden="true">{{ selected === module.key ? '−' : '+' }}</span>
              </button>
              <div v-show="selected === module.key" :id="`module-${module.key}`" class="module-content">
                <p class="hint">{{ t(statUse[module.key]) }}</p>
                <template v-if="module.price !== undefined">
                  <p v-if="module.nextValue > stats[module.key]" class="upgrade-preview">{{ t(statLabels[module.key]) }} {{ stats[module.key] }} → {{ module.nextValue }}</p>
                  <p v-else class="hint">{{ t('{stat} atteint déjà {cap} avec cette préparation.', { stat: t(statLabels[module.key]), cap: STAT_CAP }) }}</p>
                  <button type="button" class="button primary wide" :disabled="Boolean(module.problem)" @click="improve(module.key)">
                    {{ t('Passer au niveau {level} · {price} crédits', { level: module.level + 1, price: module.price }) }}
                  </button>
                  <p v-if="module.problem" class="hint">{{ module.problem }}</p>
                </template>
                <div v-if="isCarMaxedForExtraSlot(car) && module.extraFamily" class="extra-slot-box">
                  <p v-if="module.extraSlotActive" class="upgrade-preview">{{ t('★ 3ᵉ emplacement actif : une 2ᵉ pièce {family} (+{n} potentiel)', { family: t(module.extraFamily), n: EXTRA_SLOT_POTENTIAL }) }}</p>
                  <template v-else>
                    <button type="button" class="button small ghost" :disabled="Boolean(module.extraSlotProblem)" @click="buyExtraSlot(module.key)">
                      {{ car.extraSlot ? t('Transférer le 3ᵉ emplacement ici · {price} crédits', { price: EXTRA_SLOT_PRICE }) : t('Débloquer une 2ᵉ pièce {family} (+{n} potentiel) · {price} crédits', { family: t(module.extraFamily), n: EXTRA_SLOT_POTENTIAL, price: EXTRA_SLOT_PRICE }) }}
                    </button>
                    <p v-if="module.extraSlotProblem" class="hint">{{ module.extraSlotProblem }}</p>
                  </template>
                </div>
                <div v-if="module.installed.length || module.available.length || module.level === partUnlockLevel" class="module-parts">
                  <div class="section-row">
                    <h3>{{ t('Cartes Mécanique ({n}/{max})', { n: module.installed.length, max: module.extraSlotActive ? 3 : 2 }) }}</h3>
                    <span class="hint">{{ t('Potentiel {used}/{max}', { used: prepUsed(prep), max: potential(v, car.stage, car.extraSlot) }) }}</span>
                  </div>
                  <article v-for="part in module.installed" :key="part.id" class="workshop-part fitted">
                    <img :src="art.part(part.id)" alt="" />
                    <div><small>{{ t('{family} · Installée', { family: t(families[part.family]) }) }}</small><b>{{ t(part.name) }}</b><p>{{ t(part.text) }}</p>
                      <button type="button" class="button small quiet" @click="act(s => uninstall(s, id, part.id), t('Pièce rendue au stock'))">{{ t('Retirer') }}</button>
                    </div>
                  </article>
                  <article v-for="o in module.available" :key="o.part.id" class="workshop-part">
                    <img :src="art.part(o.part.id)" alt="" />
                    <div><small>{{ t('{family} · {rarity} · {n} libre(s)', { family: t(families[o.part.family]), rarity: t(o.part.rarity), n: freeParts(save, o.part.id) }) }}</small><b>{{ t(o.part.name) }}</b>
                      <p>{{ t('{text} · {n} de potentiel', { text: t(o.part.text), n: o.part.cost }) }}</p>
                      <p v-if="o.replaced">{{ t('Remplace {name} (rendue au stock).', { name: t(o.replaced.name) }) }}</p>
                      <p v-if="o.changes.length" class="upgrade-preview">{{ o.changes.join(' · ') }}</p>
                      <p v-if="o.problem" class="hint">{{ o.problem }}</p>
                      <button type="button" class="button small ghost" :disabled="Boolean(o.problem)" :aria-label="t('Installer {name}', { name: t(o.part.name) })" @click="fit(o.part.id, o.part.name)">{{ t('Installer') }}</button>
                    </div>
                  </article>
                  <p v-if="!module.installed.length && !module.available.length" class="hint">
                    {{ module.hasCompatiblePart ? t('Aucune pièce compatible en stock. Tu peux en trouver dans les boosters.') : t('Aucune carte Mécanique de cette famille ne convient à cette voiture.') }}
                  </p>
                </div>
              </div>
            </li>
          </ul>
          <section class="sheet-section">
            <h3><span v-help="'stage'">{{ t('Stage') }}</span> {{ car.stage }}/3</h3>
            <p class="hint">{{ t('Les stages augmentent le potentiel pour monter des cartes Mécanique. Ils donnent accès aux évolutions lorsqu’il y en a.') }}</p>
            <button v-if="next" type="button" class="button ghost" :disabled="Boolean(stageProblem)" @click="stageUp">
              {{ t('Passer au Stage {n} · {credits} crédits', { n: next.stage, credits: next.credits }) }}<template v-if="next.duplicates"> + {{ tp('{n} doublon', '{n} doublons', next.duplicates) }}</template>
            </button>
            <p v-if="next" class="hint">{{ stageProblem ?? t(next.text) }}</p>
          </section>
        </template>

        <template v-else>
          <section v-if="!car" class="sheet-section">
            <h3>{{ t('Pas encore dans ton garage') }}</h3>
            <p v-if="v.craft" class="hint">{{ t('Évolution de {name}. Prépare-la au Stage {stage}, puis débloque-la pour {credits} crédits.', { name: `${base?.name} ${base?.version}`, stage: v.craft.stage, credits: v.craft.credits }) }}<template v-if="v.craft.inBoosters"> {{ t('Elle sort aussi des boosters.') }}</template></p>
            <p v-else class="hint">{{ t('Disponible dans les boosters.') }}</p>
            <button v-if="v.craft" type="button" class="button primary" :disabled="Boolean(craftCheck(save, id))" @click="unlock(id, true)">
              {{ t('Débloquer · {n} crédits', { n: v.craft.credits }) }}
            </button>
            <p v-if="v.craft && craftCheck(save, id)" class="hint">{{ craftCheck(save, id) }}</p>
          </section>
          <section v-else class="sheet-section">
            <h3><span v-help="'stage'">{{ t('Stage') }}</span> {{ car.stage }}/3</h3>
            <p class="hint">{{ t('Les stages augmentent le potentiel pour monter des cartes Mécanique. Ils donnent accès aux évolutions lorsqu’il y en a.') }}</p>
            <button v-if="next" type="button" class="button ghost" :disabled="Boolean(stageProblem)" @click="stageUp">
              {{ t('Passer au Stage {n} · {credits} crédits', { n: next.stage, credits: next.credits }) }}<template v-if="next.duplicates"> + {{ tp('{n} doublon', '{n} doublons', next.duplicates) }}</template>
            </button>
            <p v-if="next" class="hint">{{ stageProblem ?? t(next.text) }}</p>
            <template v-if="car.copies > 1">
              <p class="hint">{{ tp('{n} doublon en stock.', '{n} doublons en stock.', car.copies - 1) }}</p>
              <template v-if="confirmingRecycle">
                <p role="status">{{ t('Recycler ce doublon pour +{n} crédits ?', { n: progression.scrap[v.rarity] }) }}</p>
                <div class="car-sale-actions">
                  <button type="button" class="button primary" @click="confirmRecycle">{{ t('Confirmer') }}</button>
                  <button type="button" class="button ghost" @click="confirmingRecycle = false">{{ t('Annuler') }}</button>
                </div>
              </template>
              <button v-else type="button" class="button small quiet" @click="confirmingRecycle = true">{{ t('Recycler un doublon · +{n} crédits', { n: progression.scrap[v.rarity] }) }}</button>
            </template>
          </section>
          <section class="sheet-section spec">
            <h3>{{ t('Caractéristiques') }}</h3>
            <dl>
              <div><dt>{{ t('Année') }}</dt><dd>{{ v.year }}</dd></div>
              <div><dt>{{ t('Origine') }}</dt><dd>{{ t(v.origin) }}</dd></div>
              <div><dt>{{ t('Transmission') }}</dt><dd>{{ v.drive }}</dd></div>
              <div><dt>{{ t('Moteur') }}</dt><dd>{{ v.engine }}</dd></div>
              <div><dt>{{ t('Catégories') }}</dt><dd>{{ v.tags.map(tag => tc('tag', tag)).join(', ') }}</dd></div>
              <div v-if="v.culture"><dt>{{ t('Œuvre') }}</dt><dd>{{ t('{work} · aura {aura}', { work: v.culture.work, aura: v.culture.aura.map(a => tc('tag', a)).join(', ') }) }}</dd></div>
              <div v-if="base"><dt>{{ t('Version de base') }}</dt><dd><button type="button" class="link" @click="emit('open', base.id)">{{ base.name }} {{ base.version }}</button></dd></div>
              <div v-if="variants.length"><dt>{{ t('Éditions culturelles') }}</dt><dd>
                <button v-for="x in variants" :key="x.id" type="button" class="link" @click="emit('open', x.id)">{{ x.name }}</button>
              </dd></div>
              <div v-if="v.spec"><dt>{{ t('Donnée réelle') }}</dt><dd>{{ t(v.spec) }} <small>{{ t('(à vérifier)') }}</small></dd></div>
            </dl>
          </section>
          <section v-if="v.story" class="sheet-section car-story">
            <h3>{{ t('Histoire') }}</h3>
            <p>{{ t(v.story) }}</p>
          </section>
        </template>

        <section v-if="car && evolutions.length" class="sheet-section">
          <h3>{{ t('Évolutions (Stage 3)') }}</h3>
          <div v-for="e in evolutions" :key="e.id" class="evolution">
            <span class="evolution-text"><b>{{ e.name }}</b><small>{{ e.version }} · {{ t(e.rarity) }}</small><small>{{ e.signature.name }} · {{ t(e.signature.text) }}</small></span>
            <button v-if="save.cars[e.id]" type="button" class="button ghost" @click="emit('open', e.id)">{{ t('Voir la carte') }}</button>
            <button v-else type="button" class="button primary" :disabled="Boolean(craftCheck(save, e.id))" @click="unlock(e.id)">
              {{ t('Débloquer · {n} crédits', { n: e.craft!.credits }) }}
            </button>
            <p v-if="!save.cars[e.id] && craftCheck(save, e.id)" class="hint">{{ craftCheck(save, e.id) }}</p>
          </div>
        </section>

        <section v-if="car" class="sheet-section car-sale">
          <div class="section-row">
            <h3><span v-help="'vente'">{{ t('Revente') }}</span></h3>
            <span v-if="car.copies > 1" class="hint">{{ t('{n} exemplaires', { n: car.copies }) }}</span>
          </div>
          <template v-if="confirmingSale">
            <p>{{ t('Vendre {name} ? Elle quittera ta collection.', { name: v.name }) }}</p>
            <div class="car-sale-actions">
              <button type="button" class="button primary" :disabled="Boolean(saleProblem)" @click="sell">{{ t('Confirmer la vente') }}</button>
              <button type="button" class="button ghost" @click="confirmingSale = false">{{ t('Annuler') }}</button>
            </div>
          </template>
          <button v-else type="button" class="button ghost" :disabled="Boolean(saleProblem)" @click="confirmingSale = true">{{ t('Vendre · {n} crédits', { n: salePrice }) }}</button>
          <p v-if="saleProblem" class="hint" role="status">{{ saleProblem }}</p>
        </section>
      </div>
    </div>
  </div>
</template>
