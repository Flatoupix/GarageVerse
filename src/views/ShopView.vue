<script setup lang="ts">
import { boosters } from '../game/data'
import { buyBooster } from '../game/save'
import { act, save } from '../game/store'
import PackArt from '../components/PackArt.vue'

const emit = defineEmits<{ open: [] }>()
const odds = (id: string) => {
  const slot = boosters.find(b => b.id === id)!.slots.at(-1)!
  return (['Rare', 'Épique', 'Légendaire'] as const).filter(r => slot[r]).map(r => `${r} ${slot[r]} %`).join(' · ')
}

function buy(id: string) {
  if (act(s => buyBooster(s, id))) emit('open')
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
      <article v-for="booster in boosters" :key="booster.id" class="shop-item" :class="`shop-${booster.id}`">
        <div class="shop-pack"><PackArt :booster="booster.id" /></div>
        <div class="shop-info">
          <h2>{{ booster.name }}</h2>
          <p>{{ booster.tagline }}</p>
          <p class="odds">Dernière carte : {{ odds(booster.id) }}</p>
          <button type="button" class="button primary" @click="buy(booster.id)">
            <template v-if="(save.tickets[booster.id] ?? 0) > 0">Utiliser un ticket ({{ save.tickets[booster.id] }})</template>
            <template v-else>{{ booster.price }} crédits</template>
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </article>
    </div>
  </main>
</template>
