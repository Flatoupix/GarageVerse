<script setup lang="ts">
import { t, tp } from '../i18n'
import { VERSUS_OPEN } from '../game/features'
import { computed } from 'vue'
import GameLogo from '../components/GameLogo.vue'
import { discover } from '../game/tutorial'
import { art } from '../game/art'
import { constraintText } from '../game/daily'
import { boosterById, conditionIcons, conditionLabels, rivalById, series, vehicles } from '../game/data'
import { claimDailyBooster, prepareDaily, todayChallenge, unlockedRivals } from '../game/save'
import { act, completedSeries, dailySelected, ownedCount, save } from '../game/store'

const emit = defineEmits<{ go: [screen: 'shop' | 'booster' | 'garage' | 'race' | 'versus' | 'friends'] }>()
const challenge = computed(() => todayChallenge(save))
function openDaily() { discover('daily'); dailySelected.value = true; if (!save.duel) act(prepareDaily); emit('go', 'race') }
const pending = computed(() => save.sealed || (save.opening && save.opening.view !== 'recap'))
const tickets = computed(() => Object.entries(save.tickets).filter(([, n]) => n > 0))
const ticketCount = computed(() => tickets.value.reduce((n, [, c]) => n + c, 0))
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
        <h1 id="home-title" tabindex="-1"><GameLogo /></h1>
        <p>{{ t('Collectionne 100 voitures, prépare-les pièce par pièce et bats les rivaux de la nuit en cinq secteurs.') }}</p>
        <div class="home-hero-actions">
          <button v-if="save.night" type="button" class="button primary" @click="emit('go', 'race')">{{ t('Reprendre la Nuit sans fin · manche {n}', { n: save.night.round }) }}</button>
          <button v-else-if="save.duel" type="button" class="button primary" @click="emit('go', 'race')">{{ t('Reprendre la course') }} <span aria-hidden="true">⟶</span></button>
          <button v-else-if="pending" type="button" class="button primary" @click="emit('go', 'booster')">{{ t('Reprendre le booster') }} <span aria-hidden="true">↗</span></button>
          <button v-else-if="tickets.length" type="button" class="button primary" @click="emit('go', 'shop')">
            {{ t('Ouvrir {name}', { name: t(boosterById.get(tickets[0][0])!.name) }) }} <span aria-hidden="true">↗</span>
          </button>
          <button v-else type="button" class="button primary" @click="emit('go', 'race')">{{ t('Défier {name}', { name: t(nextRival.name) }) }} <span aria-hidden="true">⟶</span></button>
          <button v-if="VERSUS_OPEN || save.versus?.active" type="button" class="button ghost" @click="emit('go', 'versus')">{{ save.versus?.active ? t('Reprendre le duel Versus') : t('Versus · Défier un ami') }}</button>
          <button v-if="save.preferences.friendsEnabled === true" type="button" class="button ghost" @click="emit('go', 'friends')">{{ t('Échanges') }} <span aria-hidden="true">⇄</span></button>
        </div>
      </div>
    </section>


    <section class="daily-panel" :class="{ done: save.daily.won }" aria-labelledby="daily-title">
      <div class="daily-head">
        <h2 id="daily-title">{{ t('Défi du jour') }}</h2>
        <span v-if="save.daily.streak" class="daily-streak">{{ tp('Série : {n} jour', 'Série : {n} jours', save.daily.streak) }}</span>
      </div>
      <p class="daily-circuit">{{ t(challenge.rival.circuit.name) }}
        <span v-for="c in [...new Set(challenge.weather)]" :key="c" class="daily-chip">{{ conditionIcons[c] }} {{ t(conditionLabels[c]) }}</span>
      </p>
      <p class="daily-rule">{{ constraintText(challenge.constraint) }}</p>
      <p class="daily-reward">{{ save.daily.won ? t('Défi réussi') : t('Récompense : {n} crédits', { n: challenge.reward }) }}</p>
      <div class="daily-actions">
        <button class="button primary" type="button" @click="openDaily">{{ save.daily.won ? t('Défi du jour · Rejouer') : t('Défi du jour · Participer') }} <span aria-hidden="true">⟶</span></button>
        <button v-if="!save.daily.booster" class="button ghost" type="button" @click="act(claimDailyBooster, t('Un ticket Neon Drive ajouté'), 'coin')">{{ t('Récupérer le booster du jour') }}</button>
        <p v-else class="daily-wait" role="status">{{ t('Booster du jour récupéré. Reviens demain') }}</p>
      </div>
    </section>

    <section class="home-tiles">
      <button type="button" class="tile deal" style="--i: 1" @click="emit('go', 'garage')">
        <span class="tile-label">{{ t('Garage') }}</span>
        <strong>{{ ownedCount }} / {{ vehicles.length }}</strong>
        <small><span v-help="'series'">{{ t('Séries complétées') }}</span>{{ t(' :') }} {{ completedSeries.length }} / {{ series.length }}</small>
        <progress :value="ownedCount" :max="vehicles.length" :aria-label="t('Voitures découvertes')"></progress>
      </button>
      <button type="button" class="tile deal" style="--i: 2" @click="emit('go', 'race')">
        <span class="tile-label">{{ t('Prochain rival') }}</span>
        <strong>{{ t(nextRival.name) }}</strong>
        <small>{{ t(nextRival.circuit.name) }}</small>
      </button>
      <button type="button" class="tile deal" style="--i: 3" @click="emit('go', 'shop')">
        <span class="tile-label">{{ t('Boosters') }}</span>
        <strong>{{ tp('{n} ticket', '{n} tickets', ticketCount) }}</strong>
        <small>{{ t('{n} crédits', { n: save.credits }) }}</small>
      </button>
    </section>

    <section class="how" aria-labelledby="how-title">
      <h2 id="how-title">{{ t('La boucle') }}</h2>
      <ol>
        <li><b>{{ t('Collectionne.') }}</b> {{ t('Chaque booster contient cinq cartes Voiture ou Mécanique.') }}</li>
        <li><b>{{ t('Prépare.') }}</b> {{ t('Améliore chaque voiture avec des crédits et monte des pièces à partir du niveau 2.') }}</li>
        <li><b>{{ t('Cours.') }}</b> {{ t('Trois voitures sous le plafond de ta ligue, cinq secteurs, une voiture engagée en secret à chaque secteur. Chaque secteur garde une part de chance : forme du jour, secteur parfait ou incident.') }}</li>
        <li><b>{{ t('Réinvestis.') }}</b> {{ t('Crédits, tickets et doublons alimentent le garage.') }}</li>
      </ol>
    </section>
  </main>
</template>

<style scoped>
.home-hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; }
</style>
