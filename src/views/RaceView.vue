<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref } from 'vue'
import { constraintCap, constraintText } from '../game/daily'
import { art, edition } from '../game/art'
import {
  conditionIcons, conditionLabels, leagueById, rivalById, rivals, sectorIcons, sectorLabels, sectorStat, statLabels, vehicleById, vehicles,
  type Condition, type Rival, type StatKey,
} from '../game/data'
import { floatText, confetti, flash, palettes, pop, ring, shake, sparks, streaks, tween, tone } from '../game/fx'
import { circuitPriorities, circuitScores, evaluate, lineupCost, luckRange, overheated, playRound, racer, rivalLineup, type Round } from '../game/rules'
import { dailyLineupCheck, prepareDaily, startDaily, todayChallenge, lineupCheck, prepOf, settleDuel, startDuel, unlockedRivals, type Reward } from '../game/save'
import { act, dailySelected, buzz, persist, reducedMotion, save, sound } from '../game/store'
import CarCard from '../components/CarCard.vue'

const emit = defineEmits<{ inspect: [kind: 'car' | 'part', id: string, circuit?: Rival['circuit'], suggestedStat?: StatKey]; go: [screen: 'garage' | 'shop'] }>()
const chosen = ref<string | null>(save.duel?.rivalId ?? (dailySelected.value ? `daily:${save.daily.date}` : null))
dailySelected.value = false
const challenge = computed(() => todayChallenge(save, chosen.value?.startsWith('daily:') ? chosen.value.slice(6) : save.daily.date))
const isDaily = computed(() => chosen.value?.startsWith('daily:'))
const rival = computed(() => isDaily.value ? challenge.value.rival : chosen.value ? rivalById.get(chosen.value) : undefined)
const league = computed(() => rival.value ? leagueById.get(rival.value.league) : undefined)
const unlocked = computed(() => unlockedRivals(save))
if (chosen.value?.startsWith('daily:') && !save.duel) act(prepareDaily)
const lineup = computed({ get: () => isDaily.value ? save.dailyLineup ?? [] : save.lineup, set: ids => { if (isDaily.value) save.dailyLineup = ids; else save.lineup = ids } })
const cap = computed(() => isDaily.value ? constraintCap(challenge.value.constraint) : league.value?.cap ?? 9)
const cost = computed(() => lineupCost(lineup.value))
const problem = computed(() => isDaily.value ? dailyLineupCheck(save) : rival.value ? lineupCheck(save, save.lineup, rival.value.id) : undefined)
const priorities = computed(() => rival.value ? circuitPriorities(rival.value.circuit) : [])
const conditions = computed(() => {
  const entries = Object.entries(rival.value?.circuit.conditions ?? {}) as [Condition, number][]
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  return entries.filter(([, weight]) => weight > 0).sort((a, b) => b[1] - a[1])
    .map(([key, weight]) => ({ key, chance: Math.round(weight / total * 100) }))
})
const garageCars = computed(() => {
  if (!rival.value) return []
  const circuit = rival.value.circuit
  return vehicles.filter(v => save.cars[v.id]).map(v => {
    const car = racer(v.id, prepOf(save, v.id))
    const scores = circuitScores(car, circuit)
    const average = scores.reduce((total, s) => total + s.average * s.times, 0) / circuit.sectors.length
    return { v, car, scores, average }
  }).sort((a, b) => Number(lineup.value.includes(b.v.id)) - Number(lineup.value.includes(a.v.id)) ||
    Number(save.cars[b.v.id].favorite) - Number(save.cars[a.v.id].favorite) || b.average - a.average || a.v.cost - b.v.cost)
})
const recommendedCars = computed(() => priorities.value.map(priority => {
  const candidates = garageCars.value.filter(({ v }) => lineup.value.includes(v.id)).map(({ v, scores }) => ({
    id: v.id, name: v.name, score: scores.find(s => s.sector === priority.sector)?.average ?? 0,
  }))
  const best = candidates.sort((a, b) => b.score - a.score)[0]
  return { ...priority, best }
}))
const pointsText = (value: number) => value.toFixed(1).replace('.', ',')
// Score attendu avec sa part de hasard : « 7-9 », ou une seule valeur quand la forme du jour ne change rien.
const rangeText = (value: number) => { const [low, high] = luckRange(value); return low === high ? String(value) : `${low}-${high}` }

