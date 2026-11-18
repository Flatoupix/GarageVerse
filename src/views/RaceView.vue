<script setup lang="ts">
import { inTransit } from '../game/trade'
import { computed, nextTick, onMounted, onUnmounted, onUpdated, reactive, ref, shallowRef, watch } from 'vue'
import { locale, t, tp } from '../i18n'
import { ruleText } from '../game/rules-text'
import { NIGHT_CAP, nightRival } from '../game/endless'
import { createNightRound, finishNight, nightLineupCheck, settleNight, startNight } from '../game/save'
import { constraintCap, constraintText } from '../game/daily'
import { art, carSprite, edition, trackBackdrop } from '../game/art'
import { waitForImages } from '../game/asset-loading'
import {
  specials, specialByRivalId, boosterById, conditionIcons, conditionLabels, leagueById, rivalById, rivals, rivalStepMap, sectorIcons, sectorLabels, sectorStat, statLabels, vehicleById, vehicles,
  type Condition, type Rival, type Sector, type StatKey,
} from '../game/data'
import { helpForLine, vHelp } from '../game/help'
import { floatText, confetti, flash, palettes, pop, ring, shake, sparks, streaks, tween, tone } from '../game/fx'
import { aiChoice, canAttack, circuitPriorities, circuitScores, evaluate, lineupCost, luckRange, overheated, playRound, racer, rivalLineup, stances, type Choice, type Round, type Stance } from '../game/rules'
import { currentRivalStep, rivalStepsDone, specialsOpen, unlockedRivalSteps, unlockedSpecials, dailyLineupCheck, prepareDaily, startDaily, todayChallenge, lineupCheck, prepOf, settleDuel, startDuel, unlockedRivals, type ManualDiscovery, type Reward } from '../game/save'
import { act, dailySelected, buzz, persist, reducedMotion, save, sound } from '../game/store'
import { playTimingRound, playTurnRound, shiftsPerSector, soloTimingWindow, type SoloDuel, type TimingResult, type TimingRound } from '../game/timing'
import { playPilotRound, sectorPilot, switchToAutomatic, type PilotMode } from '../game/pilot'
import { signedTiming, timingFeedback, timingSummary } from '../game/timing-text'
import { tutorialAction } from '../game/tutorial'
import GvButton from '../components/GvButton.vue'
import CarCard from '../components/CarCard.vue'
import ManualCountdown from '../components/ManualCountdown.vue'
import SectorRun from '../components/SectorRun.vue'
import TimingGauge from '../components/TimingGauge.vue'
import TurnControl from '../components/TurnControl.vue'
import { turnSequence, type TurnResult, type TurnSequence } from '../game/turn'
import { raceStreaks, shiftGrade, turnGrade, type ManualFeedback, type ManualGrade } from '../game/manual-feedback'
import { turnFeedback, turnSummary } from '../game/turn-text'

