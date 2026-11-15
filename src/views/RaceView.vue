<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref } from 'vue'
import { NIGHT_CAP, nightRival } from '../game/endless'
import { createNightRound, finishNight, nightLineupCheck, settleNight, startNight } from '../game/save'
import { constraintCap, constraintText } from '../game/daily'
import { art, carSprite, edition, trackBackdrop } from '../game/art'
import {
  specials, specialByRivalId, boosterById, conditionIcons, conditionLabels, leagueById, rivalById, rivals, sectorIcons, sectorLabels, sectorStat, statLabels, vehicleById, vehicles,
  type Condition, type Rival, type Sector, type StatKey,
} from '../game/data'
import { helpForLine, vHelp } from '../game/help'
import { floatText, confetti, flash, palettes, pop, ring, shake, sparks, streaks, tween, tone } from '../game/fx'
import { canAttack, circuitPriorities, circuitScores, evaluate, lineupCost, luckRange, overheated, playRound, racer, rivalLineup, stances, type Round, type Stance } from '../game/rules'
import { specialsOpen, unlockedSpecials, dailyLineupCheck, prepareDaily, startDaily, todayChallenge, lineupCheck, prepOf, settleDuel, startDuel, unlockedRivals, type Reward } from '../game/save'
import { act, dailySelected, buzz, persist, reducedMotion, save, sound } from '../game/store'
import { tutorialAction } from '../game/tutorial'
import CarCard from '../components/CarCard.vue'
import SectorRun from '../components/SectorRun.vue'

const emit = defineEmits<{ inspect: [kind: 'car' | 'part', id: string, circuit?: Rival['circuit'], suggestedStat?: StatKey]; go: [screen: 'garage' | 'shop'] }>()
const chosen = ref<string | null>(save.duel?.rivalId ?? (save.night ? 'night' : null) ?? (dailySelected.value ? `daily:${save.daily.date}` : null))
dailySelected.value = false
const challenge = computed(() => todayChallenge(save, chosen.value?.startsWith('daily:') ? chosen.value.slice(6) : save.daily.date))
const isNight = computed(() => chosen.value?.startsWith('night'))
const nightSeed = ref(String(Date.now()))
const nightOpponent = computed(() => nightRival(save.night?.seed ?? nightSeed.value, save.night?.round ?? 1))
const nightEnd = ref<{ wins: number; credits: number; newRecord: boolean } | null>(null)
const isDaily = computed(() => chosen.value?.startsWith('daily:'))
const rival = computed(() => isNight.value ? nightOpponent.value : isDaily.value ? challenge.value.rival : chosen.value ? rivalById.get(chosen.value) : undefined)
const special = computed(() => chosen.value ? specialByRivalId.get(chosen.value) : undefined)
const league = computed(() => rival.value?.cap !== undefined ? { name: special.value?.name, cap: rival.value.cap } : rival.value ? leagueById.get(rival.value.league) : undefined)
const unlocked = computed(() => unlockedRivals(save))
if (chosen.value?.startsWith('daily:') && !save.duel) act(prepareDaily)
const lineup = computed({ get: () => isNight.value ? save.nightLineup : isDaily.value ? save.dailyLineup ?? [] : save.lineup, set: ids => { if (isNight.value) save.nightLineup = ids; else if (isDaily.value) save.dailyLineup = ids; else save.lineup = ids } })
const cap = computed(() => isNight.value ? NIGHT_CAP : isDaily.value ? constraintCap(challenge.value.constraint) : league.value?.cap ?? 9)
const cost = computed(() => lineupCost(lineup.value))
const problem = computed(() => isNight.value ? nightLineupCheck(save) : isDaily.value ? dailyLineupCheck(save) : rival.value ? lineupCheck(save, save.lineup, rival.value.id) : undefined)
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
const statArticle = { acc: 'l’', end: 'l’', vit: 'la ', man: 'la ' } as const
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
  if (rival.value && act(s => isNight.value ? startNight(s, nightSeed.value) : isDaily.value ? startDaily(s) : startDuel(s, rival.value!.id, Math.random))) {
    if (!isNight.value) tutorialAction(0, 4)
    picked.value = 0; nitro.value = false; stance.value = 'normal'; detail.value = null
    sound('rev'); streaks(palettes.cyan, 30); flash(tone.cyan, 0.2); buzz([20, 40, 60])
  }
}

