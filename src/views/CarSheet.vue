<script setup lang="ts">
import { computed } from 'vue'
import { families, partById, parts, progression, stylesOf, vehicleById, vehicles } from '../game/data'
import { compatibility, engagements, potential, prepUsed } from '../game/rules'
import { craft, craftCheck, freeParts, install, installCheck, prepOf, scrapCar, stageCost, uninstall, upgrade } from '../game/save'
import { act, save } from '../game/store'
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

const inLineup = computed(() => save.lineup.includes(props.id))
function toggleLineup() {
  act(s => {
    if (s.lineup.includes(props.id)) { s.lineup = s.lineup.filter(x => x !== props.id); return }
    if (s.lineup.length >= 3) return 'Ton écurie compte déjà trois voitures'
    s.lineup = [...s.lineup, props.id]
  })
}
</script>

<template>
  <div class="sheet">
    <div class="sheet-card">
      <CarCard :id="id" :style-name="car?.shown" :prep="car ? prep : undefined" />
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
        @click="act(s => craft(s, id), `${v.name} ${v.version} débloquée`, 'upgrade')">
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
        <button v-if="next" type="button" class="button primary wide"
          @click="act(s => upgrade(s, id), `Stage ${car.stage + 1} atteint`, 'upgrade')">
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
                :title="o.problem" @click="act(s => install(s, id, o.part.id), `${o.part.name} installée`, 'upgrade')">
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
            @click="act(s => craft(s, e.id), `${e.name} ${e.version} débloquée`, 'upgrade')">
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
