<script setup lang="ts">
import { computed } from 'vue'
import { partById, progression, vehicleById, type StatKey } from '../game/data'
import { compatibility, partUnlockLevel, upgradeForFamily } from '../game/rules'
import { freeParts, lockedInDuel, scrapPart, uninstall, uninstallPartEverywhere } from '../game/save'
import { vTilt } from '../game/fx'
import { act, save } from '../game/store'
import PartCard from '../components/PartCard.vue'
import { t, tp } from '../i18n'

const props = defineProps<{ id: string }>()
const emit = defineEmits<{ open: [id: string, stat?: StatKey] }>()
const part = computed(() => partById.get(props.id)!)
const stat = computed(() => upgradeForFamily(part.value.family))
const mounted = computed(() => Object.entries(save.cars).filter(([, c]) => c.parts.includes(props.id)).map(([id]) => vehicleById.get(id)!))
const removableMounted = computed(() => mounted.value.filter(v => !lockedInDuel(save, v.id)))
const fits = computed(() => Object.keys(save.cars).map(id => vehicleById.get(id)!).filter(v => !compatibility(part.value, v) && !mounted.value.includes(v)))

function removeFromCar(carId: string, carName: string) {
  act(s => { uninstall(s, carId, props.id) }, t('Retirée de {name}', { name: carName }), 'flip')
}
function removeEverywhere() {
  act(s => uninstallPartEverywhere(s, props.id), t('Pièce retirée de toutes tes voitures'), 'flip')
}
</script>

<template>
  <div class="sheet">
    <div class="sheet-card part-sheet-card"><div v-tilt><PartCard :id="id" /></div></div>
    <section class="sheet-section">
      <h3>{{ t('Stock') }}</h3>
      <p class="hint">{{ tp('{n} exemplaire', '{n} exemplaires', save.parts[id] ?? 0) }}, {{ tp('{n} libre', '{n} libres', Math.max(0, freeParts(save, id))) }}. {{ t('Tu peux la retirer pour rendre l’exemplaire au stock.') }}</p>
      <div v-if="mounted.length" class="mounted-cars">
        <p class="hint">{{ t('Montage actuel :') }}</p>
        <div class="fit-list">
          <span v-for="v in mounted" :key="v.id" class="mounted-chip">
            <button type="button" class="link" @click="emit('open', v.id, stat)">{{ v.name }} {{ v.version }}</button>
            <button v-if="!lockedInDuel(save, v.id)" type="button" class="button small quiet" :aria-label="t('Retirer de {name}', { name: v.name })" @click="removeFromCar(v.id, v.name)">{{ t('Retirer') }}</button>
          </span>
        </div>
        <button v-if="removableMounted.length > 1" type="button" class="button small ghost" @click="removeEverywhere">
          {{ t('Retirer de toutes les voitures ({n})', { n: removableMounted.length }) }}
        </button>
      </div>
      <button v-if="freeParts(save, id) > 0" type="button" class="button small quiet"
        @click="act(s => scrapPart(s, id), t('+{n} crédits', { n: Math.round(progression.scrap[part.rarity] / 2) }))">
        {{ t('Recycler un exemplaire libre') }}
      </button>
    </section>
    <section class="sheet-section">
      <h3>{{ t('Compatible avec ton garage') }}</h3>
      <p v-if="!fits.length" class="hint">{{ t('Aucune autre voiture de ton garage ne peut la recevoir.') }}</p>
      <p v-else class="hint">{{ t('Choisis une voiture pour ouvrir son atelier. Cette pièce se monte au niveau {level}.', { level: partUnlockLevel }) }}</p>
      <div class="fit-list">
        <button v-for="v in fits" :key="v.id" type="button" class="chip" @click="emit('open', v.id, stat)">{{ v.name }} {{ v.version }}</button>
      </div>
    </section>
  </div>
</template>