// ——— Course en cours ———
const duel = computed(() => save.duel)
const picked = ref(0)
const nitro = ref(false)
// Consigne de pilotage du secteur : attaque, normal ou gestion.
const stance = ref<Stance>('normal')
const stanceHints: Record<Stance, string> = { gestion: '−2 · 0 secteur', normal: '1 secteur', attaque: '+2 · 2 secteurs' }
const stanceBlocked = (key: Stance) => Boolean(duel.value) && (key === 'attaque' ? !canAttack(duel.value!.player, picked.value)
  : key === 'gestion' && overheated(duel.value!.player, picked.value))
function setStance(key: Stance) {
  stance.value = key
  sound(key === 'attaque' ? 'rev' : 'flip')
  if (key === 'attaque') streaks(palettes.fire, 10)
}
const detail = ref<{ side: 'player' | 'rival'; car: number } | null>(null)
const carDetail = computed(() => {
  const d = duel.value, selected = detail.value
  if (!d || !selected || d.winner || d.rounds.length >= d.sectors.length) return null
  const side = d[selected.side], car = side.lineup[selected.car]
  return {
    car, remaining: car.uses - side.used[selected.car],
    stat: sectorStat[d.sectors[d.rounds.length]],
    range: luckRange(evaluate(d, selected.side, selected.car, false).score),
  }
})
const shown = ref<Round | null>(null)
const reward = ref<Reward | null>(null)
// Résumé de la course affiché à l'arrivée : la course elle-même est effacée au règlement.
const recap = ref<{ sector: Sector; condition: Condition; winner: Round['winner']; player: string; rival: string; scores: [number, number] }[]>([])
const index = computed(() => duel.value?.rounds.length ?? 0)

// Mise en scène d'un secteur : une mini-course joue le détail de score ligne par ligne, puis le verdict tombe.
// Tant qu'il n'est pas tombé, la piste et le tableau de score n'affichent pas encore ce secteur.
const settled = ref(true)
const step = ref(0)
const STEP_MS = 560
const runArts = computed(() => shown.value
  ? { player: carArt('player', shown.value.player.car), rival: carArt('rival', shown.value.rival.car) } : {})
const runSprites = computed(() => shown.value && duel.value ? {
  player: carSprite(duel.value.player.lineup[shown.value.player.car].id), rival: carSprite(duel.value.rival.lineup[shown.value.rival.car].id) } : {})
// À scores égaux, l'Endurance des deux voitures départage : le verdict le dit.
const tieBreak = computed(() => {
  const round = shown.value, d = duel.value
  if (!round || !d || round.player.score !== round.rival.score) return ''
  const mine = d.player.lineup[round.player.car].stats.end, theirs = d.rival.lineup[round.rival.car].stats.end
  return round.winner === 'tie' ? `Égalité à ${round.player.score}, et même Endurance (${mine}) : personne ne marque.`
    : `Égalité à ${round.player.score} : l’Endurance départage, ${mine} pour toi contre ${theirs}.`
})
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

// Une ligne du détail de score par étape, pour les deux voitures à la fois.
function advance(round: Round, to: number) {
  step.value = to
  let boost = false
  for (const who of ['player', 'rival'] as const) {
    const lines = round[who].lines.slice(0, to), line = round[who].lines[to - 1]
    counts[who] = lines.reduce((sum, l) => sum + l.value, 0)
    if (!line || to === 1) continue
    if (line.label === 'Nitro') {
      boost = true
      flash(tone.gold, 0.22)
      streaks(palettes.fire, 40, who === 'player' ? 1 : -1)
    }
    else if (to === round[who].lines.length && round[who].luck === 'incident') { shake(2); if (who === 'player') buzz([40, 30, 40]) }
  }
  sound(boost ? 'nitro' : 'tick')
}
function skipRun() { if (shown.value && !settled.value) { clear(); settle(shown.value) } }