function toggle(id: string) {
  act(() => {
    if (lineup.value.includes(id)) lineup.value = lineup.value.filter(x => x !== id)
    else if (lineup.value.length >= 3) return 'Retire d’abord une voiture'
    else lineup.value = [...lineup.value, id]
  })
  void nextTick(() => pop(`.lineup-slot:nth-child(${Math.max(1, lineup.value.indexOf(id) + 1)})`, 1.1))
}
function start() {
  if (rival.value && act(s => isDaily.value ? startDaily(s) : startDuel(s, rival.value!.id, Math.random))) {
    picked.value = 0; nitro.value = false
    sound('rev'); streaks(palettes.cyan, 30); flash(tone.cyan, 0.2); buzz([20, 40, 60])
  }
}

// ——— Course en cours ———
const duel = computed(() => save.duel)
const picked = ref(0)
const nitro = ref(false)
const shown = ref<Round | null>(null)
const reward = ref<Reward | null>(null)
const index = computed(() => duel.value?.rounds.length ?? 0)

// Mise en scène d'un secteur : les scores défilent, puis le verdict tombe. Tant qu'il n'est pas tombé,
// la piste et le tableau de score n'affichent pas encore ce secteur.
const settled = ref(true)
const counts = reactive({ player: 0, rival: 0 })
const rewardShown = ref(0)
let timers: ReturnType<typeof setTimeout>[] = []
let stops: (() => void)[] = []
function clear() { timers.forEach(clearTimeout); stops.forEach(stop => stop()); timers = []; stops = [] }
onUnmounted(clear)
const unsettled = computed(() => shown.value && !settled.value ? shown.value : null)
const trackIndex = computed(() => index.value - (unsettled.value ? 1 : 0))
const points = computed(() => ({
  player: (duel.value?.player.points ?? 0) - (unsettled.value?.winner === 'player' ? 1 : 0),
  rival: (duel.value?.rival.points ?? 0) - (unsettled.value?.winner === 'rival' ? 1 : 0),
}))
const known = (i: number) => i <= trackIndex.value + 1
const carArt = (who: 'player' | 'rival', car: number) => {
  const id = duel.value![who].lineup[car].id
  return edition(id, who === 'player' ? save.cars[id]?.shown : undefined).art
}

function settle(round: Round) {
  settled.value = true
  counts.player = round.player.score
  counts.rival = round.rival.score
  sound('slam')
  buzz(round.winner === 'player' ? [20, 30, 20] : 15)
  shake(round.winner === 'player' ? 2 : 1)
  timers.push(setTimeout(() => sound(round.winner === 'player' ? 'collect' : round.winner === 'rival' ? 'lose' : 'flip'), 160))
  void nextTick(() => {
    const score = `.duel-col.${round.winner} .duel-score`
    if (round.winner === 'player') { sparks(score, palettes.cyan, 42, 1.1); ring(score, tone.cyan); flash(tone.cyan, 0.18); pop(score, 1.4) }
    else if (round.winner === 'rival') { sparks(score, palettes.pink, 22, 0.9); flash(tone.rose, 0.16); pop(score, 1.25) }
    pop('.scoreboard', 1.25)
    for (const who of ['player', 'rival'] as const) {
      const at = `.duel-col.${who} .duel-score`, luck = round[who].luck
      if (luck === 'perfect') { floatText(at, 'Parfait !', tone.gold, 20); sparks(at, palettes.gold, 36, 1.2); if (who === 'player') { sound('legend'); flash(tone.gold, 0.25) } }
      if (luck === 'incident') { floatText(at, round[who].lines.at(-1)!.label, tone.rose, 16); shake(2); if (who === 'player') buzz([40, 30, 40]) }
    }
  })
}

function pick(car: number, event: Event) {
  picked.value = car
  pop(event.currentTarget as Element, 1.06, 220)
}
function armNitro() {
  if (!nitro.value) return
  sound('nitro'); buzz([10, 20, 30]); streaks(palettes.fire, 14)
}
const projections = computed(() => duel.value && index.value < duel.value.sectors.length
  ? duel.value.player.lineup.map((_, car) => evaluate(duel.value!, 'player', car, nitro.value).score) : [])