// Les mesures suivent aussi les changements de thème, de police et de zone sûre.
const raceRoot = ref<HTMLElement | null>(null)
let layoutObserver: ResizeObserver | undefined
function measureActions() {
  const root = raceRoot.value
  if (!root) return
  const box = root.getBoundingClientRect(), style = getComputedStyle(root)
  const left = parseFloat(style.paddingLeft), right = parseFloat(style.paddingRight)
  const tabbar = document.querySelector<HTMLElement>('.tabbar')
  const actions = root.querySelector<HTMLElement>('.race-actions')
  root.style.setProperty('--race-action-left', `${box.left + left}px`)
  root.style.setProperty('--race-action-width', `${box.width - left - right}px`)
  root.style.setProperty('--race-action-height', `${actions?.getBoundingClientRect().height ?? 0}px`)
  // Sur ordinateur, les onglets sont dans la barre du haut : l'action se colle alors au bas de la fenêtre.
  const tabbarTop = tabbar?.getBoundingClientRect().top ?? window.innerHeight
  root.style.setProperty('--race-tabbar-offset', `${tabbarTop > window.innerHeight / 2 ? window.innerHeight - tabbarTop : 0}px`)
  if (actions) layoutObserver?.observe(actions)
}
onMounted(() => {
  layoutObserver = new ResizeObserver(measureActions)
  if (raceRoot.value) layoutObserver.observe(raceRoot.value)
  const tabbar = document.querySelector('.tabbar')
  if (tabbar) layoutObserver.observe(tabbar)
  window.addEventListener('resize', measureActions)
  measureActions()
})
onUpdated(measureActions)
onUnmounted(() => { layoutObserver?.disconnect(); window.removeEventListener('resize', measureActions) })
async function scrollToStage(result = false, immediate = false) {
  await nextTick()
  const target = raceRoot.value?.querySelector<HTMLElement>('.pilot-switch')
    ?? raceRoot.value?.querySelector<HTMLElement>(result ? '.round-result' : '.manual-stage, .engage-brief, .night-panel, .race-end')
  if (!target) return
  const header = document.querySelector('.topbar')?.getBoundingClientRect().height ?? 0
  const instant = immediate || reducedMotion.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - header - 12), behavior: instant ? 'instant' : 'smooth' })
}

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
// Seuls les rivaux de ligue portent une personnalité, même si un autre mode réutilise leur identifiant.
const character = computed(() => !isNight.value && !isDaily.value && !special.value ? rivals.find(r => r.id === (rival.value?.baseRivalId ?? chosen.value)) : undefined)
const rivalStepList = computed(() => character.value ? rivalStepMap.get(character.value.id) ?? [] : [])
const unlockedSteps = computed(() => character.value ? unlockedRivalSteps(save, character.value.id) : [])
const hasPersonality = computed(() => character.value && [character.value.bio, character.value.style, character.value.likes, character.value.intro].some(Boolean))
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
  return vehicles.filter(v => save.cars[v.id] && !inTransit(save, v.id)).map(v => {
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
const pointsText = (value: number) => locale === 'fr' ? value.toFixed(1).replace('.', ',') : value.toFixed(1)
const rangeLabel = (value: number) => { const [low, high] = luckRange(value); return t('de {low} à {high} points', { low, high }) }
// Phrase de l'objectif du premier secteur, coupée autour de la statistique qui s'affiche en gras.
function goalParts(stat: StatKey) {
  const marker = '\u0001'
  const text = statArticle[stat] === 'l’' ? t('Ici, c’est l’{stat} qui compte : choisis ta voiture.', { stat: marker }) : t('Ici, c’est la {stat} qui compte : choisis ta voiture.', { stat: marker })
  const [before, after] = text.split(marker)
  return { before, after: after ?? '', stat: t(statLabels[stat]) }
}
// Même texte que constraintText, mais traduit.
function constraintLabel(rule: Parameters<typeof constraintText>[0]) {
  return rule.type === 'cost' ? t('Plafond de coût : {n}', { n: rule.cap })
    : rule.type === 'category' ? t('Au moins une voiture de catégorie {value}', { value: t(rule.value) })
      : t('Au moins une voiture de rareté {value}', { value: t(rule.value) })
}
// Score attendu avec sa part de hasard : « 7-9 », ou une seule valeur quand la forme du jour ne change rien.
const rangeText = (value: number) => { const [low, high] = luckRange(value); return low === high ? String(value) : `${low}-${high}` }

// De combien une voiture dépasserait le plafond de coût si on l'ajoutait à l'écurie (0 si elle est déjà choisie ou si elle tient).
const overBy = (id: string, price: number) => lineup.value.includes(id) ? 0 : Math.max(0, cost.value + price - cap.value)
function toggle(id: string) {
  act(() => {
    if (lineup.value.includes(id)) lineup.value = lineup.value.filter(x => x !== id)
    else if (inTransit(save, id)) return t('En transit')
    else if (lineup.value.length >= 3) return t('Retire d’abord une voiture')
    else if (overBy(id, vehicleById.get(id)?.cost ?? 0) > 0) return t('Cette voiture dépasse le plafond de coût')
    else lineup.value = [...lineup.value, id]
  })
  void nextTick(() => pop(`.lineup-slot:nth-child(${Math.max(1, lineup.value.indexOf(id) + 1)})`, 1.1))
}
const loadingRace = ref(false)
const loadingNextNight = ref(false)
let disposed = false
onUnmounted(() => { disposed = true })

function prepareRace(current: SoloDuel) {
  return waitForImages([
    ...current.conditions.map(trackBackdrop),
    ...current.player.lineup.flatMap(({ id }) => [carSprite(id), edition(id, save.cars[id]?.shown).art]),
    ...current.rival.lineup.flatMap(({ id }) => [carSprite(id), edition(id).art]),
  ])
}

async function start() {
  if (!rival.value || loadingRace.value) return
  if (!act(s => isNight.value ? startNight(s, nightSeed.value) : isDaily.value ? startDaily(s) : startDuel(s, rival.value!.id, Math.random))) return
  const current = save.duel
  if (!current) return
  loadingRace.value = true
  await prepareRace(current)
  if (disposed) return
  loadingRace.value = false
  if (save.duel !== current) return
  if (!isNight.value) tutorialAction(0, 4)
  picked.value = 0; nitro.value = false; stance.value = 'normal'; detail.value = null
  void scrollToStage()
  sound('rev'); streaks(palettes.cyan, 30); flash(tone.cyan, 0.2); buzz([20, 40, 60])
}

// ——— Course en cours ———
const duel = computed(() => save.duel)
const rivalRace = computed(() => !isDaily.value && !isNight.value)
const index = computed(() => duel.value?.rounds.length ?? 0)
const manualSector = computed(() => rivalRace.value
  ? sectorPilot(duel.value?.pilot, index.value) === 'manuel'
  : save.preferences.timingMode)
const rhythmTurns = computed(() => rivalRace.value ? duel.value?.pilot?.turn : save.preferences.turnMode)
const canSwitchPilot = computed(() => rivalRace.value && duel.value?.pilot?.mode === 'manuel'
  && manualSector.value && !duel.value.winner)
const pilotLabel = (mode: PilotMode | 'mixed') => mode === 'mixed' ? t('Manuel puis automatique')
  : mode === 'manuel' ? t('Manuel') : t('Automatique')
const roundPilot = (round: TimingRound): PilotMode => round.timing || round.direction ? 'manuel' : 'auto'
const pilotPreference = computed({
  get: () => save.preferences.pilotMode ?? 'auto',
  set: (mode: PilotMode) => { act(s => { s.preferences.pilotMode = mode }) },
})
const manualRun = shallowRef<{
  duel: SoloDuel; index: number; choice: Choice; rivalChoice: Choice; sequence?: TurnSequence
} | null>(null)
const pendingManual = computed(() => {
  const pending = manualRun.value, d = duel.value
  if (pending && pending.duel === d && pending.index === d.rounds.length && !d.winner) return pending
})
const manualStarted = ref(false)
const manualDiscovery = computed<ManualDiscovery | undefined>(() =>
  pendingManual.value && (pendingManual.value.sequence ? 'virages' : 'manuel'))
const manualLesson = computed(() => manualDiscovery.value && !save.tutorial.seen.includes(manualDiscovery.value))
const firstManual = computed(() => !duel.value?.rounds.some(round => roundPilot(round) === 'manuel'))
function acknowledgeManual() {
  const key = manualDiscovery.value
  if (!key || !manualLesson.value) return
  save.tutorial.seen.push(key)
  persist()
}
const timingWindows = computed(() => {
  const pending = pendingManual.value
  if (!pending || pending.sequence) return []
  const { duel: d, index, choice } = pending
  return Array.from({ length: shiftsPerSector[d.sectors[index]] }, (_, shift) =>
    soloTimingWindow(d, d.player.lineup[choice.car], shift))
})
const gauge = ref<InstanceType<typeof TimingGauge>>()
const liveFeedback = ref<ManualFeedback | null>(null)
const manualStreak = ref(0)
const flawless = ref(false)
const finishedTurns = shallowRef<TurnSequence>()
const finalGear = ref<HTMLElement>()
watch(duel, current => { manualStreak.value = current ? (raceStreaks.get(current) ?? 0) : 0 }, { immediate: true })
watch(finalGear, gear => { if (gear) pop(gear, 1.13, 220) }, { flush: 'post' })
function showJudgment(tag: string, grade: ManualGrade) {
  manualStreak.value = grade === 'perfect' ? manualStreak.value + 1 : 0
  liveFeedback.value = { tag: grade === 'perfect' ? t('Parfait !') : tag, grade, count: (liveFeedback.value?.count ?? 0) + 1 }
}
const picked = ref(0)
const nitro = ref(false)
// Consigne de pilotage du secteur : attaque, normal ou gestion.
const stance = ref<Stance>('normal')
const stanceHints: Record<Stance, string> = { gestion: t('−2 · 0 secteur'), normal: t('1 secteur'), attaque: t('+2 · 2 secteurs') }
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
  const reference = evaluate(d, selected.side, selected.car, false).score
  return {
    reference, timing: selected.side === 'player' && manualSector.value,
    car, remaining: car.uses - side.used[selected.car],
    stat: sectorStat[d.sectors[d.rounds.length]],
    range: luckRange(reference),
  }
})
const restoredRound = duel.value?.timingReview ? duel.value.rounds.at(-1) : undefined
const shown = ref<TimingRound | null>(restoredRound ?? null)
const reward = ref<Reward | null>(null)
// Résumé de la course affiché à l'arrivée : la course elle-même est effacée au règlement.
const recap = ref<{ sector: Sector; condition: Condition; winner: Round['winner']; player: string; rival: string; scores: [number, number]; pilot: PilotMode }[]>([])
const recapPilot = computed(() => {
  if (!recap.value.some(round => round.pilot === 'manuel')) return 'auto'
  return recap.value.some(round => round.pilot === 'auto') ? 'mixed' : 'manuel'
})

// Mise en scène d'un secteur : une mini-course joue le détail de score ligne par ligne, puis le verdict tombe.
// Tant qu'il n'est pas tombé, la piste et le tableau de score n'affichent pas encore ce secteur.
const settled = ref(true)
const step = ref(restoredRound ? Math.max(restoredRound.player.lines.length, restoredRound.rival.lines.length) + 1 : 0)
const STEP_MS = 560
const AUTOMATIC_START_MS = 320
const runCars = computed(() => shown.value
  ? { player: shown.value.player.car, rival: shown.value.rival.car }
  : pendingManual.value ? { player: pendingManual.value.choice.car, rival: pendingManual.value.rivalChoice.car } : null)