function settle(round: Round, immediateBoost = false) {
  settled.value = true
  step.value = Math.max(round.player.lines.length, round.rival.lines.length) + 1
  counts.player = round.player.score
  counts.rival = round.rival.score
  sound(immediateBoost ? 'nitro' : 'slam')
  buzz(round.winner === 'player' ? [20, 30, 20] : 15)
  shake(round.winner === 'player' ? 2 : 1)
  const verdict = round.player.luck === 'perfect' ? 'legend'
    : round.winner === 'player' ? 'collect' : round.winner === 'rival' ? 'lose' : 'flip'
  timers.push(setTimeout(() => sound(verdict), immediateBoost ? STEP_MS : 160))
  void nextTick(() => {
    const score = `.duel-col.${round.winner} .duel-score`
    if (round.winner === 'player') { sparks(score, palettes.cyan, 42, 1.1); ring(score, tone.cyan); flash(tone.cyan, 0.18); pop(score, 1.4) }
    else if (round.winner === 'rival') { sparks(score, palettes.pink, 22, 0.9); flash(tone.rose, 0.16); pop(score, 1.25) }
    pop('.scoreboard', 1.25)
    for (const who of ['player', 'rival'] as const) {
      const at = `.duel-col.${who} .duel-score`, luck = round[who].luck
      if (luck === 'perfect') { floatText(at, 'Parfait !', tone.gold, 20); sparks(at, palettes.gold, 36, 1.2); if (who === 'player') flash(tone.gold, 0.25) }
      if (luck === 'incident') { floatText(at, round[who].lines.at(-1)!.label, tone.rose, 16); shake(2); if (who === 'player') buzz([40, 30, 40]) }
    }
  })
}

function pick(car: number, event: Event) {
  picked.value = car
  if (stanceBlocked(stance.value)) stance.value = 'normal'
  detail.value = { side: 'player', car }
  pop(event.currentTarget as Element, 1.06, 220)
}
function armNitro() {
  if (!nitro.value) return
  buzz([10, 20, 30]); streaks(palettes.fire, 14)
}
// Le rival voit tes fourchettes : tu vois les siennes, hors nitro. C'est ce qui permet de deviner son choix.
const rivalProjections = computed(() => duel.value && index.value < duel.value.sectors.length
  ? duel.value.rival.lineup.map((_, car) => evaluate(duel.value!, 'rival', car, false).score) : [])
const projections = computed(() => duel.value && index.value < duel.value.sectors.length
  ? duel.value.player.lineup.map((_, car) => evaluate(duel.value!, 'player', car, nitro.value, undefined, stance.value).score) : [])

function engage() {
  const d = duel.value
  if (!d || d.winner) return
  const round = playRound(d, { car: picked.value, nitro: nitro.value, stance: stance.value }, Math.random)
  // Engager après la bulle de la nitro mène à la lecture du résultat ; les bulles 5 à 8 restent à lire avant.
  if (!isNight.value) tutorialAction(8, 9)
  shown.value = round
  detail.value = null
  nitro.value = false
  stance.value = 'normal'
  persist()
  clear()
  if (reducedMotion.value) settle(round, round.player.nitro || round.rival.nitro)
  else {
    settled.value = false
    counts.player = counts.rival = 0
    sound('whoosh')
    step.value = 0
    const steps = Math.max(round.player.lines.length, round.rival.lines.length)
    for (let k = 1; k <= steps; k++) timers.push(setTimeout(() => advance(round, k), 320 + (k - 1) * STEP_MS))
    timers.push(setTimeout(() => settle(round), 320 + steps * STEP_MS + 240))
  }
  const free = d.player.lineup.findIndex((_, car) => !overheated(d.player, car))
  if (overheated(d.player, picked.value) && free >= 0) picked.value = free
}

