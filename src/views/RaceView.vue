<script setup lang="ts">
import { computed, ref } from 'vue'
import { art, edition } from '../game/art'
import {
  conditionIcons, conditionLabels, leagueById, rivalById, rivals, sectorIcons, sectorLabels, sectorStat, statShort, vehicleById, vehicles,
} from '../game/data'
import { evaluate, lineupCost, overheated, playRound, rivalLineup, statsOf, type Round } from '../game/rules'
import { lineupCheck, prepOf, settleDuel, startDuel, unlockedRivals, type Reward } from '../game/save'
import { act, buzz, persist, save, sound } from '../game/store'
import CarCard from '../components/CarCard.vue'

const emit = defineEmits<{ inspect: [kind: 'car' | 'part', id: string]; go: [screen: 'garage' | 'shop'] }>()
const chosen = ref<string | null>(save.duel?.rivalId ?? null)
const rival = computed(() => chosen.value ? rivalById.get(chosen.value) : undefined)
const league = computed(() => rival.value ? leagueById.get(rival.value.league) : undefined)
const unlocked = computed(() => unlockedRivals(save))
const cost = computed(() => lineupCost(save.lineup))
const problem = computed(() => rival.value ? lineupCheck(save, save.lineup, rival.value.id) : undefined)
const garageCars = computed(() => vehicles.filter(v => save.cars[v.id]).sort((a, b) => a.cost - b.cost))

function toggle(id: string) {
  act(s => {
    if (s.lineup.includes(id)) s.lineup = s.lineup.filter(x => x !== id)
    else if (s.lineup.length >= 3) return 'Retire d’abord une voiture'
    else s.lineup = [...s.lineup, id]
  })
}
function start() {
  if (rival.value && act(s => startDuel(s, rival.value!.id, Math.random))) { picked.value = 0; nitro.value = false }
}

// ——— Course en cours ———
const duel = computed(() => save.duel)
const picked = ref(0)
const nitro = ref(false)
const shown = ref<Round | null>(null)
const reward = ref<Reward | null>(null)
const index = computed(() => duel.value?.rounds.length ?? 0)
const known = (i: number) => i <= index.value + 1
const projections = computed(() => duel.value && index.value < duel.value.sectors.length
  ? duel.value.player.lineup.map((_, car) => evaluate(duel.value!, 'player', car, nitro.value).score) : [])

function engage() {
  const d = duel.value
  if (!d || d.winner) return
  const round = playRound(d, { car: picked.value, nitro: nitro.value }, Math.random)
  if (nitro.value) sound('nitro')
  shown.value = round
  nitro.value = false
  persist()
  sound(round.winner === 'player' ? 'collect' : round.winner === 'rival' ? 'lose' : 'flip')
  buzz(round.winner === 'player' ? [20, 30, 20] : 15)
  const free = d.player.lineup.findIndex((_, car) => !overheated(d.player, car))
  if (overheated(d.player, picked.value) && free >= 0) picked.value = free
}

function proceed() {
  shown.value = null
  if (duel.value?.winner) {
    const won = duel.value.winner === 'player'
    reward.value = settleDuel(save) ?? null
    persist()
    sound(won ? 'win' : 'lose')
    lastWinner.value = won ? 'player' : 'other'
  }
}
const lastWinner = ref<'player' | 'other'>('other')
function abandon() {
  act(s => { if (s.duel) { s.record[s.duel.rivalId] ??= { wins: 0, losses: 0 }; s.record[s.duel.rivalId].losses++; s.duel = null } }, 'Course abandonnée')
}
const name = (id: string) => `${vehicleById.get(id)!.name}`
</script>