const runArts = computed(() => runCars.value
  ? { player: carArt('player', runCars.value.player), rival: carArt('rival', runCars.value.rival) } : {})
const runSprites = computed(() => runCars.value && duel.value ? {
  player: carSprite(duel.value.player.lineup[runCars.value.player].id),
  rival: carSprite(duel.value.rival.lineup[runCars.value.rival].id),
} : {})
// À scores égaux, l'Endurance des deux voitures départage : le verdict le dit.
const tieBreak = computed(() => {
  const round = shown.value, d = duel.value
  if (!round || !d || round.player.score !== round.rival.score) return ''
  const mine = d.player.lineup[round.player.car].stats.end, theirs = d.rival.lineup[round.rival.car].stats.end
  return round.winner === 'tie' ? t('Égalité à {score}, et même Endurance ({mine}) : personne ne marque.', { score: round.player.score, mine })
    : t('Égalité à {score} : l’Endurance départage, {mine} pour toi contre {theirs}.', { score: round.player.score, mine, theirs })
})
const counts = reactive({ player: restoredRound?.player.score ?? 0, rival: restoredRound?.rival.score ?? 0 })
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
  if (!reducedMotion.value) flawless.value = false
  finishedTurns.value = undefined
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
      if (luck === 'perfect') { floatText(at, t('Parfait !'), tone.gold, 20); sparks(at, palettes.gold, 36, 1.2); if (who === 'player') flash(tone.gold, 0.25) }
      if (luck === 'incident') { floatText(at, ruleText(round[who].lines.at(-1)!.label), tone.rose, 16); shake(2); if (who === 'player') buzz([40, 30, 40]) }
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
  if (!d || d.winner || pendingManual.value || shown.value) return
  const choice = { car: picked.value, nitro: nitro.value, stance: stance.value }
  liveFeedback.value = null
  flawless.value = false
  if (manualSector.value) {
    const opponent = rival.value
    const sequence = rhythmTurns.value && opponent && d.sectors[index.value] === 'virage'
      ? turnSequence(opponent.circuit.name, index.value, opponent.id) : undefined
    // La voiture adverse est choisie une fois et la manche reste transitoire jusqu’au dernier geste.
    manualStarted.value = false
    manualRun.value = { duel: d, index: index.value, choice, rivalChoice: aiChoice(d, 'rival', Math.random), sequence }
    void scrollToStage(false, true)
    return
  }
  showAutomaticRound(d, choice)
}

function showAutomaticRound(d: SoloDuel, choice: Choice) {
  const round = rivalRace.value ? playPilotRound(d, choice, Math.random) : playRound(d, choice, Math.random)
  if (d.pilot?.automaticFrom !== undefined) d.timingReview = true
  showRound(round)
}

function switchPilot() {
  const d = duel.value
  if (!canSwitchPilot.value || !d?.pilot) return
  const choice = pendingManual.value?.choice
  d.pilot = switchToAutomatic(d.pilot, index.value)
  manualRun.value = null
  liveFeedback.value = null
  if (choice && !shown.value) showAutomaticRound(d, choice)
  else {
    persist()
    void scrollToStage(Boolean(shown.value), true)
  }
}

function shift(results: TimingResult[]) {
  finishManual((pending) => playTimingRound(pending.duel, pending.choice, results, Math.random, pending.rivalChoice))
}

function steer(result: TurnResult) {
  finishManual((pending) => playTurnRound(pending.duel, pending.choice, result, Math.random, pending.rivalChoice))
}

function finishManual(resolve: (pending: NonNullable<typeof pendingManual.value>) => TimingRound) {
  const pending = pendingManual.value
  if (!pending || shown.value) return
  manualRun.value = null
  const round = rivalRace.value
    ? playPilotRound(pending.duel, pending.choice, Math.random, () => resolve(pending)) : resolve(pending)
  pending.duel.timingReview = true
  raceStreaks.set(pending.duel, manualStreak.value)
  flawless.value = Boolean(liveFeedback.value && manualStreak.value >= liveFeedback.value.count)
  showRound(round, true)
  // La dernière note termine son effet pendant la transition vers le score.
  if (pending.sequence && !reducedMotion.value) {
    finishedTurns.value = pending.sequence
    timers.push(setTimeout(() => { finishedTurns.value = undefined }, 260))
  }
}

function showRound(round: TimingRound, fromLive = false) {
  const d = duel.value!
  // Engager après la bulle de la nitro mène à la lecture du résultat ; les bulles 5 à 8 restent à lire avant.
  if (!isNight.value) tutorialAction(8, 9)
  shown.value = round
  detail.value = null
  nitro.value = false
  stance.value = 'normal'
  persist()
  clear()
  const celebrationDelay = flawless.value ? 290 : 0
  if (reducedMotion.value && !celebrationDelay) settle(round, round.player.nitro || round.rival.nitro)
  else {
    settled.value = false
    counts.player = counts.rival = 0
    step.value = 0
    if (reducedMotion.value) {
      timers.push(setTimeout(() => settle(round, round.player.nitro || round.rival.nitro), celebrationDelay))
    } else {
      sound('whoosh')
      const startDelay = fromLive ? celebrationDelay : AUTOMATIC_START_MS
      const firstNow = fromLive && !celebrationDelay
      if (firstNow) advance(round, 1)
      const steps = Math.max(round.player.lines.length, round.rival.lines.length)
      for (let k = firstNow ? 2 : 1; k <= steps; k++) {
        timers.push(setTimeout(() => {
          flawless.value = false
          advance(round, k)
        }, startDelay + (k - 1) * STEP_MS))
      }
      timers.push(setTimeout(() => settle(round), startDelay + steps * STEP_MS + 240))
    }
  }
  void scrollToStage(true)
  const free = d.player.lineup.findIndex((_, car) => !overheated(d.player, car))
  if (overheated(d.player, picked.value) && free >= 0) picked.value = free
}