function proceed() {
  shown.value = null
  if (duel.value?.winner) {
    const won = duel.value.winner === 'player'
    const d = duel.value
    recap.value = d.rounds.map(r => ({ sector: r.sector, condition: r.condition, winner: r.winner, scores: [r.player.score, r.rival.score],
      player: name(d.player.lineup[r.player.car].id), rival: name(d.rival.lineup[r.rival.car].id) }))
    if (isNight.value) {
      nightEnd.value = settleNight(save) ?? null
      persist()
      sound(save.night?.newRecord ? 'legend' : won ? 'win' : 'lose')
      clear()
      if (save.night?.newRecord) {
        if (!reducedMotion.value) { confetti(palettes.gold, 100); flash(tone.gold, 0.3) }
      }
      return
    }
    reward.value = settleDuel(save) ?? null
    tutorialAction(0, 10)
    persist()
    sound(reward.value?.perfect ? 'legend' : won ? 'win' : 'lose')
    lastWinner.value = won ? 'player' : 'other'
    clear()
    if (reward.value?.perfect && !reducedMotion.value) {
      confetti(palettes.gold, 180); streaks(palettes.gold, 60); flash(tone.gold, 0.5); shake(3)
      buzz([60, 40, 60, 40, 120])
      timers.push(setTimeout(() => { if (!reducedMotion.value) confetti(palettes.gold, 120) }, 650))
    } else if (won) {
      confetti(); flash(tone.gold, 0.32); buzz([40, 60, 40, 60, 80])
      timers.push(setTimeout(() => confetti(palettes.gold, 60), 650))
    } else shake(1)
    stops.push(tween(0, reward.value?.credits ?? 0, 900, value => { rewardShown.value = value }))
  }
}
const lastWinner = ref<'player' | 'other'>('other')
function nextNightRound() {
  act(createNightRound)
  shown.value = null; picked.value = 0; nitro.value = false; detail.value = null
}
function cashNight(returnGarage = false) {
  nightEnd.value = finishNight(save) ?? null
  persist()
  if (nightEnd.value?.credits && returnGarage) sound('coin')
  if (returnGarage) { nightEnd.value = null; chosen.value = null; emit('go', 'garage') }
}
function abandon() {
  if (isNight.value) { clear(); shown.value = null; cashNight(); sound('lose'); return }

  act(s => { if (s.duel) { if (!s.duel.rivalId.startsWith('daily:')) { s.record[s.duel.rivalId] ??= { wins: 0, losses: 0, perfect: false }; s.record[s.duel.rivalId].losses++ }; s.duel = null } }, 'Course abandonnée')
}
// Libellés courts pour la piste, qui doit tenir sur une ligne de cinq cases à 320 px.
const trackLabels = { depart: 'Départ', virage: 'Virages', ligne: 'Droite', endurance: 'Endur.' } as const
const name = (id: string) => `${vehicleById.get(id)!.name}`
</script>

