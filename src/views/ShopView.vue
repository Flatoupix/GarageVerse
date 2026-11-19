<script setup lang="ts">
import { t, tp } from '../i18n'
import { boosters } from '../game/data'
import { buyBooster, buyBoosters } from '../game/save'
import { act, save, sound } from '../game/store'
import PackArt from '../components/PackArt.vue'

const emit = defineEmits<{ open: [] }>()
const odds = (booster: (typeof boosters)[number]) => {
  const slot = booster.slots.at(-1)!
  return (['Rare', 'Épique', 'Légendaire'] as const).filter(r => slot[r]).map(r => `${t(r)} ${slot[r]} %`).join(' · ')
}
const partsWord = (n: number) => n === 2 ? t('deux') : n === 3 ? t('trois') : n
const partOdds = (booster: (typeof boosters)[number]) => Math.round(100 * ((booster.maxParts ?? 1) <= 0 ? 0 : 1 - booster.slots.reduce((total, slot) => total * (1 - slot.partChance), 1)))

function buy(id: string) {
  if (act(s => buyBooster(s, id))) { sound('whoosh'); emit('open') }
}
// Achat groupé : les boosters payés deviennent des tickets et le premier s'ouvre aussitôt.
const bulk = [5, 10]
function buyMany(id: string, count: number) {
  if (act(s => buyBoosters(s, id, count), t('{n} boosters achetés', { n: count }))) { sound('whoosh'); emit('open') }
}
</script>

<template>
  <main class="shop">
    <div class="page-heading">
      <span class="eyebrow"><span></span> {{ t('Boutique') }}</span>
      <h1 tabindex="-1">{{ t('Boosters') }}</h1>
      <p>{{ t('{n} crédits · gagne des tickets en battant chaque rival.', { n: save.credits }) }}</p>
    </div>
    <p v-if="save.sealed || (save.opening && save.opening.view !== 'recap')" class="notice">
      {{ t('Un booster est en cours.') }} <button type="button" class="link" @click="emit('open')">{{ t('Le reprendre') }}</button>
    </p>
    <div class="shop-grid">
      <article v-for="(booster, i) in boosters" :key="booster.id" class="shop-item deal" :style="{ '--i': i }" :class="`shop-${booster.id}`">
        <div class="shop-pack"><PackArt :booster="booster.id" /></div>
        <div class="shop-info">
          <h2>{{ t(booster.name) }}</h2>
          <p>{{ t(booster.tagline) }}</p>
          <p class="odds">{{ booster.slots.every(s => s.partChance >= 1) ? t('Dernière pièce') : t('Dernière voiture') }} · {{ odds(booster) }}</p>
          <p v-if="booster.slots.every(s => s.partChance >= 1)" class="odds">{{ t('5 pièces mécaniques garanties dans chaque booster') }}</p>
          <p v-else class="odds">{{ tp('Jusqu’à {n} pièce mécanique · environ {odds} sachets sur 100 contiennent au moins une pièce', 'Jusqu’à {n} pièces mécaniques · environ {odds} sachets sur 100 contiennent au moins une pièce', booster.maxParts ?? 1, { n: partsWord(booster.maxParts ?? 1), odds: partOdds(booster) }) }}</p>
          <button type="button" class="button primary" @click="buy(booster.id)">
            <template v-if="(save.tickets[booster.id] ?? 0) > 0">{{ t('Utiliser un ticket ({n})', { n: save.tickets[booster.id] }) }}</template>
            <template v-else>{{ t('{n} crédits', { n: booster.price }) }}</template>
            <span aria-hidden="true">↗</span>
          </button>
          <div class="bulk-buy" role="group" :aria-label="t('Acheter plusieurs {name}', { name: t(booster.name) })">
            <button v-for="count in bulk" :key="count" type="button" class="button filled" :disabled="save.credits < booster.price * count"
              :aria-label="t('Acheter {count} {name} pour {price} crédits', { count, name: t(booster.name), price: booster.price * count })" @click="buyMany(booster.id, count)">
              ×{{ count }} · ₡ {{ booster.price * count }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </main>
</template>
