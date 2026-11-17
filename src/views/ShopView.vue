<script setup lang="ts">
import { boosters } from '../game/data'
import { buyBooster, buyBoosters } from '../game/save'
import { act, save, sound } from '../game/store'
import PackArt from '../components/PackArt.vue'

const emit = defineEmits<{ open: [] }>()
const odds = (booster: (typeof boosters)[number]) => {
  const slot = booster.slots.at(-1)!
  return (['Rare', 'Épique', 'Légendaire'] as const).filter(r => slot[r]).map(r => `${r} ${slot[r]} %`).join(' · ')
}
const partOdds = (booster: (typeof boosters)[number]) => Math.round(100 * ((booster.maxParts ?? 1) <= 0 ? 0 : 1 - booster.slots.reduce((total, slot) => total * (1 - slot.partChance), 1)))

function buy(id: string) {
  if (act(s => buyBooster(s, id))) { sound('whoosh'); emit('open') }
}
// Achat groupé : les boosters payés deviennent des tickets et le premier s'ouvre aussitôt.
const bulk = [5, 10]
function buyMany(id: string, count: number) {
  if (act(s => buyBoosters(s, id, count), `${count} boosters achetés`)) { sound('whoosh'); emit('open') }
}
</script>

<template>
  <main class="shop">
    <div class="page-heading">
      <span class="eyebrow"><span></span> Boutique</span>
      <h1 tabindex="-1">Boosters</h1>
      <p>{{ save.credits }} crédits · gagne des tickets en battant chaque rival.</p>
    </div>
    <p v-if="save.sealed || (save.opening && save.opening.view !== 'recap')" class="notice">
      Un booster est en cours. <button type="button" class="link" @click="emit('open')">Le reprendre</button>
    </p>
    <div class="shop-grid">
      <article v-for="(booster, i) in boosters" :key="booster.id" class="shop-item deal" :style="{ '--i': i }" :class="`shop-${booster.id}`">
        <div class="shop-pack"><PackArt :booster="booster.id" /></div>
        <div class="shop-info">
          <h2>{{ booster.name }}</h2>
          <p>{{ booster.tagline }}</p>
          <p class="odds">{{ booster.slots.every(s => s.partChance >= 1) ? 'Dernière pièce' : 'Dernière voiture' }} · {{ odds(booster) }}</p>
          <p v-if="booster.slots.every(s => s.partChance >= 1)" class="odds">5 pièces mécaniques garanties dans chaque booster</p>
          <p v-else class="odds">Jusqu’à {{ (booster.maxParts ?? 1) === 2 ? 'deux' : (booster.maxParts ?? 1) === 3 ? 'trois' : (booster.maxParts ?? 1) }} {{ (booster.maxParts ?? 1) > 1 ? 'pièces mécaniques' : 'pièce mécanique' }} · environ {{ partOdds(booster) }} sachets sur 100 contiennent au moins une pièce</p>
          <button type="button" class="button primary" @click="buy(booster.id)">
            <template v-if="(save.tickets[booster.id] ?? 0) > 0">Utiliser un ticket ({{ save.tickets[booster.id] }})</template>
            <template v-else>{{ booster.price }} crédits</template>
            <span aria-hidden="true">↗</span>
          </button>
          <div class="bulk-buy" role="group" :aria-label="`Acheter plusieurs ${booster.name}`">
            <button v-for="count in bulk" :key="count" type="button" class="button ghost" :disabled="save.credits < booster.price * count"
              :aria-label="`Acheter ${count} ${booster.name} pour ${booster.price * count} crédits`" @click="buyMany(booster.id, count)">
              ×{{ count }} · ₡ {{ booster.price * count }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </main>
</template>