function proceed() {
  const current = duel.value
  if (current?.timingReview) {
    delete current.timingReview
    if (!current.winner) persist()
  }
  shown.value = null
  void scrollToStage()
  if (duel.value?.winner) {
    const won = duel.value.winner === 'player'
    const d = duel.value
    recap.value = d.rounds.map(r => ({ pilot: roundPilot(r), sector: r.sector, condition: r.condition, winner: r.winner, scores: [r.player.score, r.rival.score],
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
const rivalReply = computed(() => reward.value?.perfect ? character.value?.perfect : lastWinner.value === 'player' ? character.value?.win : character.value?.lose)
async function nextNightRound() {
  if (loadingNextNight.value) return
  act(createNightRound)
  const current = save.duel
  if (!current) return
  loadingNextNight.value = true
  await prepareRace(current)
  if (disposed) return
  loadingNextNight.value = false
  if (save.duel !== current) return
  void scrollToStage()
  shown.value = null; picked.value = 0; nitro.value = false; detail.value = null
}
function cashNight(returnGarage = false) {
  nightEnd.value = finishNight(save) ?? null
  persist()
  if (nightEnd.value?.credits && returnGarage) sound('coin')
  if (returnGarage) { nightEnd.value = null; chosen.value = null; emit('go', 'garage') }
}
function abandon() {
  manualRun.value = null
  liveFeedback.value = null
  if (isNight.value) { clear(); shown.value = null; cashNight(); sound('lose'); return }

  act(s => { if (s.duel) { if (!s.duel.rivalId.startsWith('daily:')) { s.record[s.duel.rivalId] ??= { wins: 0, losses: 0, perfect: false }; s.record[s.duel.rivalId].losses++ }; s.duel = null } }, t('Course abandonnée'))
}
// Libellés courts pour la piste, qui doit tenir sur une ligne de cinq cases à 320 px.
const trackLabels = { depart: t('Départ'), virage: t('Virages'), ligne: t('Droite'), endurance: t('Endur.') } as const
const name = (id: string) => `${vehicleById.get(id)!.name}`
</script>

<template>
  <main ref="raceRoot" class="race" :class="{ 'daily-race': isDaily && !duel, 'night-race': isNight }">
    <section v-if="save.preferences.timingMode && rivalRace && !duel && !reward" class="race-pilot">
      <h2 id="race-pilot-title">{{ t('Pilotage') }}</h2>
      <div class="race-pilot-options" role="group" aria-labelledby="race-pilot-title" aria-describedby="race-pilot-help">
        <GvButton v-for="mode in (['auto', 'manuel'] as const)" :key="mode" variant="filter"
          :aria-pressed="pilotPreference === mode" @click="pilotPreference = mode">
          <span v-if="pilotPreference === mode" aria-hidden="true">✓</span>
          {{ pilotLabel(mode) }}
        </GvButton>
      </div>
      <small id="race-pilot-help">{{ t('En auto, le hasard joue sur ton score. En manuel, tu passes les vitesses et tu négocies les virages si tu les as activés.') }}</small>
    </section>
    <section v-if="nightEnd" class="race-end night-panel">
      <h1 tabindex="-1">{{ t('Nuit terminée') }}</h1>
      <p><span v-help="'nightRound'">{{ t('Manches gagnées :') }}</span> {{ nightEnd.wins }}</p>
      <p>{{ tp('{n} crédit versé', '{n} crédits versés', nightEnd.credits) }}</p>
      <p v-if="nightEnd.newRecord" v-help="'nightRecord'" role="status">{{ t('Nouveau record !') }}</p>
      <div class="race-actions"><button type="button" class="button primary wide" @click="nightEnd = null; chosen = null; emit('go', 'garage')">{{ t('Rentrer au garage') }}</button></div>
    </section>
    <section v-else-if="isNight && save.night && (save.night.resting || loadingNextNight)" class="race-end night-panel">
      <h1 tabindex="-1"><span v-help="'nightRound'">{{ t('Manche suivante :') }}</span> {{ save.night.round }}</h1>
      <p>{{ t(nightOpponent.circuit.name) }}</p>
      <p>{{ t(conditionLabels[Object.keys(nightOpponent.circuit.conditions)[0] as Condition]) }}</p>
      <p><span v-help="'nightGains'">{{ t('Gains accumulés :') }}</span> {{ tp('{n} crédit', '{n} crédits', save.night.gains) }}</p>
      <p v-if="save.night.newRecord" v-help="'nightRecord'" role="status">{{ t('Nouveau record !') }}</p>
      <p v-help="'nightRecord'">{{ tp('Record : {n} manche', 'Record : {n} manches', save.nightRecord) }}</p>
      <div class="recap-actions race-actions">
        <button type="button" class="button primary" :disabled="loadingNextNight" :aria-busy="loadingNextNight" @click="nextNightRound">{{ loadingNextNight ? t('Chargement des images…') : t('Manche suivante') }}</button>
        <button type="button" class="button quiet" :disabled="loadingNextNight" @click="cashNight(true)">{{ t('Rentrer au garage') }}</button>
      </div>
    </section>
    <!-- Résultat final -->
    <section v-else-if="reward" class="race-end" :class="lastWinner === 'player' ? 'won' : 'lost'">
      <span class="eyebrow">{{ t(rival?.circuit.name ?? '') }}</span>
      <h1 tabindex="-1">{{ reward.perfect ? t('Victoire parfaite') : lastWinner === 'player' ? t('Victoire !') : t('Pas cette fois.') }}</h1>
      <p v-if="rivalRace">{{ t('Pilotage : {mode}', { mode: pilotLabel(recapPilot) }) }}</p>
      <p v-if="reward.perfect" class="perfect-banner"><span aria-hidden="true">★</span> {{ t('Tu as gagné tous les secteurs !') }}</p>
      <blockquote v-if="rivalReply" class="rival-reply"><p>« {{ t(rivalReply) }} »</p><cite>{{ character?.name }}</cite></blockquote>
      <p v-if="isDaily && !reward.credits">{{ lastWinner === 'player' ? t('Défi déjà récompensé aujourd’hui.') : t('Retente le défi quand tu veux.') }}</p>
      <p v-else :aria-label="tp('+{n} crédit', '+{n} crédits', reward.credits)">{{ t('Crédits : +{n} au total', { n: rewardShown }) }}</p>
      <p v-if="reward.perfect">{{ t('Crédits de course : +{race} · bonus de victoire parfaite : +{bonus} crédits', { race: reward.credits / 2, bonus: reward.credits / 2 }) }}</p>
      <p v-if="reward.ticket">{{ t('Ticket de booster : +1 ticket {booster} · première victoire', { booster: t(boosterById.get(reward.ticket)?.name ?? '') }) }}</p>
      <p v-if="reward.perfectTicket">{{ t('Bonus de victoire parfaite : +1 ticket de booster {booster}', { booster: t(boosterById.get(reward.perfectTicket)?.name ?? '') }) }}</p>
      <p v-if="reward.car" class="perfect-banner">{{ t('Voiture gagnée : {car} rejoint ton garage !', { car: `${vehicleById.get(reward.car)?.name} ${vehicleById.get(reward.car)?.version}` }) }}</p>
      <ol v-if="recap.length" class="race-recap" :aria-label="t('Résumé des secteurs')">
        <li v-for="(r, i) in recap" :key="i" :class="r.winner" :style="{ '--i': i }">
          <span class="recap-sector"><span aria-hidden="true">{{ sectorIcons[r.sector] }} {{ conditionIcons[r.condition] }}</span><span class="visually-hidden">{{ t('{sector}, {condition} :', { sector: t(sectorLabels[r.sector]), condition: t(conditionLabels[r.condition]) }) }} </span></span>
          <span class="recap-car">{{ r.player }}</span><b>{{ r.scores[0] }} – {{ r.scores[1] }}</b>
          <small v-if="rivalRace" class="recap-pilot">{{ pilotLabel(r.pilot) }}</small>
          <span class="recap-car">{{ r.rival }}</span>
        </li>
      </ol>
      <div class="recap-actions race-actions">
        <button type="button" class="button primary" @click="reward = null; chosen = null">{{ t('Rivaux') }} <span aria-hidden="true">⟶</span></button>
        <button type="button" class="button quiet" @click="emit('go', reward?.ticket || reward?.perfectTicket ? 'shop' : 'garage')">{{ reward.ticket || reward.perfectTicket ? t('Ouvrir les tickets') : t('Préparer au garage') }}</button>
      </div>
    </section>

    <!-- Duel en cours -->
    <template v-else-if="duel && rival && !loadingRace">
      <div class="race-head">
        <img v-if="art.rival(rival.id)" :src="art.rival(rival.id)" alt="" class="rival-face" />
        <span v-else class="rival-face" aria-hidden="true">{{ rival.name[0] }}</span>
        <div><span class="eyebrow">{{ t(rival.circuit.name) }}</span><h1 tabindex="-1"><span v-if="isNight" v-help="'nightRound'">{{ rival.name }}</span><template v-else>{{ rival.name }}</template></h1></div>
        <div class="scoreboard" :aria-label="t('Score')"><b :key="`p${points.player}`">{{ points.player }}</b><span>—</span><b :key="`r${points.rival}`">{{ points.rival }}</b></div>
      </div>
      <ol class="track">
        <li v-for="(sector, i) in duel.sectors" :key="i" :style="{ '--i': i }" :class="{ current: i === trackIndex, done: i < trackIndex,
          win: i < trackIndex && duel.rounds[i]?.winner === 'player', loss: i < trackIndex && duel.rounds[i]?.winner === 'rival' }">
          <span class="track-icon" aria-hidden="true">{{ sectorIcons[sector] }}</span>
          <span class="track-name" :title="t(sectorLabels[sector])">{{ trackLabels[sector] }}</span>
          <span class="track-cond">{{ known(i) ? `${conditionIcons[duel.conditions[i]]} ${t(conditionLabels[duel.conditions[i]])}` : t('? Inconnu') }}</span>
        </li>
      </ol>

      <GvButton v-if="canSwitchPilot" variant="filter" class="pilot-switch" @click="switchPilot">
        {{ t('Passer en automatique pour la suite') }}
      </GvButton>

      <section v-if="shown || pendingManual" class="round-result" :class="[shown && settled ? shown.winner : 'pending', { 'manual-stage': pendingManual }]">
        <template v-if="shown">
          <p v-if="rivalRace && settled">{{ t('Pilotage : {mode}', { mode: pilotLabel(roundPilot(shown)) }) }}</p>
          <h2 v-if="settled" class="verdict">{{ shown.winner === 'player' ? t('Secteur gagné') : shown.winner === 'rival' ? t('Secteur perdu') : t('Égalité parfaite') }}</h2>
          <h2 v-else>{{ t(sectorLabels[shown.sector]) }} · {{ t(conditionLabels[shown.condition]) }}</h2>
        </template>
        <h2 v-else>{{ t(sectorLabels[duel.sectors[index]]) }} · {{ t(conditionLabels[duel.conditions[index]]) }}</h2>
        <aside v-if="manualLesson" class="mechanic-guide manual-lesson" role="region" aria-live="polite" :aria-label="t('Le mécano')">
          <strong>{{ t('Le mécano') }}</strong>
          <template v-if="pendingManual?.sequence">
            <p>{{ t('Les flèches descendent vers la cible : appuie sur le bon côté quand la flèche y arrive.') }}</p>
            <small class="manual-key-hint">{{ t('Au clavier, utilise les flèches ← et →.') }}</small>
          </template>
          <template v-else>
            <p>{{ t('Touche Passer la vitesse quand l’aiguille est dans le vert. Parfait au centre, raté dans le rouge. Plusieurs rapports par secteur.') }}</p>
            <small class="manual-key-hint">{{ t('Au clavier, utilise la barre d’espace.') }}</small>
          </template>
          <div class="mechanic-actions"><button type="button" @click="acknowledgeManual">{{ t('C’est parti') }}</button></div>
        </aside>
        <SectorRun v-else-if="pendingManual || shown?.timing || shown?.direction" :waiting="Boolean(pendingManual && !manualStarted)" :round="shown" :step="step"
          :live="pendingManual ? duel.conditions[index] : undefined" :running="Boolean(shown && !settled)"
          :arts="runArts" :sprites="runSprites" :backdrop="trackBackdrop(shown?.condition ?? duel.conditions[index])"
          :feedback="liveFeedback" :streak="manualStreak" :flawless="flawless" :keep-controls="Boolean(finishedTurns)" :tappable="Boolean(timingWindows.length)" @tap="gauge?.tapScene($event)" @skip="skipRun">
          <template #overlay>
            <ManualCountdown v-if="pendingManual" :full="firstManual" @go="manualStarted = true" />
            <span ref="finalGear" v-if="shown?.shifts && liveFeedback && (step <= 1 || reducedMotion)" class="final-gear">
              {{ t('Rapport {n}/{total}', { n: shown.shifts.length + 1, total: shown.shifts.length + 1 }) }}
            </span>
          </template>
          <TurnControl v-if="pendingManual?.sequence || finishedTurns" :sequence="(pendingManual?.sequence ?? finishedTurns)!" :waiting="!manualStarted" @turn="steer"
            @judgment="result => showJudgment(turnFeedback(result.outcome), turnGrade[result.outcome])" />
          <TimingGauge v-else-if="timingWindows.length" ref="gauge" :windows="timingWindows" :waiting="!manualStarted" @finish="shift"
            @judgment="result => showJudgment(timingFeedback(result.zone), shiftGrade[result.zone])" />
        </SectorRun>
        <template v-if="shown">
          <p v-if="shown.timing && !shown.shifts?.length" role="status">{{ t('Référence {base} · Timing {zone} ({modifier}) = {total}', {
            base: shown.player.score - shown.timing.modifier, zone: timingFeedback(shown.timing.zone),
            modifier: signedTiming(shown.timing.modifier), total: shown.player.score,
          }) }}</p>
          <template v-if="shown.direction && 'parfait' in shown.direction">
            <p>{{ t('Direction · {summary}', { summary: turnSummary(shown.direction) }) }}</p>
            <p role="status">{{ t('Score de base {base} + Direction ({modifier}) = {total}', {
              base: shown.player.score - shown.direction.modifier, modifier: signedTiming(shown.direction.modifier),
              total: shown.player.score,
            }) }}</p>
          </template>
          <p v-else-if="shown.direction" role="status">{{ t('Score de base {base} · Direction {outcome} ({modifier}) = {total}', {
            base: shown.player.score - shown.direction.modifier, outcome: shown.direction.outcome === 'bien' ? t('Bien placé') : turnFeedback(shown.direction.outcome),
            modifier: signedTiming(shown.direction.modifier), total: shown.player.score,
          }) }}</p>
          <SectorRun v-if="!shown.timing && !shown.direction" :round="shown" :step="step" :running="!settled" :arts="runArts" :sprites="runSprites" :backdrop="trackBackdrop(shown.condition)" @skip="skipRun" />
          <p v-if="settled && tieBreak" class="tie-note">{{ tieBreak }}</p>
          <div class="duel-columns">
            <div v-for="who in (['player', 'rival'] as const)" :key="who" class="duel-col"
              :class="[who, { winner: settled && shown.winner === who, loser: settled && shown.winner !== who && shown.winner !== 'tie', boosted: shown[who].nitro }]">
              <span class="duel-who">{{ who === 'player' ? t('Toi') : rival.name }} <span v-if="shown[who].nitro" class="clash-nitro">{{ t('Nitro') }}</span></span>
              <strong>{{ name(duel[who].lineup[shown[who].car].id) }}</strong>
              <span class="duel-score" :aria-label="tp('{n} point', '{n} points', shown[who].score)">{{ counts[who] }}</span>
              <ul v-if="settled"><li v-for="(l, i) in shown[who].lines" :key="i" :style="{ '--i': i }"><span v-help="helpForLine(l.label)">{{ l.label === 'Timing du passage' ? timingSummary(shown.shifts) : l.label === 'Direction' ? t('Direction') : ruleText(l.label) }}</span><b>{{ l.value > 0 ? '+' : '' }}{{ l.value }}</b></li></ul>
            </div>
          </div>
          <div v-if="settled" class="race-actions"><button type="button" class="button primary wide" @click="proceed">{{ duel.winner ? t('Voir le résultat') : t('Secteur suivant') }} <span aria-hidden="true">⟶</span></button></div>
        </template>
        <button v-else type="button" class="button quiet wide" @click="abandon">{{ t('Abandonner') }}</button>
      </section>

      <section v-else-if="duel.winner" class="round-result">
        <h2>{{ t('Course terminée · {a} – {b}', { a: duel.player.points, b: duel.rival.points }) }}</h2>
        <div class="race-actions"><button type="button" class="button primary wide" @click="proceed">{{ t('Voir le résultat') }} <span aria-hidden="true">⟶</span></button></div>
      </section>

      <section v-else class="engage">
        <p v-if="index === 0" class="engage-goal">{{ t('Le plus gros score gagne le secteur. Remporte le plus de secteurs sur {n}.', { n: duel.sectors.length }) }} {{ goalParts(sectorStat[duel.sectors[index]]).before }}<b>{{ goalParts(sectorStat[duel.sectors[index]]).stat }}</b>{{ goalParts(sectorStat[duel.sectors[index]]).after }}</p>
        <p class="engage-brief">{{ t('Secteur {n}/{total}', { n: index + 1, total: duel.sectors.length }) }} · <b v-help="duel.sectors[index]">{{ t(sectorLabels[duel.sectors[index]]) }}</b> (<span v-help="sectorStat[duel.sectors[index]]">{{ t(statLabels[sectorStat[duel.sectors[index]]]) }}</span>)
          · <span v-help="duel.conditions[index]">{{ conditionIcons[duel.conditions[index]] }} {{ t(conditionLabels[duel.conditions[index]]) }}</span></p>
        <h2 class="engage-rival-title">{{ isNight ? t('Voitures adverses · {name}', { name: rival.name }) : t('Voitures de {name}', { name: rival.name }) }} <small>{{ t('Nitro ×{n}', { n: duel.rival.nitro }) }}</small></h2>
        <div class="engage-cars engage-rivals" :aria-label="t('Écurie adverse')">
          <button v-for="(r, car) in duel.rival.lineup" :key="car" type="button"
            class="engage-car engage-rival" :class="{ hot: overheated(duel.rival, car) }"
            :aria-label="t('Voiture adverse : {name}, {range}', { name: r.vehicle.name, range: rangeLabel(rivalProjections[car]) })" aria-controls="engage-detail"
            @click="detail = { side: 'rival', car }">
            <img v-if="carArt('rival', car)" :src="carArt('rival', car)" alt="" />
            <span class="engage-name">{{ r.vehicle.name }}</span>
            <span class="engage-score" :aria-label="rangeLabel(rivalProjections[car])">{{ rangeText(rivalProjections[car]) }}</span>
            <span class="engage-uses">{{ tp('{n} secteur', '{n} secteurs', r.uses - duel.rival.used[car]) }}</span>
            <span v-if="overheated(duel.rival, car)" class="engage-heat">{{ t('Surchauffe −3') }}</span>
          </button>
        </div>
        <div class="engage-cars" role="radiogroup" :aria-label="t('Voiture engagée')">
          <button v-for="(r, car) in duel.player.lineup" :key="car" type="button" role="radio" :aria-checked="picked === car"
            aria-controls="engage-detail" class="engage-car" :class="{ hot: overheated(duel.player, car) }" @click="pick(car, $event)">
            <img v-if="edition(r.id, save.cars[r.id]?.shown).art" :src="edition(r.id, save.cars[r.id]?.shown).art" alt="" />
            <span class="engage-name">{{ r.vehicle.name }}</span>
            <span v-if="manualSector" class="engage-score">{{ projections[car] }}</span>
            <span v-else :key="projections[car]" class="engage-score" :aria-label="rangeLabel(projections[car])">{{ rangeText(projections[car]) }}</span>
            <span class="engage-uses">{{ overheated(duel.player, car) ? t('Surchauffe −3') : tp('{n} secteur', '{n} secteurs', r.uses - duel.player.used[car]) }}</span>
          </button>
        </div>
        <section v-if="carDetail" id="engage-detail" class="engage-detail" aria-labelledby="engage-detail-title">
          <h2 id="engage-detail-title">{{ carDetail.car.vehicle.name }}</h2>
          <dl class="engage-stats">
            <div v-for="stat in (['acc', 'vit', 'man', 'end'] as const)" :key="stat"
              :class="{ 'sector-stat': stat === carDetail.stat }" :aria-current="stat === carDetail.stat ? 'true' : undefined">
              <dt><span v-help="stat">{{ t(statLabels[stat]) }}</span><small v-if="stat === carDetail.stat"> · {{ t('secteur en cours') }}</small></dt>
              <dd>{{ carDetail.car.stats[stat] }}</dd>
            </div>
          </dl>
          <p><span v-help="'secteurs'">{{ t('Secteurs restants :') }}</span> {{ carDetail.remaining }}</p>
          <p v-if="carDetail.timing">{{ t('Score de référence estimé sans nitro : {n}', { n: carDetail.reference }) }}</p>
          <p v-else><span v-help="'forme'">{{ t('Fourchette de score') }}</span> {{ t('sur ce secteur :') }} <strong>{{ carDetail.range[0] }}–{{ carDetail.range[1] }}</strong> {{ t('points · sans nitro') }}</p>
        </section>
        <p v-if="manualSector" class="engage-hint">{{ rhythmTurns && duel.sectors[index] === 'virage' ? t('Ton score estimé est affiché avant le virage.') : t('Ton score estimé est affiché avant le passage de vitesse.') }}</p>
        <p v-else class="engage-hint">{{ t('Sous chaque voiture :') }} <span v-help="'forme'">{{ t('fourchette de score') }}</span> {{ t('et') }} <span v-help="'secteurs'">{{ t('secteurs restants') }}</span>.</p>
        <!-- Toujours à portée de pouce : la nitro et le bouton restent collés au bas de l'écran. -->
        <div class="engage-actions race-actions">
          <div class="stance-toggle" :class="{ set: stance !== 'normal' }" role="radiogroup" :aria-label="t('Consigne de pilotage')">
            <span v-help="'consigne'">{{ t('Consigne') }}</span>
            <button v-for="key in (['gestion', 'normal', 'attaque'] as const)" :key="key" type="button" role="radio" :class="key"
              :aria-checked="stance === key" :disabled="stanceBlocked(key)" @click="setStance(key)">
              <b>{{ t(stances[key].label) }}</b><small>{{ stanceHints[key] }}</small>
            </button>
          </div>
          <label class="nitro-toggle" :class="{ off: !duel.player.nitro, armed: nitro }">
            <input v-model="nitro" type="checkbox" :disabled="!duel.player.nitro" @change="armNitro" />
            <span><span v-help="'nitro'">{{ t('Nitro') }}</span> <small>{{ tp('{n} charge · +2', '{n} charges · +2', duel.player.nitro) }}</small></span>
          </label>
          <button type="button" class="button primary" :class="{ 'nitro-armed': nitro }" @click="engage">{{ t('Engager') }} <span class="engage-pick">{{ duel.player.lineup[picked].vehicle.name }}</span> <span aria-hidden="true">⟶</span></button>
        </div>
        <button type="button" class="button quiet wide" @click="abandon">{{ t('Abandonner') }}</button>
      </section>
    </template>

    <!-- Constitution de l'écurie -->
    <template v-else-if="rival && league">
      <!-- Sur ordinateur, deux colonnes : le briefing à gauche, l'écurie et le garage à droite. Sur téléphone, les groupes s'effacent. -->
      <div class="race-prep">
      <div class="race-prep-brief">
      <div class="page-heading">
        <button type="button" class="back-link" :disabled="loadingRace" @click="chosen = null"><span aria-hidden="true">←</span> {{ t('Rivaux') }}</button>
        <span v-if="!isNight" class="eyebrow">{{ t('{league} · plafond {cap}', { league: t(league.name ?? ''), cap }) }}</span>
        <h1 v-if="isNight" tabindex="-1"><span v-help="'endless'">{{ t('Nuit sans fin') }}</span></h1>
        <h1 v-else tabindex="-1">{{ t(rival.circuit.name) }}</h1>
        <p v-if="!isNight">{{ t('Contre {name}', { name: rival.name }) }}</p>
        <template v-else>
          <p>{{ t('Enchaîne les courses contre des adversaires de plus en plus forts : ta nuit s’arrête à la première défaite.') }}</p>
          <p v-help="'nightRecord'">{{ tp('Record : {n} manche', 'Record : {n} manches', save.nightRecord) }}</p>
          <p v-help="'nightCap'">{{ t('Plafond de coût : {n}', { n: NIGHT_CAP }) }}</p>
        </template>
        <p v-if="special">{{ tp('{n} crédit', '{n} crédits', (save.record[rival.id]?.wins ? rival.replay : rival.reward) ?? 0) }} · {{ save.record[rival.id]?.wins ? t('rejeu') : t('première victoire (doublés si parfaite)') }}<template v-if="rival.completionTicket && !save.record[rival.id]?.wins"> · {{ t('un ticket à la première victoire') }}</template></p>
      </div>
      <section v-if="hasPersonality && character" class="rival-character" :aria-label="t('Portrait de {name}', { name: character.name })">
        <img v-if="art.rival(character.id)" :src="art.rival(character.id)" alt="" class="rival-face" />
        <div class="rival-character-text">
          <p class="rival-character-title">{{ t(character.title) }} <span v-if="character.style" class="rival-style">{{ t(character.style) }}</span></p>
          <p v-if="character.likes">{{ t('Aime {likes}', { likes: t(character.likes) }) }}</p>
          <blockquote v-if="character.intro">« {{ t(character.intro) }} »</blockquote>
        </div>
      </section>
      <section v-if="rivalStepList.length" class="rival-steps-box" :aria-label="t('Étapes du rival')">
        <div class="rival-steps-tabs">
          <GvButton v-for="stepItem in rivalStepList" :key="stepItem.id" variant="filter"
            :aria-pressed="chosen === stepItem.id"
            :disabled="!unlockedSteps.includes(stepItem.id)"
            @click="chosen = stepItem.id">
            <span aria-hidden="true">{{ !unlockedSteps.includes(stepItem.id) ? '🔒' : save.record[stepItem.id]?.wins ? '✓' : '◆' }}</span>
            <span>{{ t(stepItem.stepLabel ?? '') }}</span>
          </GvButton>
        </div>
        <p class="hint">
          {{ tp('Récompense : {n} crédit', 'Récompense : {n} crédits', (save.record[rival.id]?.wins ? rival.replay : rival.reward) ?? 0) }}<template v-if="rival.completionTicket && !save.record[rival.id]?.wins"> + {{ t('1 ticket {booster}', { booster: t(boosterById.get(rival.completionTicket)?.name ?? '') }) }}</template><template v-if="rival.rewardCar && !save.record[rival.id]?.wins && !save.cars[rival.rewardCar]"> + {{ vehicleById.get(rival.rewardCar)?.name }} {{ vehicleById.get(rival.rewardCar)?.version }}</template>
        </p>
      </section>
      <section v-if="isDaily" class="daily-panel"><h2>{{ t('Contrainte') }}</h2><p>{{ constraintLabel(challenge.constraint) }}</p><p>{{ tp('{n} crédit à la première victoire du jour.', '{n} crédits à la première victoire du jour.', challenge.reward) }}</p></section>
      <div class="cap-meter" :class="{ over: cost > cap }">
        <span v-help="isNight ? 'nightCap' : 'plafond'">{{ t('Coût d’écurie') }}</span><div><span :style="{ width: `${Math.min(100, cost / cap * 100)}%` }"></span></div><b>{{ cost }}/{{ cap }}</b>
      </div>
      <div class="race-actions"><button type="button" class="button primary wide race-launch" :disabled="loadingRace || Boolean(problem)" :aria-busy="loadingRace" @click="start">{{ loadingRace ? t('Chargement des images…') : isNight ? t('Commencer la nuit') : isDaily ? (problem ? t('Lancer le défi · {problem}', { problem: t(problem) }) : t('Lancer le défi')) : problem === undefined ? t('Lancer la course') : t(problem) }} <span v-if="!loadingRace && !problem && !isNight" aria-hidden="true">⟶</span></button></div>
      <p v-if="isNight && problem" class="hint" role="status">{{ t(problem) }}</p>
      <section class="race-briefing" aria-labelledby="briefing-title">
        <div class="section-row"><h2 id="briefing-title">{{ t('Préparer ta course') }}</h2><span v-if="!isNight && !isDaily && rival.league === 'neon'" class="race-intro-badge">{{ t('Accessible d’origine') }}</span></div>
        <p v-if="isNight">{{ t(rival.circuit.name) }}</p>
        <ol class="race-sector-order" :aria-label="t('Ordre des secteurs')">
          <li v-for="(sector, i) in rival.circuit.sectors" :key="i"><span aria-hidden="true">{{ sectorIcons[sector] }}</span><span v-help="sector">{{ t(sectorLabels[sector]) }}</span></li>
        </ol>
        <div class="race-conditions" :aria-label="t('Conditions possibles')">
          <span v-for="c in conditions" :key="c.key"><span aria-hidden="true">{{ conditionIcons[c.key] }}</span> <span v-help="c.key">{{ t(conditionLabels[c.key]) }}</span> {{ t('{n} %', { n: c.chance }) }}</span>
        </div>
        <ul class="race-priorities">
          <li v-for="p in recommendedCars" :key="p.sector">
            <div><b v-help="p.stat">{{ t(statLabels[p.stat]) }}</b><small>{{ tp('{n} secteur', '{n} secteurs', p.times) }} · {{ t(sectorLabels[p.sector]) }}</small></div>
            <button v-if="p.best" class="race-prepare" type="button" :aria-label="t('Préparer {name} · {stat}', { name: p.best.name, stat: t(statLabels[p.stat]) })"
              @click="emit('inspect', 'car', p.best.id, rival.circuit, p.stat)">
              <b>{{ p.best.name }}</b><small>{{ t('{n} pts estimés', { n: pointsText(p.best.score) }) }} <span aria-hidden="true">↗</span></small>
            </button>
          </li>
        </ul>
        <p v-if="lineup.length" class="hint">{{ t('Scores moyens estimés selon le terrain, hors nitro et bonus liés à l’adversaire ou à l’écurie. Touche une voiture pour ouvrir l’atelier.') }}</p>
      </section>
      </div>
      <div class="race-prep-pick">
      <div class="lineup-slots">
        <button v-for="n in 3" :key="n" type="button" class="lineup-slot" :disabled="!lineup[n - 1]" @click="emit('inspect', 'car', lineup[n - 1], rival.circuit)">
          <CarCard v-if="lineup[n - 1]" :id="lineup[n - 1]" :style-name="save.cars[lineup[n - 1]]?.shown" :prep="prepOf(save, lineup[n - 1])" compact />
          <span v-else class="slot-placeholder">{{ t('Place {n}', { n }) }}</span>
        </button>
      </div>
      <p class="rival-preview">{{ t('Écurie adverse · {cars}', { cars: rivalLineup(rival).map(e => name(e.id)).join(' · ') }) }}</p>

      <h2 class="list-title">{{ t('Ton garage') }}</h2>
      <ul class="pick-list">
        <li v-for="{ v, car, scores } in garageCars" :key="v.id">
          <button type="button" :aria-pressed="lineup.includes(v.id)" :disabled="loadingRace || overBy(v.id, v.cost) > 0" @click="toggle(v.id)">
            <span class="pick-cost" :data-cost="v.cost">{{ v.cost }}</span>
            <span class="pick-name"><b><span v-if="save.cars[v.id].favorite" :aria-label="t('Favori')">★ </span>{{ v.name }}</b><small>{{ overBy(v.id, v.cost) > 0 ? t('Dépasse le plafond de {n}', { n: overBy(v.id, v.cost) }) : tp('{version} · {n} secteur avant surchauffe', '{version} · {n} secteurs avant surchauffe', car.uses, { version: v.version }) }}</small></span>
            <span class="pick-stats"><span v-for="s in scores.filter(s => s.times === priorities[0]?.times)" :key="s.stat">{{ t('{label} {n} pts', { label: t(s.label), n: pointsText(s.average) }) }}</span></span>
          </button>
        </li>
      </ul>
      </div>
      </div>
    </template>

    <!-- Échelle des rivaux -->
    <template v-else>
      <div class="page-heading">
        <span class="eyebrow"><span></span> {{ t('Course en secteurs') }}</span>
        <h1 tabindex="-1">{{ t('Rivaux de la nuit') }}</h1>
        <p>{{ t('Engage une voiture par secteur, en secret. Chaque voiture court un nombre limité de secteurs selon son Endurance.') }}</p>
      </div>
      <ul class="rival-list">
        <li v-for="(r, i) in rivals" :key="r.id" class="deal" :style="{ '--i': i }">
          <button type="button" class="rival-row" :disabled="!unlocked.includes(r.id)" @click="chosen = currentRivalStep(save, r.id)">
            <img v-if="art.rival(r.id)" :src="art.rival(r.id)" alt="" />
            <span v-else class="rival-initial" aria-hidden="true">{{ r.name[0] }}</span>
            <span class="rival-info">
              <b>{{ r.name }} <span v-if="save.record[r.id]?.perfect" class="perfect-star" role="img" :aria-label="t('Victoire parfaite obtenue')">★</span></b>
              <small>{{ t(r.title) }}<template v-if="r.style"> · {{ t(r.style) }}</template> · {{ t(leagueById.get(r.league)!.name) }} ({{ t('plafond {n}', { n: leagueById.get(r.league)!.cap }) }})</small>
              <small>{{ t('3 étapes · finale : {n} ₡ + ticket {booster}', { n: leagueById.get(r.league)!.reward, booster: t(boosterById.get(leagueById.get(r.league)!.ticket)?.name ?? '') }) }}<template v-if="r.rewardCar"> + {{ vehicleById.get(r.rewardCar)?.name }}</template></small>
            </span>
            <span class="rival-status">{{ !unlocked.includes(r.id) ? t('Verrouillé') : save.record[r.id]?.wins ? tp('✓ 3/3 ({n} vict.)', '✓ 3/3 ({n} vict.)', save.record[r.id].wins) : t('Étape {n}/3', { n: rivalStepsDone(save, r.id) + 1 }) }}</span>
          </button>
        </li>
        <li class="deal" :style="{ '--i': 0 }">
          <button type="button" class="rival-row night-entry" @click="nightSeed = String(Date.now()); chosen = 'night'">
            <span class="rival-initial" aria-hidden="true">∞</span>
            <span class="rival-info"><b>{{ t('Nuit sans fin') }}</b><small>{{ tp('Record : {n} manche', 'Record : {n} manches', save.nightRecord) }}</small></span>
            <span class="rival-status">{{ t('Commencer') }}</span>
          </button>
        </li>
      </ul>
      <section class="specials">
        <h2 v-help="'special'">{{ t('Spéciales') }}</h2>
        <p v-if="!specialsOpen(save)" v-help="'specialUnlock'">{{ t('Bats toute la Ligue Néon pour les ouvrir.') }}</p>
        <div class="special-grid">
          <article v-for="(s, i) in specials" :key="s.id" class="special-card" :style="{ '--i': i }">
            <span class="special-sector" aria-hidden="true">{{ sectorIcons[s.sector] }}</span><span class="visually-hidden">{{ t(sectorLabels[s.sector]) }}</span>
            <h3>{{ t(s.name) }} · {{ s.tiers.filter(r => save.record[r.id]?.wins).length }}/{{ s.tiers.length }}</h3>
            <ol class="special-tiers" :aria-label="t('Paliers de la spéciale')">
              <li v-for="(r, tier) in s.tiers" :key="r.id" :class="`special-tier-${tier}`">
                <GvButton variant="filter" tone="var(--tier-tone)" :class="{ 'tier-won': save.record[r.id]?.wins }"
                  :aria-current="unlockedSpecials(save).includes(r.id) && !save.record[r.id]?.wins ? 'step' : undefined"
                  :disabled="!unlockedSpecials(save).includes(r.id)" @click="chosen = r.id">
                  <span aria-hidden="true">{{ !unlockedSpecials(save).includes(r.id) ? '🔒' : save.record[r.id]?.wins ? '✓' : '◆' }}</span>
                  <span v-help="'specialTier'">{{ t(r.title) }}</span>
                  <small :aria-label="tp('{n} crédit', '{n} crédits', (save.record[r.id]?.wins ? r.replay : r.reward) ?? 0)">₡ {{ save.record[r.id]?.wins ? r.replay : r.reward }}</small>
                </GvButton>
              </li>
            </ol>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.final-gear {
  position: absolute; inset: 6px auto auto 8px; padding: 2px 7px; border-radius: 4px;
  background: var(--panel); color: var(--text); font-size: .75rem; font-weight: 700;
}
.race-recap .recap-pilot { grid-column: 1 / -1; grid-row: 2; color: var(--muted); }
</style>
