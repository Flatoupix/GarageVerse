<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { families, partById, parts, progression, stylesOf, vehicleById, vehicles } from '../game/data'
import { confetti, flash, palettes, pop, rarityPalette, ring, shake, sparks, vTilt } from '../game/fx'
import { compatibility, engagements, potential, prepUsed } from '../game/rules'
import { craft, craftCheck, freeParts, install, installCheck, prepOf, scrapCar, stageCost, uninstall, upgrade } from '../game/save'
import { act, buzz, save } from '../game/store'
import CarCard from '../components/CarCard.vue'

const props = defineProps<{ id: string }>()
const emit = defineEmits<{ open: [id: string] }>()
const v = computed(() => vehicleById.get(props.id)!)
const car = computed(() => save.cars[props.id])
const prep = computed(() => prepOf(save, props.id))
const max = computed(() => potential(v.value, car.value?.stage ?? 0))
const used = computed(() => prepUsed(prep.value))
const next = computed(() => stageCost(save, props.id))
const evolutions = computed(() => vehicles.filter(e => e.evolvesFrom === props.id))
const base = computed(() => v.value.evolvesFrom ? vehicleById.get(v.value.evolvesFrom) : v.value.culture?.base ? vehicleById.get(v.value.culture.base) : undefined)
const variants = computed(() => vehicles.filter(e => e.culture?.base === props.id))

const slots = computed(() => Object.entries(families).map(([family, label]) => {
  const fitted = car.value?.parts.map(id => partById.get(id)!).find(p => p.family === family)
  const options = parts.filter(p => p.family === family && p.id !== fitted?.id && (save.parts[p.id] ?? 0) > 0)
    .map(p => ({ part: p, problem: installCheck(save, props.id, p.id) }))
  return { family, label, fitted, options }
}))

// Chaque progrès au garage se fête : étincelles sur la carte, onde et secousse.
function stageUp() {
  const stage = (car.value?.stage ?? 0) + 1
  if (!act(s => upgrade(s, props.id), `Stage ${stage} atteint`, 'upgrade')) return
  buzz([20, 30, 40])
  flash('#ffb347', 0.22); shake(stage === 3 ? 2 : 1)
  sparks('.sheet-card', palettes.sun, 30 + stage * 14, 1.1); ring('.sheet-card', '#ffb347', 700)
  pop('.sheet-card', 1.08, 420)
}
function fit(partId: string, name: string, event: Event) {
  const at = (event.currentTarget as Element).getBoundingClientRect()
  if (!act(s => install(s, props.id, partId), `${name} installée`, 'upgrade')) return
  buzz(18)
  sparks({ x: at.left + at.width / 2, y: at.top + at.height / 2 }, palettes.cyan, 18, 0.8)
  void nextTick(() => pop('.sheet-card', 1.05))
}
function unlock(id: string) {
  const e = vehicleById.get(id)!
  if (!act(s => craft(s, id), `${e.name} ${e.version} débloquée`, 'legend')) return
  buzz([30, 50, 40, 50, 60])
  flash('#ffffff', 0.6); shake(2); confetti(rarityPalette[e.rarity]); sparks('.sheet-card', rarityPalette[e.rarity], 60, 1.3)
}

const inLineup = computed(() => save.lineup.includes(props.id))
function toggleLineup() {
  act(s => {
    if (s.lineup.includes(props.id)) { s.lineup = s.lineup.filter(x => x !== props.id); return }
    if (s.lineup.length >= 3) return 'Ton écurie compte déjà trois voitures'
    s.lineup = [...s.lineup, props.id]
  })
  pop('.sheet-card', 1.05)
}
</script>