function engage() {
  const d = duel.value
  if (!d || d.winner) return
  const round = playRound(d, { car: picked.value, nitro: nitro.value }, Math.random)
  shown.value = round
  nitro.value = false
  persist()
  clear()
  if (reducedMotion.value) settle(round)
  else {
    settled.value = false
    counts.player = counts.rival = 0
    sound('whoosh')
    if (round.player.nitro || round.rival.nitro) {
      sound('nitro'); flash(tone.gold, 0.22)
      streaks(palettes.fire, 40, round.player.nitro ? 1 : -1)
    }
    let ticked = 0
    for (const who of ['player', 'rival'] as const) stops.push(tween(0, round[who].score, 750, value => {
      if (value !== counts[who] && performance.now() - ticked > 55) { ticked = performance.now(); sound('tick') }
      counts[who] = value
    }))
    timers.push(setTimeout(() => settle(round), 920))
  }
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
    clear()
    if (won) {
      confetti(); flash(tone.gold, 0.32); buzz([40, 60, 40, 60, 80])
      timers.push(setTimeout(() => confetti(palettes.gold, 60), 650))
    } else shake(1)
    let ticked = 0
    stops.push(tween(0, reward.value?.credits ?? 0, 900, value => {
      if (performance.now() - ticked > 70) { ticked = performance.now(); sound('tick') }
      rewardShown.value = value
    }))
  }
}
const lastWinner = ref<'player' | 'other'>('other')
function abandon() {
  act(s => { if (s.duel) { if (!s.duel.rivalId.startsWith('daily:')) { s.record[s.duel.rivalId] ??= { wins: 0, losses: 0 }; s.record[s.duel.rivalId].losses++ }; s.duel = null } }, 'Course abandonnée')
}
// Libellés courts pour la piste, qui doit tenir sur une ligne de cinq cases à 320 px.
const trackLabels = { depart: 'Départ', virage: 'Virages', ligne: 'Droite', endurance: 'Endur.' } as const
const name = (id: string) => `${vehicleById.get(id)!.name}`
</script>

