<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { t, tp } from '../i18n'
import { art } from '../game/art'
import { partById, rarities, rarityClass, rarityMark, vehicleById, type Rarity } from '../game/data'
import { selectEdition, type BoosterBatch, type Pull } from '../game/save'
import { act, save } from '../game/store'
import CarThumb from './CarThumb.vue'
import PullCard from './PullCard.vue'

const props = defineProps<{ batch: BoosterBatch; celebrate: boolean }>()
const emit = defineEmits<{ garage: []; shop: [] }>()

const rarity = ref<Rarity | ''>('')
const newOnly = ref(false)
const detail = ref<Pull>()
const dialog = ref<HTMLDialogElement>()
const cardData = (pull: Pull) => (pull.kind === 'car' ? vehicleById.get(pull.id) : partById.get(pull.id))!
const status = (pull: Pull) => pull.isNew ? t('Nouveau') : t('Doublon')
const pulls = computed(() => props.batch.packs.flat())
const newCount = computed(() => pulls.value.filter(pull => pull.isNew).length)
const duplicateCount = computed(() => pulls.value.length - newCount.value)
const partCount = computed(() => pulls.value.filter(pull => pull.kind === 'part').length)
const best = computed(() => [...rarities].reverse().find(value => pulls.value.some(pull => cardData(pull).rarity === value))!)
const matching = computed(() => props.batch.packs.map((pack, index) => ({
  index, cards: pack.filter(pull => (!rarity.value || cardData(pull).rarity === rarity.value) && (!newOnly.value || pull.isNew)),
})).filter(pack => pack.cards.length))
const highlighted = (pull: Pull) => cardData(pull).rarity === best.value || (pull.isNew && cardData(pull).rarity === 'Épique')
async function showDetail(pull: Pull) {
  detail.value = pull
  await nextTick()
  if (dialog.value && !dialog.value.open) dialog.value.showModal()
}
function displayEdition() {
  const pull = detail.value
  if (pull?.kind === 'car') act(state => selectEdition(state, pull.id, pull.style))
}
</script>

<template>
  <div class="booster-stage booster-recap">
    <div class="booster-art batch-results">
      <div class="batch-summary" :class="[`rarity-${rarityClass[best]}`, { 'batch-celebrate': celebrate }]" role="status">
        <strong>{{ t('{n} cartes révélées', { n: pulls.length }) }}</strong>
        <div class="batch-totals">
          <span>{{ tp('dont {n} pièce', 'dont {n} pièces', partCount) }}</span>
          <span>{{ tp('{n} nouveauté', '{n} nouveautés', newCount) }}</span>
          <span>{{ tp('{n} doublon', '{n} doublons', duplicateCount) }}</span>
        </div>
      </div>
      <div class="batch-filters">
        <label>{{ t('Rareté') }}
          <select v-model="rarity">
            <option value="">{{ t('Toutes') }}</option>
            <option v-for="value in rarities" :key="value" :value="value">{{ t(value) }}</option>
          </select>
        </label>
        <label><input v-model="newOnly" type="checkbox" /> {{ t('Nouveautés') }}</label>
      </div>
      <p v-if="!matching.length" role="status">{{ t('Aucune carte ne correspond à tes filtres.') }}</p>
      <section v-for="pack in matching" :key="pack.index" class="batch-pack">
        <h2>{{ t('Booster {n} sur {total}', { n: pack.index + 1, total: batch.packs.length }) }}</h2>
        <div class="batch-grid">
          <button v-for="(pull, index) in pack.cards" :key="index" type="button" class="batch-tile"
            :class="[`rarity-${rarityClass[cardData(pull).rarity]}`, { 'batch-highlight': highlighted(pull) }]"
            :aria-label="`${t(cardData(pull).name)} · ${t(cardData(pull).rarity)} · ${status(pull)}`" @click="showDetail(pull)">
            <CarThumb v-if="pull.kind === 'car'" :id="pull.id" :style-name="pull.style" />
            <span v-else class="car-thumb batch-part">
              <img v-if="art.part(pull.id)" :src="art.part(pull.id)" alt="" loading="lazy" decoding="async" />
              <span class="car-thumb-number" aria-hidden="true">{{ rarityMark[cardData(pull).rarity] }} {{ t('MÉCA') }}</span>
            </span>
            <span class="batch-status" :class="{ 'batch-new': pull.isNew }">{{ status(pull) }}</span>
          </button>
        </div>
      </section>
    </div>
    <div class="booster-actions">
      <button type="button" class="button primary" @click="emit('garage')">{{ t('Voir le garage') }} <span aria-hidden="true">→</span></button>
      <button type="button" class="button quiet" @click="emit('shop')">{{ t('Autre booster') }}</button>
    </div>
    <dialog ref="dialog" class="modal batch-detail" aria-labelledby="batch-detail-title" @close="detail = undefined">
      <button type="button" class="button ghost" autofocus @click="dialog?.close()">{{ t('Fermer') }}</button>
      <template v-if="detail">
        <h2 id="batch-detail-title">{{ t(cardData(detail).name) }} · {{ status(detail) }}</h2>
        <PullCard :pull="detail" compact />
        <button v-if="detail.kind === 'car' && save.cars[detail.id] && save.cars[detail.id].shown !== detail.style"
          type="button" class="button primary" @click="displayEdition">{{ t('Afficher cette édition') }}</button>
      </template>
    </dialog>
  </div>
</template>

<style scoped>
.batch-results { padding-block: 4px 12px; }
.batch-summary, .batch-filters, .batch-pack { width: 100%; max-width: 540px; margin-inline: auto; }
.batch-summary { padding: 8px; border: 1px solid var(--rarity-color); border-radius: var(--radius); }
.batch-totals, .batch-filters { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 12px; }
.batch-totals { font-size: .875rem; }
.batch-filters { margin-block: 12px; }
.batch-filters label { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; }
.batch-filters select { max-width: 100%; min-height: 36px; color: inherit; background: var(--night); border: 1px solid var(--line); border-radius: 6px; }
.batch-pack { margin-block: 12px; text-align: start; }
.batch-pack h2 { font-size: .9rem; margin: 0 0 6px; }
.batch-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; }
.batch-tile { min-width: 0; border: 0; padding: 0; background: none; color: inherit; cursor: pointer; }
.batch-highlight .car-thumb { box-shadow: 0 0 7px var(--rarity-color); }
.batch-part img { object-fit: contain; }
.batch-status { display: block; font-size: .625rem; line-height: 1.2; padding-block: 3px; overflow-wrap: anywhere; }
.batch-new { font-weight: 800; color: var(--rarity-color); }
.batch-detail { text-align: center; }
.batch-detail :deep(.gv-card) { max-width: 320px; margin-inline: auto; }
.batch-detail .button { margin-block: 6px; }
.batch-celebrate { animation: batch-glow .85s ease-out; }
@keyframes batch-glow {
  35% { box-shadow: inset 0 0 22px var(--rarity-color); }
}
@media (prefers-reduced-motion: reduce) {
  .batch-celebrate { animation: none; }
}
</style>