<template>
  <div class="sheet">
    <div class="sheet-card">
      <div v-tilt><CarCard :id="id" :style-name="car?.shown" :prep="car ? prep : undefined" /></div>
    </div>
    <div v-if="car && car.editions.length > 1" class="edition-picker" aria-label="Éditions possédées">
      <button v-for="style in stylesOf(id).filter(s => car.editions.includes(s))" :key="style" type="button"
        :aria-pressed="car.shown === style" @click="act(() => { car.shown = style })">{{ style }}</button>
    </div>

    <section v-if="!car" class="sheet-section">
      <h3>Pas encore dans ton garage</h3>
      <p v-if="v.craft">Évolution de {{ base?.name }} {{ base?.version }} : prépare-la au Stage {{ v.craft.stage }} puis débloque-la pour {{ v.craft.credits }} crédits.</p>
      <p v-else>Carte {{ v.rarity }}. Elle peut sortir de n’importe quel booster{{ v.culture ? ', plus souvent d’After Hours' : '' }}.</p>
      <button v-if="v.craft" type="button" class="button primary" :disabled="Boolean(craftCheck(save, id))"
        @click="unlock(id)">
        {{ craftCheck(save, id) ?? `Débloquer · ${v.craft.credits} crédits` }}
      </button>
    </section>

    <template v-else>
      <section class="sheet-section">
        <div class="section-row">
          <h3>Préparation · Stage {{ car.stage }}/3</h3>
          <button type="button" class="button small" :class="inLineup ? 'quiet' : 'ghost'" @click="toggleLineup">{{ inLineup ? 'Retirer de l’écurie' : 'Ajouter à l’écurie' }}</button>
        </div>
        <div class="potential">
          <span>Potentiel</span>
          <div class="potential-bar"><span v-for="n in max" :key="n" :class="{ on: n <= used }"></span></div>
          <b>{{ used }}/{{ max }}</b>
        </div>
        <button v-if="next" type="button" class="button primary wide" @click="stageUp">
          Passer Stage {{ next.stage }} · {{ next.credits }} crédits<template v-if="next.duplicates"> + {{ next.duplicates }} doublon{{ next.duplicates > 1 ? 's' : '' }}</template>
        </button>
        <p class="hint">{{ next ? `Stage ${next.stage} : ${next.text}.` : 'Préparation maximale.' }} Tu as {{ car.copies - 1 }} doublon{{ car.copies - 1 > 1 ? 's' : '' }}.</p>
      </section>

      <section class="sheet-section">
        <h3>Cartes Mécanique installées</h3>
        <ul class="slots">
          <li v-for="slot in slots.filter(x => x.fitted || x.options.length)" :key="slot.family" :class="{ filled: slot.fitted }">
            <span class="slot-name">{{ slot.label }}</span>
            <template v-if="slot.fitted">
              <span class="slot-part"><b>{{ slot.fitted.name }}</b> <small>{{ slot.fitted.text }}</small></span>
              <button type="button" class="button small quiet" @click="act(s => uninstall(s, id, slot.fitted!.id))">Retirer</button>
            </template>
            <div v-if="slot.options.length" class="slot-options">
              <button v-for="o in slot.options" :key="o.part.id" type="button" class="part-option" :disabled="Boolean(o.problem)"
                :title="o.problem" @click="fit(o.part.id, o.part.name, $event)">
                <b>{{ o.part.name }}</b><small>{{ o.problem ?? `${o.part.text} · prépa ${o.part.cost} · ${freeParts(save, o.part.id)} libre` }}</small>
              </button>
            </div>
          </li>
        </ul>
        <p v-if="slots.some(x => !x.fitted && !x.options.length)" class="hint empty-slots">
          Sans pièce en stock : {{ slots.filter(x => !x.fitted && !x.options.length).map(x => x.label).join(', ') }}. Ouvre des boosters pour en trouver.
        </p>
      </section>

      <section v-if="evolutions.length" class="sheet-section">
        <h3>Évolutions</h3>
        <div v-for="e in evolutions" :key="e.id" class="evolution">
          <span><b>{{ e.name }} {{ e.version }}</b><small>{{ e.signature.name }} · {{ e.signature.text }}</small></span>
          <button v-if="save.cars[e.id]" type="button" class="button small ghost" @click="emit('open', e.id)">Voir</button>
          <button v-else type="button" class="button small primary" :disabled="Boolean(craftCheck(save, e.id))"
            @click="unlock(e.id)">
            {{ craftCheck(save, e.id) ?? `Débloquer · ${e.craft!.credits} cr.` }}
          </button>
        </div>
      </section>

      <section v-if="car.copies > 1" class="sheet-section">
        <h3>Doublons</h3>
        <p class="hint">Les doublons servent aux Stages 2 et 3. Tu peux aussi en recycler un contre {{ progression.scrap[v.rarity] }} crédits.</p>
        <button type="button" class="button small quiet" @click="act(s => scrapCar(s, id), `+${progression.scrap[v.rarity]} crédits`)">Recycler un doublon</button>
      </section>
    </template>

    <section class="sheet-section spec">
      <h3>Fiche</h3>
      <dl>
        <div><dt>Année</dt><dd>{{ v.year }}</dd></div>
        <div><dt>Origine</dt><dd>{{ v.origin }}</dd></div>
        <div><dt>Transmission</dt><dd>{{ v.drive }}</dd></div>
        <div><dt>Moteur</dt><dd>{{ v.engine }}</dd></div>
        <div><dt>Secteurs par course</dt><dd>{{ engagements(v, car ? prep : { stage: 0, parts: [] }) }}</dd></div>
        <div><dt>Catégories</dt><dd>{{ v.tags.join(', ') }}</dd></div>
        <div v-if="v.culture"><dt>Œuvre</dt><dd>{{ v.culture.work }} · aura {{ v.culture.aura.join(', ') }}</dd></div>
        <div v-if="base"><dt>Version de base</dt><dd><button type="button" class="link" @click="emit('open', base.id)">{{ base.name }} {{ base.version }}</button></dd></div>
        <div v-if="variants.length"><dt>Éditions culturelles</dt><dd>
          <button v-for="x in variants" :key="x.id" type="button" class="link" @click="emit('open', x.id)">{{ x.name }}</button>
        </dd></div>
        <div v-if="v.spec"><dt>Donnée réelle</dt><dd>{{ v.spec }} <small>(à vérifier)</small></dd></div>
      </dl>
      <p v-if="parts.some(p => !compatibility(p, v) && p.requires)" class="hint">
        Pièces spécifiques compatibles : {{ parts.filter(p => p.requires && !compatibility(p, v)).map(p => p.name).join(', ') }}.
      </p>
    </section>
  </div>
</template>
