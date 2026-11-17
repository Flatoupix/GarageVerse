<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import CarCard from '../components/CarCard.vue'
import CarThumb from '../components/CarThumb.vue'
import { narrow, save } from '../game/store'
import { rarities, rarityClass, rarityMark, styleLabel, stylesOf, vehicleById, vehicles, type EditionStyle, type Rarity } from '../game/data'

// Showroom caché (7 appuis sur la version, dans les Réglages) : toutes les cartes du jeu et toutes leurs éditions,
// possédées ou non. Simple vitrine en lecture seule : rien n'est ajouté à la sauvegarde.
const emit = defineEmits<{ close: [] }>()
const query = ref('')
const rarity = ref<Rarity | null>(null)
const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const list = computed(() => {
  const words = plain(query.value).split(/\s+/).filter(Boolean)
  return vehicles.filter(v => (!rarity.value || v.rarity === rarity.value) &&
    words.every(word => plain(`${v.number} ${v.name} ${v.version} ${v.year} ${v.tags.join(' ')}`).includes(word)))
})
const editionCount = vehicles.reduce((n, v) => n + stylesOf(v.id).length, 0)
// Par ligne : part du réglage du garage, sans jamais l'écrire. 4 et 5 sur téléphone passent en vue planche.
const cols = ref(Math.min(5, save.preferences.garageCols ?? 0))
const colOptions = [0, 1, 2, 3, 4, 5]
const sheet = computed(() => cols.value >= 4 && narrow.value)

const dialog = ref<HTMLDialogElement>()
const strip = ref<HTMLElement>()
const shownId = ref<string | null>(null)
const index = ref(0)
const shown = computed(() => shownId.value ? vehicleById.get(shownId.value) : undefined)
const styles = computed<EditionStyle[]>(() => shownId.value ? stylesOf(shownId.value) : [])
async function open(id: string) {
  shownId.value = id
  index.value = 0
  if (!dialog.value?.open) dialog.value?.showModal()
  await nextTick()
  strip.value?.scrollTo({ left: 0 })
}
function go(step: number) {
  const next = Math.min(styles.value.length - 1, Math.max(0, index.value + step))
  strip.value?.children[next]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
}
// L'édition affichée suit le défilement horizontal, au doigt comme aux flèches.
function onScroll() {
  const el = strip.value
  if (el) index.value = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
}
</script>

<template>
  <main class="showroom">
    <div class="page-heading">
      <span class="eyebrow"><span></span> Accès caché</span>
      <h1 tabindex="-1">Showroom</h1>
      <p>{{ vehicles.length }} voitures · {{ editionCount }} éditions. Touche une carte pour voir toutes ses éditions.</p>
      <button type="button" class="button ghost showroom-close" @click="emit('close')">Quitter le Showroom</button>
    </div>

    <input v-model="query" class="showroom-search" type="search" placeholder="Rechercher (nom, numéro, année, catégorie…)" aria-label="Rechercher une voiture" />
    <div class="showroom-filters" role="group" aria-label="Rareté">
      <button type="button" :aria-pressed="rarity === null" @click="rarity = null">Toutes</button>
      <button v-for="r in rarities" :key="r" type="button" :class="`rarity-${rarityClass[r]}`" :aria-pressed="rarity === r" @click="rarity = rarity === r ? null : r">
        <span aria-hidden="true">{{ rarityMark[r] }}</span> {{ r }}
      </button>
    </div>
    <div class="showroom-bar">
      <p class="showroom-count" role="status">{{ list.length }} voiture{{ list.length > 1 ? 's' : '' }}</p>
      <div class="showroom-filters showroom-cols" role="group" aria-label="Nombre de voitures par ligne">
        <button v-for="n in colOptions" :key="n" type="button" :aria-pressed="cols === n"
          :aria-label="n === 0 ? 'Nombre de colonnes automatique' : `${n} voiture${n > 1 ? 's' : ''} par ligne`" @click="cols = n">{{ n === 0 ? 'Auto' : n }}</button>
      </div>
    </div>

    <div class="garage-grid" :class="{ 'grid-custom': cols > 0, 'grid-single': cols === 1, 'grid-dense': cols >= 4, 'grid-sheet': sheet }"
      :style="cols > 0 ? { '--garage-cols': String(cols) } : undefined">
      <div v-for="v in list" :key="v.id" class="garage-tile">
        <button type="button" class="card-tile" :aria-label="`Éditions de ${v.name} ${v.version}`" @click="open(v.id)">
          <CarThumb v-if="sheet" :id="v.id" />
          <CarCard v-else :id="v.id" :compact="cols !== 1" />
          <span v-if="!sheet" class="tile-tag showroom-tag">{{ stylesOf(v.id).length }} éditions</span>
        </button>
      </div>
    </div>

    <dialog ref="dialog" class="modal showroom-modal" :aria-label="shown ? `Éditions de ${shown.name} ${shown.version}` : 'Éditions'" @close="shownId = null">
      <form method="dialog"><button class="close-modal" aria-label="Fermer">×</button></form>
      <template v-if="shown">
        <h2>{{ shown.name }} <small>{{ shown.version }}</small></h2>
        <p class="showroom-edition" aria-live="polite">{{ styleLabel(shown, styles[index]) }} · {{ index + 1 }} / {{ styles.length }}</p>
        <div ref="strip" class="showroom-strip" @scroll.passive="onScroll">
          <div v-for="style in styles" :key="style" class="showroom-slide"><CarCard :id="shown.id" :style-name="style" /></div>
        </div>
        <div class="showroom-nav">
          <button type="button" class="button ghost" :disabled="index === 0" aria-label="Édition précédente" @click="go(-1)">←</button>
          <span class="showroom-dots" aria-hidden="true"><i v-for="(style, i) in styles" :key="style" :class="{ on: i === index }"></i></span>
          <button type="button" class="button ghost" :disabled="index === styles.length - 1" aria-label="Édition suivante" @click="go(1)">→</button>
        </div>
      </template>
    </dialog>
  </main>
</template>
