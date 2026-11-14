<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { art, edition } from '../game/art'
import { families, partById, parts, progression, statLabels, styleLabel, vehicleById, vehicles, type Rival, type StatKey } from '../game/data'
import { confetti, flash, palettes, pop, rarityPalette, ring, shake, sparks, vTilt, tone } from '../game/fx'
import { vHelp } from '../game/help'
import { circuitScores, compatibility, engagements, partUnlockLevel, potential, prepUsed, racer, STAT_CAP, statsOf, statUse,
  upgradeKeys, upgradePrices, upgrades } from '../game/rules'
import { craft, craftCheck, freeParts, install, installCheck, prepOf, scrapCar, sellCar, sellCheck, sellPrice, stageCost, uninstall, upgrade, upgradeCheck, upgradeStat } from '../game/save'
import { act, buzz, save } from '../game/store'
import CarCard from '../components/CarCard.vue'

const props = defineProps<{ id: string; circuit?: Rival['circuit']; suggestedStat?: StatKey; showCard?: boolean }>()
const emit = defineEmits<{ open: [id: string]; close: [] }>()
const v = computed(() => vehicleById.get(props.id)!)
const car = computed(() => save.cars[props.id])
const panel = ref<'overview' | 'workshop' | 'card'>(props.suggestedStat && car.value ? 'workshop' : !car.value || props.showCard ? 'card' : 'overview')
const confirmingSale = ref(false)
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
const evolutions = computed(() => vehicles.filter(e => e.evolvesFrom === props.id))
const base = computed(() => vehicleById.get(v.value.evolvesFrom ?? v.value.culture?.base ?? ''))
const variants = computed(() => vehicles.filter(e => e.culture?.base === props.id))
const inLineup = computed(() => save.lineup.includes(props.id))
const courseScores = computed(() => props.circuit ? circuitScores(racer(props.id, prep.value), props.circuit) : [])
const readiness = computed(() => [...courseScores.value].sort((a, b) => b.average - a.average))

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
  buzz(18)
  sparks('.car-sheet-portrait', palettes.cyan, 22, 0.8)
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

    <section v-if="car" class="sheet-section car-sale">
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
                {{ module.problem ?? `Passer au niveau ${module.level + 1} · ${module.price} crédits` }}
              </button>
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
    </template>

    <template v-else>
      <div class="sheet-card">
        <div v-tilt><CarCard :id="id" :style-name="car?.shown" :prep="car ? prep : undefined" /></div>
      </div>
      <p v-if="car" class="hint">Éditions : {{ car.editions.map(style => styleLabel(v, style)).join(', ') }}</p>
      <section v-if="!car" class="sheet-section">
        <h3>Pas encore dans ton garage</h3>
        <p v-if="v.craft" class="hint">Évolution de {{ base?.name }} {{ base?.version }}. Prépare-la au Stage {{ v.craft.stage }}, puis débloque-la pour {{ v.craft.credits }} crédits.</p>
        <p v-else class="hint">Disponible dans les boosters.</p>
        <button v-if="v.craft" type="button" class="button primary" :disabled="Boolean(craftCheck(save, id))" @click="unlock(id, true)">
          {{ craftCheck(save, id) ?? `Débloquer · ${v.craft.credits} crédits` }}
        </button>
      </section>
      <section v-else class="sheet-section">
        <h3><span v-help="'stage'">Stage</span> {{ car.stage }}/3</h3>
        <p class="hint">Les stages augmentent le potentiel pour monter des cartes Mécanique. Ils donnent accès aux évolutions lorsqu’il y en a.</p>
        <button v-if="next" type="button" class="button ghost" @click="stageUp">
          Passer au Stage {{ next.stage }} · {{ next.credits }} crédits<template v-if="next.duplicates"> + {{ next.duplicates }} doublon{{ next.duplicates > 1 ? 's' : '' }}</template>
        </button>
        <p v-if="next" class="hint">{{ next.text }}</p>
        <template v-if="car.copies > 1">
          <p class="hint">{{ car.copies - 1 }} doublon(s) en stock.</p>
          <button type="button" class="button small quiet" @click="act(s => scrapCar(s, id), `+${progression.scrap[v.rarity]} crédits`)">Recycler un doublon · +{{ progression.scrap[v.rarity] }} crédits</button>
        </template>
      </section>
      <section v-if="car && evolutions.length" class="sheet-section">
        <h3>Évolutions</h3>
        <div v-for="e in evolutions" :key="e.id" class="evolution">
          <span><b>{{ e.name }} {{ e.version }}</b><small>{{ e.signature.name }} · {{ e.signature.text }}</small></span>
          <button v-if="save.cars[e.id]" type="button" class="button small ghost" @click="emit('open', e.id)">Voir</button>
          <button v-else type="button" class="button small primary" :disabled="Boolean(craftCheck(save, e.id))" @click="unlock(e.id)">
            {{ craftCheck(save, e.id) ?? `Débloquer · ${e.craft!.credits} cr.` }}
          </button>
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
    </template>
  </div>
</template>