<template>
  <main class="race" :class="{ 'daily-race': isDaily && !duel }">
    <!-- Résultat final -->
    <section v-if="reward" class="race-end" :class="lastWinner === 'player' ? 'won' : 'lost'">
      <span class="eyebrow">{{ rival?.circuit.name }}</span>
      <h1 tabindex="-1">{{ lastWinner === 'player' ? 'Victoire !' : 'Pas cette fois.' }}</h1>
      <p v-if="isDaily && !reward.credits">{{ lastWinner === 'player' ? 'Défi déjà récompensé aujourd’hui.' : 'Retente le défi quand tu veux.' }}</p>
      <p v-else :aria-label="`+${reward.credits} crédits`">+{{ rewardShown }} crédits<template v-if="reward.ticket"> · 1 ticket booster</template></p>
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
        <div class="scoreboard" aria-label="Score"><b :key="`p${points.player}`">{{ points.player }}</b><span>—</span><b :key="`r${points.rival}`">{{ points.rival }}</b></div>
      </div>
      <ol class="track">
        <li v-for="(sector, i) in duel.sectors" :key="i" :style="{ '--i': i }" :class="{ current: i === trackIndex, done: i < trackIndex,
          win: i < trackIndex && duel.rounds[i]?.winner === 'player', loss: i < trackIndex && duel.rounds[i]?.winner === 'rival' }">
          <span class="track-icon" aria-hidden="true">{{ sectorIcons[sector] }}</span>
          <span class="track-name" :title="sectorLabels[sector]">{{ trackLabels[sector] }}</span>
          <span class="track-cond">{{ known(i) ? `${conditionIcons[duel.conditions[i]]} ${conditionLabels[duel.conditions[i]]}` : '? Inconnu' }}</span>
        </li>
      </ol>

      <section v-if="shown" class="round-result" :class="settled ? shown.winner : 'pending'">
        <h2 v-if="settled" class="verdict">{{ shown.winner === 'player' ? 'Secteur gagné' : shown.winner === 'rival' ? 'Secteur perdu' : 'Égalité parfaite' }}</h2>
        <h2 v-else>{{ sectorLabels[shown.sector] }} · {{ conditionLabels[shown.condition] }}</h2>
        <div class="duel-columns">
          <div v-for="who in (['player', 'rival'] as const)" :key="who" class="duel-col"
            :class="[who, { winner: settled && shown.winner === who, loser: settled && shown.winner !== who && shown.winner !== 'tie', boosted: shown[who].nitro }]">
            <div class="clash-car">
              <img v-if="carArt(who, shown[who].car)" :src="carArt(who, shown[who].car)" alt="" />
              <span v-if="shown[who].nitro" class="clash-nitro">Nitro</span>
            </div>
            <span class="duel-who">{{ who === 'player' ? 'Toi' : rival.name }}</span>
            <strong>{{ name(duel[who].lineup[shown[who].car].id) }}</strong>
            <span class="duel-score" :aria-label="`${shown[who].score} points`">{{ counts[who] }}</span>
            <ul v-if="settled"><li v-for="(l, i) in shown[who].lines" :key="i" :style="{ '--i': i }"><span>{{ l.label }}</span><b>{{ l.value > 0 ? '+' : '' }}{{ l.value }}</b></li></ul>
          </div>
        </div>
        <button v-if="settled" type="button" class="button primary wide" @click="proceed">{{ duel.winner ? 'Voir le résultat' : 'Secteur suivant' }} <span aria-hidden="true">⟶</span></button>
      </section>

      <section v-else-if="duel.winner" class="round-result">
        <h2>Course terminée · {{ duel.player.points }} – {{ duel.rival.points }}</h2>
        <button type="button" class="button primary wide" @click="proceed">Voir le résultat <span aria-hidden="true">⟶</span></button>
      </section>

      <section v-else class="engage">
        <p class="engage-brief">Secteur {{ index + 1 }}/{{ duel.sectors.length }} · <b>{{ sectorLabels[duel.sectors[index]] }}</b> ({{ statLabels[sectorStat[duel.sectors[index]]] }})
          · {{ conditionIcons[duel.conditions[index]] }} {{ conditionLabels[duel.conditions[index]] }}</p>
        <div class="engage-cars" role="radiogroup" aria-label="Voiture engagée">
          <button v-for="(r, car) in duel.player.lineup" :key="car" type="button" role="radio" :aria-checked="picked === car"
            class="engage-car" :class="{ hot: overheated(duel.player, car) }" @click="pick(car, $event)">
            <img v-if="edition(r.id, save.cars[r.id]?.shown).art" :src="edition(r.id, save.cars[r.id]?.shown).art" alt="" />
            <span class="engage-name">{{ r.vehicle.name }}</span>
            <span :key="projections[car]" class="engage-score" :aria-label="`de ${luckRange(projections[car])[0]} à ${luckRange(projections[car])[1]} points`">{{ rangeText(projections[car]) }}</span>
            <span class="engage-uses">{{ overheated(duel.player, car) ? 'Surchauffe −3' : `${r.uses - duel.player.used[car]} secteur${r.uses - duel.player.used[car] > 1 ? 's' : ''}` }}</span>
          </button>
        </div>
        <div class="rival-line" aria-label="Écurie adverse">
          <span v-for="(r, car) in duel.rival.lineup" :key="car" class="rival-car" :class="{ hot: overheated(duel.rival, car) }">
            {{ r.vehicle.name }} <small>{{ Math.max(0, r.uses - duel.rival.used[car]) }} sect.</small>
          </span>
          <span class="rival-car nitro-left">Nitro ×{{ duel.rival.nitro }}</span>
        </div>
        <label class="nitro-toggle" :class="{ off: !duel.player.nitro, armed: nitro }">
          <input v-model="nitro" type="checkbox" :disabled="!duel.player.nitro" @change="armNitro" />
          <span>Nitro <small>{{ duel.player.nitro }} charge{{ duel.player.nitro > 1 ? 's' : '' }} · +2 sur ce secteur</small></span>
        </label>
        <button type="button" class="button primary wide" :class="{ 'nitro-armed': nitro }" @click="engage">Engager {{ duel.player.lineup[picked].vehicle.name }} <span aria-hidden="true">⟶</span></button>
        <button type="button" class="button quiet wide" @click="abandon">Abandonner</button>
      </section>
    </template>

    <!-- Constitution de l'écurie -->
    <template v-else-if="rival && league">
      <div class="page-heading">
        <button type="button" class="back-link" @click="chosen = null"><span aria-hidden="true">←</span> Rivaux</button>
        <span class="eyebrow">{{ league.name }} · plafond {{ cap }}</span>
        <h1 tabindex="-1">{{ rival.circuit.name }}</h1>
        <p>Contre {{ rival.name }}</p>
      </div>
      <section v-if="isDaily" class="daily-panel"><h2>Contrainte</h2><p>{{ constraintText(challenge.constraint) }}</p><p>{{ challenge.reward }} crédits à la première victoire du jour.</p></section>
      <div class="cap-meter" :class="{ over: cost > cap }">
        <span>Coût d’écurie</span><div><span :style="{ width: `${Math.min(100, cost / cap * 100)}%` }"></span></div><b>{{ cost }}/{{ cap }}</b>
      </div>
      <button type="button" class="button primary wide race-launch" :disabled="Boolean(problem)" @click="start">{{ isDaily ? `Lancer le défi${problem ? ' · ' + problem : ''}` : problem ?? 'Lancer la course' }} <span v-if="!problem" aria-hidden="true">⟶</span></button>
      <section class="race-briefing" aria-labelledby="briefing-title">
        <div class="section-row"><h2 id="briefing-title">Préparer ta course</h2><span v-if="!isDaily && rival.league === 'neon'" class="race-intro-badge">Accessible d’origine</span></div>
        <ol class="race-sector-order" aria-label="Ordre des secteurs">
          <li v-for="(sector, i) in rival.circuit.sectors" :key="i"><span aria-hidden="true">{{ sectorIcons[sector] }}</span>{{ sectorLabels[sector] }}</li>
        </ol>
        <div class="race-conditions" aria-label="Conditions possibles">
          <span v-for="c in conditions" :key="c.key"><span aria-hidden="true">{{ conditionIcons[c.key] }}</span> {{ conditionLabels[c.key] }} {{ c.chance }} %</span>
        </div>
        <ul class="race-priorities">
          <li v-for="p in recommendedCars" :key="p.sector">
            <div><b>{{ statLabels[p.stat] }}</b><small>{{ p.times }} {{ p.times > 1 ? 'secteurs' : 'secteur' }} · {{ sectorLabels[p.sector] }}</small></div>
            <button v-if="p.best" class="race-prepare" type="button" :aria-label="`Préparer ${p.best.name} · ${statLabels[p.stat]}`"
              @click="emit('inspect', 'car', p.best.id, rival.circuit, p.stat)">
              <b>{{ p.best.name }}</b><small>{{ pointsText(p.best.score) }} pts estimés <span aria-hidden="true">↗</span></small>
            </button>
          </li>
        </ul>
        <p v-if="lineup.length" class="hint">Scores moyens estimés selon le terrain, hors nitro et bonus liés à l’adversaire ou à l’écurie. Touche une voiture pour ouvrir l’atelier.</p>
      </section>
      <div class="lineup-slots">
        <button v-for="n in 3" :key="n" type="button" class="lineup-slot" :disabled="!lineup[n - 1]" @click="emit('inspect', 'car', lineup[n - 1], rival.circuit)">
          <CarCard v-if="lineup[n - 1]" :id="lineup[n - 1]" :style-name="save.cars[lineup[n - 1]]?.shown" :prep="prepOf(save, lineup[n - 1])" compact />
          <span v-else class="slot-placeholder">Place {{ n }}</span>
        </button>
      </div>
      <p class="rival-preview">Écurie adverse · {{ rivalLineup(rival).map(e => name(e.id)).join(' · ') }}</p>

      <h2 class="list-title">Ton garage</h2>
      <ul class="pick-list">
        <li v-for="{ v, car, scores } in garageCars" :key="v.id">
          <button type="button" :aria-pressed="lineup.includes(v.id)" @click="toggle(v.id)">
            <span class="pick-cost">{{ v.cost }}</span>
            <span class="pick-name"><b><span v-if="save.cars[v.id].favorite" aria-label="Favori">★ </span>{{ v.name }}</b><small>{{ v.version }} · {{ car.uses }} secteurs avant surchauffe</small></span>
            <span class="pick-stats"><span v-for="s in scores.filter(s => s.times === priorities[0]?.times)" :key="s.stat">{{ s.label }} {{ pointsText(s.average) }} pts</span></span>
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
        <li v-for="(r, i) in rivals" :key="r.id" class="deal" :style="{ '--i': i }">
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