<template>
  <main class="race">
    <!-- Résultat final -->
    <section v-if="reward" class="race-end" :class="lastWinner === 'player' ? 'won' : 'lost'">
      <span class="eyebrow">{{ rival?.circuit.name }}</span>
      <h1 tabindex="-1">{{ lastWinner === 'player' ? 'Victoire !' : 'Pas cette fois.' }}</h1>
      <p>+{{ reward.credits }} crédits<template v-if="reward.ticket"> · 1 ticket booster</template></p>
      <div class="recap-actions">
        <button type="button" class="button primary" @click="reward = null; chosen = null">Rivaux <span aria-hidden="true">⟶</span></button>
        <button type="button" class="button quiet" @click="emit('go', reward?.ticket ? 'shop' : 'garage')">{{ reward.ticket ? 'Ouvrir le ticket' : 'Préparer au garage' }}</button>
      </div>
    </section>

    <!-- Duel en cours -->
    <template v-else-if="duel && rival">
      <div class="race-head">
        <img v-if="art.rival(rival.id)" :src="art.rival(rival.id)" alt="" class="rival-face" />
        <span v-else class="rival-face" aria-hidden="true">{{ rival.name[0] }}</span>
        <div><span class="eyebrow">{{ rival.circuit.name }}</span><h1 tabindex="-1">{{ rival.name }}</h1></div>
        <div class="scoreboard" aria-label="Score"><b>{{ duel.player.points }}</b><span>—</span><b>{{ duel.rival.points }}</b></div>
      </div>
      <ol class="track">
        <li v-for="(sector, i) in duel.sectors" :key="i" :class="{ current: i === index, done: i < index,
          win: duel.rounds[i]?.winner === 'player', loss: duel.rounds[i]?.winner === 'rival' }">
          <span class="track-icon" aria-hidden="true">{{ sectorIcons[sector] }}</span>
          <span class="track-name">{{ sectorLabels[sector] }}</span>
          <span class="track-cond">{{ known(i) ? `${conditionIcons[duel.conditions[i]]} ${conditionLabels[duel.conditions[i]]}` : '? Inconnu' }}</span>
        </li>
      </ol>

      <section v-if="shown" class="round-result" :class="shown.winner">
        <h2>{{ shown.winner === 'player' ? 'Secteur gagné' : shown.winner === 'rival' ? 'Secteur perdu' : 'Égalité parfaite' }}</h2>
        <div class="duel-columns">
          <div v-for="who in (['player', 'rival'] as const)" :key="who" class="duel-col">
            <span class="duel-who">{{ who === 'player' ? 'Toi' : rival.name }}</span>
            <strong>{{ name(duel[who].lineup[shown[who].car].id) }}</strong>
            <span class="duel-score">{{ shown[who].score }}</span>
            <ul><li v-for="(l, i) in shown[who].lines" :key="i"><span>{{ l.label }}</span><b>{{ l.value > 0 ? '+' : '' }}{{ l.value }}</b></li></ul>
          </div>
        </div>
        <button type="button" class="button primary wide" @click="proceed">{{ duel.winner ? 'Voir le résultat' : 'Secteur suivant' }} <span aria-hidden="true">⟶</span></button>
      </section>

      <section v-else-if="duel.winner" class="round-result">
        <h2>Course terminée · {{ duel.player.points }} – {{ duel.rival.points }}</h2>
        <button type="button" class="button primary wide" @click="proceed">Voir le résultat <span aria-hidden="true">⟶</span></button>
      </section>

      <section v-else class="engage">
        <p class="engage-brief">Secteur {{ index + 1 }}/5 · <b>{{ sectorLabels[duel.sectors[index]] }}</b> ({{ statShort[sectorStat[duel.sectors[index]]] }})
          · {{ conditionIcons[duel.conditions[index]] }} {{ conditionLabels[duel.conditions[index]] }}</p>
        <div class="engage-cars" role="radiogroup" aria-label="Voiture engagée">
          <button v-for="(r, car) in duel.player.lineup" :key="car" type="button" role="radio" :aria-checked="picked === car"
            class="engage-car" :class="{ hot: overheated(duel.player, car) }" @click="picked = car">
            <img v-if="edition(r.id, save.cars[r.id]?.shown).art" :src="edition(r.id, save.cars[r.id]?.shown).art" alt="" />
            <span class="engage-name">{{ r.vehicle.name }}</span>
            <span class="engage-score">{{ projections[car] }}</span>
            <span class="engage-uses">{{ overheated(duel.player, car) ? 'Surchauffe −3' : `${r.uses - duel.player.used[car]} secteur${r.uses - duel.player.used[car] > 1 ? 's' : ''}` }}</span>
          </button>
        </div>
        <div class="rival-line" aria-label="Écurie adverse">
          <span v-for="(r, car) in duel.rival.lineup" :key="car" class="rival-car" :class="{ hot: overheated(duel.rival, car) }">
            {{ r.vehicle.name }} <small>{{ Math.max(0, r.uses - duel.rival.used[car]) }} sect.</small>
          </span>
          <span class="rival-car nitro-left">Nitro ×{{ duel.rival.nitro }}</span>
        </div>
        <label class="nitro-toggle" :class="{ off: !duel.player.nitro }">
          <input v-model="nitro" type="checkbox" :disabled="!duel.player.nitro" />
          <span>Nitro <small>{{ duel.player.nitro }} charge{{ duel.player.nitro > 1 ? 's' : '' }} · +2 sur ce secteur</small></span>
        </label>
        <button type="button" class="button primary wide" @click="engage">Engager {{ duel.player.lineup[picked].vehicle.name }} <span aria-hidden="true">⟶</span></button>
        <button type="button" class="button quiet wide" @click="abandon">Abandonner</button>
      </section>
    </template>

    <!-- Constitution de l'écurie -->
    <template v-else-if="rival && league">
      <div class="page-heading">
        <button type="button" class="back-link" @click="chosen = null"><span aria-hidden="true">←</span> Rivaux</button>
        <span class="eyebrow">{{ league.name }} · plafond {{ league.cap }}</span>
        <h1 tabindex="-1">Écurie contre {{ rival.name }}</h1>
        <p>{{ rival.circuit.name }} : {{ rival.circuit.sectors.map(s => sectorLabels[s]).join(' · ') }}. Conditions fréquentes :
          {{ Object.keys(rival.circuit.conditions).slice(0, 2).map(c => conditionLabels[c as keyof typeof conditionLabels]).join(', ') }}.</p>
      </div>
      <div class="cap-meter" :class="{ over: cost > league.cap }">
        <span>Coût d’écurie</span><div><span :style="{ width: `${Math.min(100, cost / league.cap * 100)}%` }"></span></div><b>{{ cost }}/{{ league.cap }}</b>
      </div>
      <div class="lineup-slots">
        <button v-for="n in 3" :key="n" type="button" class="lineup-slot" @click="save.lineup[n - 1] && emit('inspect', 'car', save.lineup[n - 1])">
          <CarCard v-if="save.lineup[n - 1]" :id="save.lineup[n - 1]" :style-name="save.cars[save.lineup[n - 1]]?.shown" :prep="prepOf(save, save.lineup[n - 1])" compact />
          <span v-else class="slot-placeholder">Place {{ n }}</span>
        </button>
      </div>
      <p class="rival-preview">En face : {{ rivalLineup(rival).map(e => `${name(e.id)} (Stage ${e.prep.stage})`).join(' · ') }}</p>
      <button type="button" class="button primary wide" :disabled="Boolean(problem)" @click="start">{{ problem ?? 'Lancer la course' }} <span v-if="!problem" aria-hidden="true">⟶</span></button>
      <h2 class="list-title">Ton garage</h2>
      <ul class="pick-list">
        <li v-for="v in garageCars" :key="v.id">
          <button type="button" :aria-pressed="save.lineup.includes(v.id)" @click="toggle(v.id)">
            <span class="pick-cost">{{ v.cost }}</span>
            <span class="pick-name"><b>{{ v.name }}</b><small>{{ v.version }} · Stage {{ save.cars[v.id].stage }}</small></span>
            <span class="pick-stats">{{ (['acc', 'vit', 'man', 'end'] as const).map(k => `${statShort[k]} ${statsOf(v, prepOf(save, v.id))[k]}`).join(' ') }}</span>
          </button>
        </li>
      </ul>
    </template>

    <!-- Échelle des rivaux -->
    <template v-else>
      <div class="page-heading">
        <span class="eyebrow"><span></span> Course en secteurs</span>
        <h1 tabindex="-1">Rivaux de la nuit</h1>
        <p>Engage une voiture par secteur, en secret. Chaque voiture court un nombre limité de secteurs selon son Endurance.</p>
      </div>
      <ul class="rival-list">
        <li v-for="r in rivals" :key="r.id">
          <button type="button" class="rival-row" :disabled="!unlocked.includes(r.id)" @click="chosen = r.id">
            <img v-if="art.rival(r.id)" :src="art.rival(r.id)" alt="" />
            <span v-else class="rival-initial" aria-hidden="true">{{ r.name[0] }}</span>
            <span class="rival-info"><b>{{ r.name }}</b><small>{{ r.title }} · {{ leagueById.get(r.league)!.name }} (plafond {{ leagueById.get(r.league)!.cap }})</small></span>
            <span class="rival-status">{{ !unlocked.includes(r.id) ? 'Verrouillé' : save.record[r.id]?.wins ? `✓ ${save.record[r.id].wins}` : 'Défier' }}</span>
          </button>
        </li>
      </ul>
    </template>
  </main>
</template>