<template>
  <main class="race" :class="{ 'daily-race': isDaily && !duel, 'night-race': isNight }">
    <section v-if="nightEnd" class="race-end night-panel">
      <h1 tabindex="-1">Nuit terminée</h1>
      <p><span v-help="'nightRound'">Manches gagnées</span> : {{ nightEnd.wins }}</p>
      <p>{{ nightEnd.credits }} crédits versés</p>
      <p v-if="nightEnd.newRecord" v-help="'nightRecord'" role="status">Nouveau record !</p>
      <button type="button" class="button primary wide" @click="nightEnd = null; chosen = null; emit('go', 'garage')">Rentrer au garage</button>
    </section>
    <section v-else-if="isNight && save.night?.resting" class="race-end night-panel">
      <h1 tabindex="-1"><span v-help="'nightRound'">Manche suivante</span> : {{ save.night.round }}</h1>
      <p>{{ nightOpponent.circuit.name }}</p>
      <p>{{ conditionLabels[Object.keys(nightOpponent.circuit.conditions)[0] as Condition] }}</p>
      <p><span v-help="'nightGains'">Gains accumulés</span> : {{ save.night.gains }} crédits</p>
      <p v-if="save.night.newRecord" v-help="'nightRecord'" role="status">Nouveau record !</p>
      <p v-help="'nightRecord'">Record : {{ save.nightRecord }} {{ save.nightRecord > 1 ? 'manches' : 'manche' }}</p>
      <div class="recap-actions">
        <button type="button" class="button primary" @click="nextNightRound">Manche suivante</button>
        <button type="button" class="button quiet" @click="cashNight(true)">Rentrer au garage</button>
      </div>
    </section>
    <!-- Résultat final -->
    <section v-else-if="reward" class="race-end" :class="lastWinner === 'player' ? 'won' : 'lost'">
      <span class="eyebrow">{{ rival?.circuit.name }}</span>
      <h1 tabindex="-1">{{ reward.perfect ? 'Victoire parfaite' : lastWinner === 'player' ? 'Victoire !' : 'Pas cette fois.' }}</h1>
      <p v-if="reward.perfect" class="perfect-banner"><span aria-hidden="true">★</span> Tu as gagné tous les secteurs !</p>
      <p v-if="isDaily && !reward.credits">{{ lastWinner === 'player' ? 'Défi déjà récompensé aujourd’hui.' : 'Retente le défi quand tu veux.' }}</p>
      <p v-else :aria-label="`+${reward.credits} crédits`">+{{ rewardShown }} crédits<template v-if="reward.perfect"> · crédits doublés</template></p>
      <p v-if="reward.ticket">+1 ticket {{ boosterById.get(reward.ticket)?.name }} · première victoire</p>
      <p v-if="reward.perfectTicket">+1 ticket {{ boosterById.get(reward.perfectTicket)?.name }} · victoire parfaite</p>
      <ol v-if="recap.length" class="race-recap" aria-label="Résumé des secteurs">
        <li v-for="(r, i) in recap" :key="i" :class="r.winner" :style="{ '--i': i }">
          <span class="recap-sector"><span aria-hidden="true">{{ sectorIcons[r.sector] }} {{ conditionIcons[r.condition] }}</span><span class="visually-hidden">{{ sectorLabels[r.sector] }}, {{ conditionLabels[r.condition] }} : </span></span>
          <span class="recap-car">{{ r.player }}</span><b>{{ r.scores[0] }} – {{ r.scores[1] }}</b><span class="recap-car">{{ r.rival }}</span>
        </li>
      </ol>
      <div class="recap-actions">
        <button type="button" class="button primary" @click="reward = null; chosen = null">Rivaux <span aria-hidden="true">⟶</span></button>
        <button type="button" class="button quiet" @click="emit('go', reward?.ticket || reward?.perfectTicket ? 'shop' : 'garage')">{{ reward.ticket || reward.perfectTicket ? 'Ouvrir les tickets' : 'Préparer au garage' }}</button>
      </div>
    </section>

    <!-- Duel en cours -->
    <template v-else-if="duel && rival">
      <div class="race-head">
        <img v-if="art.rival(rival.id)" :src="art.rival(rival.id)" alt="" class="rival-face" />
        <span v-else class="rival-face" aria-hidden="true">{{ rival.name[0] }}</span>
        <div><span class="eyebrow">{{ rival.circuit.name }}</span><h1 tabindex="-1"><span v-if="isNight" v-help="'nightRound'">{{ rival.name }}</span><template v-else>{{ rival.name }}</template></h1></div>
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
        <SectorRun :round="shown" :step="step" :running="!settled" :arts="runArts" :sprites="runSprites" :backdrop="trackBackdrop(shown.condition)" @skip="skipRun" />
        <p v-if="settled && tieBreak" class="tie-note">{{ tieBreak }}</p>
        <div class="duel-columns">
          <div v-for="who in (['player', 'rival'] as const)" :key="who" class="duel-col"
            :class="[who, { winner: settled && shown.winner === who, loser: settled && shown.winner !== who && shown.winner !== 'tie', boosted: shown[who].nitro }]">
            <span class="duel-who">{{ who === 'player' ? 'Toi' : rival.name }} <span v-if="shown[who].nitro" class="clash-nitro">Nitro</span></span>
            <strong>{{ name(duel[who].lineup[shown[who].car].id) }}</strong>
            <span class="duel-score" :aria-label="`${shown[who].score} points`">{{ counts[who] }}</span>
            <ul v-if="settled"><li v-for="(l, i) in shown[who].lines" :key="i" :style="{ '--i': i }"><span v-help="helpForLine(l.label)">{{ l.label }}</span><b>{{ l.value > 0 ? '+' : '' }}{{ l.value }}</b></li></ul>
          </div>
        </div>
        <button v-if="settled" type="button" class="button primary wide" @click="proceed">{{ duel.winner ? 'Voir le résultat' : 'Secteur suivant' }} <span aria-hidden="true">⟶</span></button>
      </section>

      <section v-else-if="duel.winner" class="round-result">
        <h2>Course terminée · {{ duel.player.points }} – {{ duel.rival.points }}</h2>
        <button type="button" class="button primary wide" @click="proceed">Voir le résultat <span aria-hidden="true">⟶</span></button>
      </section>

      <section v-else class="engage">
        <p v-if="index === 0" class="engage-goal">Le plus gros score gagne le secteur. Remporte le plus de secteurs sur {{ duel.sectors.length }}. Ici, c’est {{ statArticle[sectorStat[duel.sectors[index]]] }}<b>{{ statLabels[sectorStat[duel.sectors[index]]] }}</b> qui compte : choisis ta voiture.</p>
        <p class="engage-brief">Secteur {{ index + 1 }}/{{ duel.sectors.length }} · <b v-help="duel.sectors[index]">{{ sectorLabels[duel.sectors[index]] }}</b> (<span v-help="sectorStat[duel.sectors[index]]">{{ statLabels[sectorStat[duel.sectors[index]]] }}</span>)
          · <span v-help="duel.conditions[index]">{{ conditionIcons[duel.conditions[index]] }} {{ conditionLabels[duel.conditions[index]] }}</span></p>
        <h2 class="engage-rival-title">{{ isNight ? `Voitures adverses · ${rival.name}` : `Voitures de ${rival.name}` }} <small>Nitro ×{{ duel.rival.nitro }}</small></h2>
        <div class="engage-cars engage-rivals" aria-label="Écurie adverse">
          <button v-for="(r, car) in duel.rival.lineup" :key="car" type="button"
            class="engage-car engage-rival" :class="{ hot: overheated(duel.rival, car) }"
            :aria-label="`Voiture adverse : ${r.vehicle.name}, de ${luckRange(rivalProjections[car])[0]} à ${luckRange(rivalProjections[car])[1]} points`" aria-controls="engage-detail"
            @click="detail = { side: 'rival', car }">
            <img v-if="carArt('rival', car)" :src="carArt('rival', car)" alt="" />
            <span class="engage-name">{{ r.vehicle.name }}</span>
            <span class="engage-score" :aria-label="`de ${luckRange(rivalProjections[car])[0]} à ${luckRange(rivalProjections[car])[1]} points`">{{ rangeText(rivalProjections[car]) }}</span>
            <span class="engage-uses">{{ r.uses - duel.rival.used[car] }} secteur{{ r.uses - duel.rival.used[car] > 1 ? 's' : '' }}</span>
            <span v-if="overheated(duel.rival, car)" class="engage-heat">Surchauffe −3</span>
          </button>
        </div>
        <div class="engage-cars" role="radiogroup" aria-label="Voiture engagée">
          <button v-for="(r, car) in duel.player.lineup" :key="car" type="button" role="radio" :aria-checked="picked === car"
            aria-controls="engage-detail" class="engage-car" :class="{ hot: overheated(duel.player, car) }" @click="pick(car, $event)">
            <img v-if="edition(r.id, save.cars[r.id]?.shown).art" :src="edition(r.id, save.cars[r.id]?.shown).art" alt="" />
            <span class="engage-name">{{ r.vehicle.name }}</span>
            <span :key="projections[car]" class="engage-score" :aria-label="`de ${luckRange(projections[car])[0]} à ${luckRange(projections[car])[1]} points`">{{ rangeText(projections[car]) }}</span>
            <span class="engage-uses">{{ overheated(duel.player, car) ? 'Surchauffe −3' : `${r.uses - duel.player.used[car]} secteur${r.uses - duel.player.used[car] > 1 ? 's' : ''}` }}</span>
          </button>
        </div>
        <section v-if="carDetail" id="engage-detail" class="engage-detail" aria-labelledby="engage-detail-title">
          <h2 id="engage-detail-title">{{ carDetail.car.vehicle.name }}</h2>
          <dl class="engage-stats">
            <div v-for="stat in (['acc', 'vit', 'man', 'end'] as const)" :key="stat"
              :class="{ 'sector-stat': stat === carDetail.stat }" :aria-current="stat === carDetail.stat ? 'true' : undefined">
              <dt><span v-help="stat">{{ statLabels[stat] }}</span><small v-if="stat === carDetail.stat"> · secteur en cours</small></dt>
              <dd>{{ carDetail.car.stats[stat] }}</dd>
            </div>
          </dl>
          <p><span v-help="'secteurs'">Secteurs restants</span> : {{ carDetail.remaining }}</p>
          <p><span v-help="'forme'">Fourchette de score</span> sur ce secteur : <strong>{{ carDetail.range[0] }}–{{ carDetail.range[1] }}</strong> points · sans nitro</p>
        </section>
        <p class="engage-hint">Sous chaque voiture : <span v-help="'forme'">fourchette de score</span> et <span v-help="'secteurs'">secteurs restants</span>.</p>
        <!-- Toujours à portée de pouce : la nitro et le bouton restent collés au bas de l'écran. -->
        <div class="engage-actions">
          <div class="stance-toggle" :class="{ set: stance !== 'normal' }" role="radiogroup" aria-label="Consigne de pilotage">
            <span v-help="'consigne'">Consigne</span>
            <button v-for="key in (['gestion', 'normal', 'attaque'] as const)" :key="key" type="button" role="radio" :class="key"
              :aria-checked="stance === key" :disabled="stanceBlocked(key)" @click="setStance(key)">
              <b>{{ stances[key].label }}</b><small>{{ stanceHints[key] }}</small>
            </button>
          </div>
          <label class="nitro-toggle" :class="{ off: !duel.player.nitro, armed: nitro }">
            <input v-model="nitro" type="checkbox" :disabled="!duel.player.nitro" @change="armNitro" />
            <span><span v-help="'nitro'">Nitro</span> <small>{{ duel.player.nitro }} charge{{ duel.player.nitro > 1 ? 's' : '' }} · +2</small></span>
          </label>
          <button type="button" class="button primary" :class="{ 'nitro-armed': nitro }" @click="engage">Engager <span class="engage-pick">{{ duel.player.lineup[picked].vehicle.name }}</span> <span aria-hidden="true">⟶</span></button>
        </div>
        <button type="button" class="button quiet wide" @click="abandon">Abandonner</button>
      </section>
    </template>

    <!-- Constitution de l'écurie -->
    <template v-else-if="rival && league">
      <div class="page-heading">
        <button type="button" class="back-link" @click="chosen = null"><span aria-hidden="true">←</span> Rivaux</button>
        <span v-if="!isNight" class="eyebrow">{{ league.name }} · plafond {{ cap }}</span>
        <h1 v-if="isNight" tabindex="-1"><span v-help="'endless'">Nuit sans fin</span></h1>
        <h1 v-else tabindex="-1">{{ rival.circuit.name }}</h1>
        <p v-if="!isNight">Contre {{ rival.name }}</p>
        <template v-else>
          <p>Enchaîne les courses contre des adversaires de plus en plus forts : ta nuit s’arrête à la première défaite.</p>
          <p v-help="'nightRecord'">Record : {{ save.nightRecord }} {{ save.nightRecord > 1 ? 'manches' : 'manche' }}</p>
          <p v-help="'nightCap'">Plafond de coût : {{ NIGHT_CAP }}</p>
        </template>
        <p v-if="special">{{ save.record[rival.id]?.wins ? rival.replay : rival.reward }} crédits · {{ save.record[rival.id]?.wins ? 'rejeu' : 'première victoire (doublés si parfaite)' }}<template v-if="rival.completionTicket && !save.record[rival.id]?.wins"> · un ticket à la première victoire</template></p>
      </div>
      <section v-if="isDaily" class="daily-panel"><h2>Contrainte</h2><p>{{ constraintText(challenge.constraint) }}</p><p>{{ challenge.reward }} crédits à la première victoire du jour.</p></section>
      <div class="cap-meter" :class="{ over: cost > cap }">
        <span v-help="isNight ? 'nightCap' : 'plafond'">Coût d’écurie</span><div><span :style="{ width: `${Math.min(100, cost / cap * 100)}%` }"></span></div><b>{{ cost }}/{{ cap }}</b>
      </div>
      <button type="button" class="button primary wide race-launch" :disabled="Boolean(problem)" @click="start">{{ isNight ? 'Commencer la nuit' : isDaily ? `Lancer le défi${problem ? ' · ' + problem : ''}` : problem ?? 'Lancer la course' }} <span v-if="!problem && !isNight" aria-hidden="true">⟶</span></button>
      <p v-if="isNight && problem" class="hint" role="status">{{ problem }}</p>
      <section class="race-briefing" aria-labelledby="briefing-title">
        <div class="section-row"><h2 id="briefing-title">Préparer ta course</h2><span v-if="!isNight && !isDaily && rival.league === 'neon'" class="race-intro-badge">Accessible d’origine</span></div>
        <p v-if="isNight">{{ rival.circuit.name }}</p>
        <ol class="race-sector-order" aria-label="Ordre des secteurs">
          <li v-for="(sector, i) in rival.circuit.sectors" :key="i"><span aria-hidden="true">{{ sectorIcons[sector] }}</span><span v-help="sector">{{ sectorLabels[sector] }}</span></li>
        </ol>
        <div class="race-conditions" aria-label="Conditions possibles">
          <span v-for="c in conditions" :key="c.key"><span aria-hidden="true">{{ conditionIcons[c.key] }}</span> <span v-help="c.key">{{ conditionLabels[c.key] }}</span> {{ c.chance }} %</span>
        </div>
        <ul class="race-priorities">
          <li v-for="p in recommendedCars" :key="p.sector">
            <div><b v-help="p.stat">{{ statLabels[p.stat] }}</b><small>{{ p.times }} {{ p.times > 1 ? 'secteurs' : 'secteur' }} · {{ sectorLabels[p.sector] }}</small></div>
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
            <span class="rival-info"><b>{{ r.name }} <span v-if="save.record[r.id]?.perfect" class="perfect-star" role="img" aria-label="Victoire parfaite obtenue">★</span></b><small>{{ r.title }} · {{ leagueById.get(r.league)!.name }} (plafond {{ leagueById.get(r.league)!.cap }})</small></span>
            <span class="rival-status">{{ !unlocked.includes(r.id) ? 'Verrouillé' : save.record[r.id]?.wins ? `✓ ${save.record[r.id].wins}` : 'Défier' }}</span>
          </button>
        </li>
        <li class="deal" :style="{ '--i': 0 }">
          <button type="button" class="rival-row night-entry" @click="nightSeed = String(Date.now()); chosen = 'night'">
            <span class="rival-initial" aria-hidden="true">∞</span>
            <span class="rival-info"><b>Nuit sans fin</b><small>Record : {{ save.nightRecord }} {{ save.nightRecord > 1 ? 'manches' : 'manche' }}</small></span>
            <span class="rival-status">Commencer</span>
          </button>
        </li>
      </ul>
      <section class="specials">
        <h2 v-help="'special'">Spéciales</h2>
        <p v-if="!specialsOpen(save)" v-help="'specialUnlock'">Bats toute la Ligue Néon pour les ouvrir.</p>
        <div class="special-grid">
          <article v-for="s in specials" :key="s.id" class="special-card">
            <h3>{{ s.name }} · {{ s.tiers.filter(r => save.record[r.id]?.wins).length }}/{{ s.tiers.length }}</h3>
            <ul>
              <li v-for="r in s.tiers" :key="r.id"><button type="button" class="button quiet" :disabled="!unlockedSpecials(save).includes(r.id)" @click="chosen = r.id"><span v-help="'specialTier'">{{ r.title }}</span><span v-if="save.record[r.id]?.wins"> ✓</span></button></li>
            </ul>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>
