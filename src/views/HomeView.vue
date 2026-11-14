<script setup lang="ts">
import { computed } from 'vue'
import { art } from '../game/art'
import { boosterById, rivalById, vehicles } from '../game/data'
import { unlockedRivals } from '../game/save'
import { ownedCount, save } from '../game/store'

const emit = defineEmits<{ go: [screen: 'shop' | 'booster' | 'garage' | 'race'] }>()
const pending = computed(() => save.sealed || (save.opening && save.opening.view !== 'recap'))
const tickets = computed(() => Object.entries(save.tickets).filter(([, n]) => n > 0))
const nextRival = computed(() => {
  const open = unlockedRivals(save)
  const id = open.find(r => !save.record[r]?.wins) ?? open[open.length - 1]
  return rivalById.get(id)!
})
</script>

<template>
  <main class="home">
    <section class="hero" aria-labelledby="home-title">
      <img v-if="art.hero" class="hero-picture" :src="art.hero" alt="" />
      <div class="hero-sun" aria-hidden="true"></div>
      <div class="hero-content">
        <span class="eyebrow"><span></span> Collection 001 · Neon Drive</span>
        <h1 id="home-title" tabindex="-1">GARAGE<em>VERSE</em></h1>
        <p>Collectionne 50 voitures, prépare-les pièce par pièce et bats les rivaux de la nuit en cinq secteurs.</p>
        <button v-if="save.duel" type="button" class="button primary" @click="emit('go', 'race')">Reprendre la course <span aria-hidden="true">⟶</span></button>
        <button v-else-if="pending" type="button" class="button primary" @click="emit('go', 'booster')">Reprendre le booster <span aria-hidden="true">↗</span></button>
        <button v-else-if="tickets.length" type="button" class="button primary" @click="emit('go', 'shop')">
          Ouvrir {{ boosterById.get(tickets[0][0])!.name }} <span aria-hidden="true">↗</span>
        </button>
        <button v-else type="button" class="button primary" @click="emit('go', 'race')">Défier {{ nextRival.name }} <span aria-hidden="true">⟶</span></button>
      </div>
    </section>

    <section class="home-tiles">
      <button type="button" class="tile deal" style="--i: 1" @click="emit('go', 'garage')">
        <span class="tile-label">Garage</span>
        <strong>{{ ownedCount }} / {{ vehicles.length }}</strong>
        <progress :value="ownedCount" :max="vehicles.length" aria-label="Voitures découvertes"></progress>
      </button>
      <button type="button" class="tile deal" style="--i: 2" @click="emit('go', 'race')">
        <span class="tile-label">Prochain rival</span>
        <strong>{{ nextRival.name }}</strong>
        <small>{{ nextRival.circuit.name }}</small>
      </button>
      <button type="button" class="tile deal" style="--i: 3" @click="emit('go', 'shop')">
        <span class="tile-label">Boosters</span>
        <strong>{{ tickets.reduce((n, [, c]) => n + c, 0) }} ticket{{ tickets.reduce((n, [, c]) => n + c, 0) > 1 ? 's' : '' }}</strong>
        <small>{{ save.credits }} crédits</small>
      </button>
    </section>

    <section class="how" aria-labelledby="how-title">
      <h2 id="how-title">La boucle</h2>
      <ol>
        <li><b>Collectionne.</b> Chaque booster contient cinq cartes Voiture ou Mécanique.</li>
        <li><b>Prépare.</b> Une voiture modeste a plus de potentiel : installe des pièces, monte en Stage, débloque ses évolutions.</li>
        <li><b>Cours.</b> Trois voitures sous le plafond de ta ligue, cinq secteurs, une voiture engagée en secret à chaque secteur.</li>
        <li><b>Réinvestis.</b> Crédits, tickets et doublons alimentent le garage.</li>
      </ol>
    </section>
  </main>
</template>
