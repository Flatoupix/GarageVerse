<script setup lang="ts">
import { inTransit } from '../game/trade'
import { computed, nextTick, onMounted, onUnmounted, onUpdated, reactive, ref, shallowRef, watch } from 'vue'
import { locale, t, tp } from '../i18n'
import { ruleText } from '../game/rules-text'
import { NIGHT_CAP, nightRival } from '../game/endless'
import { createNightRound, finishNight, nightLineupCheck, setNightPilot, settleNight, startNight } from '../game/save'
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
import { currentRivalStep, perfectSteps, rivalStepsDone, specialsOpen, unlockedRivalSteps, unlockedSpecials, dailyLineupCheck, startDaily, todayChallenge, lineupCheck, prepOf, settleDuel, startDuel, unlockedRivals, type ManualDiscovery, type Reward } from '../game/save'
import { act, dailySelected, buzz, persist, reducedMotion, save, sound } from '../game/store'
import { playTimingRound, playTurnRound, shiftsPerSector, soloTimingWindow, type SoloDuel, type TimingResult, type TimingRound } from '../game/timing'
import { pilotSummary, playPilotRound, roundPilot, sectorPilot, switchToAutomatic, type PilotMode, type PilotSummary } from '../game/pilot'
import { perfectStepsText } from '../game/perfect-steps-text'
import { signedTiming, timingFeedback, timingSummary } from '../game/timing-text'
import { tutorialAction } from '../game/tutorial'
import CarCard from '../components/CarCard.vue'
import GvButton from '../components/GvButton.vue'
import PilotPicker from '../components/PilotPicker.vue'
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

const emit = defineEmits<{ inspect: [kind: 'car' | 'part', id: string, circuit?: Rival['circuit'], suggestedStat?: StatKey, showWorkshop?: boolean]; go: [screen: 'garage' | 'shop'] }>()
const chosen = ref<string | null>(save.duel?.rivalId ?? (save.night ? 'night' : null) ?? (dailySelected.value ? `daily:${save.daily.date}` : null))
dailySelected.value = false
watch(chosen, (next, previous) => {
  if (!next || previous || save.duel) return
  window.scrollTo({ top: 0, behavior: 'instant' })
  raceRoot.value?.querySelector<HTMLElement>('.race-prep h1')?.focus({ preventScroll: true })
}, { flush: 'post' })
const challenge = computed(() => todayChallenge(save, chosen.value?.startsWith('daily:') ? chosen.value.slice(6) : save.daily.date))
const isNight = computed(() => chosen.value?.startsWith('night'))
const nightSeed = ref(String(Date.now()))
const nightOpponent = computed(() => nightRival(save.night?.seed ?? nightSeed.value, save.night?.round ?? 1))
const nightEnd = ref<{ wins: number; credits: number; newRecord: boolean; pilot?: PilotSummary } | null>(null)
const isDaily = computed(() => chosen.value?.startsWith('daily:'))
const rival = computed(() => isNight.value ? nightOpponent.value : isDaily.value ? challenge.value.rival : chosen.value ? rivalById.get(chosen.value) : undefined)
const special = computed(() => chosen.value ? specialByRivalId.get(chosen.value) : undefined)
// Seuls les rivaux de ligue portent une personnalité, même si un autre mode réutilise leur identifiant.
const character = computed(() => !isNight.value && !isDaily.value && !special.value ? rivals.find(r => r.id === (rival.value?.baseRivalId ?? chosen.value)) : undefined)
const rivalStepList = computed(() => {
  if (!character.value) return []
  const id = character.value.id
  const unlockedSteps = unlockedRivalSteps(save, id)
  const perfect = perfectSteps(save, id)
  return (rivalStepMap.get(id) ?? []).map((step, i) => ({
    id: step.id,
    stepLabel: step.stepLabel,
    unlocked: unlockedSteps.includes(step.id),
    won: (save.record[step.id]?.wins ?? 0) > 0,
    perfect: perfect[i],
  }))
})
const rivalProgress = computed(() => rivals.map(r => ({ r, perfect: perfectStepsText(save, r.id) })))
const hasPersonality = computed(() => character.value && [character.value.bio, character.value.style, character.value.likes, character.value.intro].some(Boolean))
const league = computed(() => rival.value?.cap !== undefined ? { name: special.value?.name, cap: rival.value.cap } : rival.value ? leagueById.get(rival.value.league) : undefined)
const unlocked = computed(() => unlockedRivals(save))
const lineup = computed({ get: () => isNight.value ? save.nightLineup : isDaily.value ? save.dailyLineup ?? [] : save.lineup, set: ids => { if (isNight.value) save.nightLineup = ids; else if (isDaily.value) save.dailyLineup = ids; else save.lineup = ids } })
const cap = computed(() => isNight.value ? NIGHT_CAP : isDaily.value ? constraintCap(challenge.value.constraint) : league.value?.cap ?? 9)
const cost = computed(() => lineupCost(lineup.value))
function checkLineup(ids: string[]) {
  if (isNight.value) return nightLineupCheck({ ...save, nightLineup: ids })
  if (isDaily.value) return dailyLineupCheck({ ...save, dailyLineup: ids })
  if (rival.value) return lineupCheck(save, ids, rival.value.id)
}
const problem = computed(() => {
  const missing = 3 - lineup.value.length
  if (cost.value > cap.value) return t('Plafond dépassé de {n}', { n: cost.value - cap.value })
  if (missing > 0) return tp('Encore {n} voiture', 'Encore {n} voitures', missing)
  return ruleText(checkLineup(lineup.value))
})
const garageTitle = ref<HTMLElement>()
function chooseCar() {
  const target = garageTitle.value
  if (!target) return
  const header = document.querySelector('.topbar')?.getBoundingClientRect().height ?? 0
  const instant = reducedMotion.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.focus({ preventScroll: true })
  window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - header - 12, behavior: instant ? 'instant' : 'smooth' })
}
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
  const transit = Object.fromEntries(Object.values(save.trades ?? {}).flatMap(trade =>
    trade.state === 'transit' ? Object.entries(trade.goods.cars) : []))
  return vehicles.filter(v => save.cars[v.id] || transit[v.id]).map(v => {
    const owned = save.cars[v.id] ?? transit[v.id]
    const car = racer(v.id, save.cars[v.id] ? prepOf(save, v.id) : owned)
    const scores = circuitScores(car, circuit)
    const average = scores.reduce((total, s) => total + s.average * s.times, 0) / circuit.sectors.length
    return { v, car, scores, average, owned, favorite: save.cars[v.id]?.favorite }
  }).sort((a, b) => Number(lineup.value.includes(b.v.id)) - Number(lineup.value.includes(a.v.id)) ||
    b.average - a.average || Number(!!b.favorite) - Number(!!a.favorite) || a.v.cost - b.v.cost)
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

function pickProblem(id: string, price: number) {
  if (lineup.value.includes(id)) return
  if (inTransit(save, id)) return t('En transit')
  if (lineup.value.length === 3) return t('Retire d’abord une voiture')
  const excess = cost.value + price - cap.value
  if (excess > 0) return t('Dépasse le plafond de {n}', { n: excess })
  if (lineup.value.length === 2) return ruleText(checkLineup([...lineup.value, id]))
}
const garageChoices = computed(() => garageCars.value.map(car => ({ ...car, reason: pickProblem(car.v.id, car.v.cost) })))
function toggle(id: string) {
  if (loadingRace.value) return
  act(() => {
    if (lineup.value.includes(id)) lineup.value = lineup.value.filter(x => x !== id)
    else {
      const reason = pickProblem(id, vehicleById.get(id)?.cost ?? 0)
      if (reason) return reason
      lineup.value = [...lineup.value, id]
    }
  })
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) void nextTick(() => pop(`.lineup-slot:nth-child(${Math.max(1, lineup.value.indexOf(id) + 1)})`, 1.1))
}
async function toggleFromList(id: string, event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement
  toggle(id)
  if (event.detail === 0) {
    await nextTick()
    button.focus()
  }
}
async function removeFromSlot(id: string, event: MouseEvent) {
  const keyboard = event.detail === 0
  toggle(id)
  if (keyboard) {
    await nextTick()
    raceRoot.value?.querySelector<HTMLElement>('.lineup-slot .slot-placeholder')?.focus()
  }
}
const loadingRace = ref(false)
const loadingNextNight = ref(false)
let disposed = false
onUnmounted(() => { disposed = true })

function prepareRace(current: SoloDuel) {
  return waitForImages([
    art.rival(current.rivalId),
    character.value && art.rival(character.value.id),
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
  if (!isNight.value) tutorialAction(0, 4)
  loadingRace.value = true
  await prepareRace(current)
  if (disposed) return
  loadingRace.value = false
  if (save.duel !== current) return
  picked.value = 0; nitro.value = false; stance.value = 'normal'; detail.value = null
  void scrollToStage()
  sound('rev'); streaks(palettes.cyan, 30); flash(tone.cyan, 0.2); buzz([20, 40, 60])
}

// ——— Course en cours ———
const duel = computed(() => save.duel)
const rivalRace = computed(() => !isDaily.value && !isNight.value)
// Rivaux et Nuit sans fin figent leur pilotage dans `duel.pilot` ; le Défi du jour garde le réglage global.
const pilotedRace = computed(() => rivalRace.value || isNight.value)
const index = computed(() => duel.value?.rounds.length ?? 0)
const manualSector = computed(() => pilotedRace.value
  ? sectorPilot(duel.value?.pilot, index.value) === 'manuel'
  : save.preferences.timingMode)
const rhythmTurns = computed(() => pilotedRace.value ? duel.value?.pilot?.turn : save.preferences.turnMode)
const canSwitchPilot = computed(() => pilotedRace.value && duel.value?.pilot?.mode === 'manuel'
  && manualSector.value && !duel.value.winner)
const pilotLabel = (mode: PilotSummary) => mode === 'mixed' ? t('Manuel puis automatique')
  : mode === 'manuel' ? t('Manuel') : t('Automatique')
// Mode de la manche de nuit engagée, d'après le secteur à jouer.
const nightPilotNow = computed<PilotSummary>(() => {
  const d = duel.value
  if (!d) return 'auto'
  const modes = new Set([...d.rounds.map(roundPilot), ...(d.winner ? [] : [sectorPilot(d.pilot, index.value)])])
  return modes.has('manuel') ? (modes.has('auto') ? 'mixed' : 'manuel') : 'auto'
})
const nightPilotHelp = t('Auto : le hasard décide de la variation. Manuel : c’est ton adresse.')
const pilotPreference = computed({
  get: () => isNight.value ? save.night?.pilotMode ?? save.preferences.nightPilotMode ?? 'auto' : save.preferences.pilotMode ?? 'auto',
  set: (mode: PilotMode) => { act(s => { if (isNight.value) setNightPilot(s, mode); else s.preferences.pilotMode = mode }) },
})
// Le manuel n'est proposé que si le mode timing expérimental est activé.
const pilotPicker = computed(() => save.preferences.timingMode && !duel.value && !reward.value && !nightEnd.value
  && (rivalRace.value || (isNight.value && (!save.night || save.night.resting))))
const pendingManual = computed(() => {
  const d = duel.value, opponent = rival.value
  const pending = d?.manualSector
  if (!pending || d.winner || pending.index !== index.value || !manualSector.value) return
  const sequence = pending.turn && opponent ? turnSequence(opponent.circuit.name, pending.index, opponent.id) : undefined
  return { ...pending, duel: d, sequence }
})
onMounted(() => { if (pendingManual.value) void scrollToStage(false, true) })
const manualStarted = ref(false)
watch(() => Boolean(pendingManual.value), pending => { if (pending) manualStarted.value = false })
const manualDiscovery = computed<ManualDiscovery | undefined>(() =>
  pendingManual.value && (pendingManual.value.sequence ? 'virages' : 'manuel'))
const manualLesson = computed(() => manualDiscovery.value && !save.tutorial.seen.includes(manualDiscovery.value))
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
const finishedControls = shallowRef<{ turns?: TurnSequence; windows: typeof timingWindows.value }>()
watch(duel, current => { manualStreak.value = current ? (raceStreaks.get(current) ?? 0) : 0 }, { immediate: true })
function showJudgment(grade: ManualGrade) {
  const tags = { perfect: t('Parfait !'), good: t('Bien'), fair: t('Moyen'), miss: t('Raté') }
  manualStreak.value = grade === 'perfect' ? manualStreak.value + 1 : 0
  liveFeedback.value = { tag: tags[grade], grade, count: (liveFeedback.value?.count ?? 0) + 1 }
}
const picked = ref(pendingManual.value?.choice.car ?? 0)
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
const manualResult = computed(() => {
  const round = shown.value
  if (round?.direction) {
    const direction = round.direction
    return {
      modifier: direction.modifier,
      label: t('Trajectoire'),
      judgments: 'parfait' in direction ? turnSummary(direction) : turnFeedback(direction.outcome),
    }
  }
  if (round?.timing) return {
    modifier: round.timing.modifier,
    label: t('Passage de vitesses'),
    judgments: round.shifts?.length ? timingSummary(round.shifts) : timingFeedback(round.timing.zone),
  }
  return null
})
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
  finishedControls.value = undefined
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
    const turn = Boolean(rhythmTurns.value && rival.value && d.sectors[index.value] === 'virage')
    // La reprise conserve les choix des deux pilotes et rejoue le geste depuis le décompte.
    d.manualSector = { index: index.value, choice, rivalChoice: aiChoice(d, 'rival', Math.random), turn }
    persist()
    void scrollToStage(false, true)
    return
  }
  showAutomaticRound(d, choice)
}

function showAutomaticRound(d: SoloDuel, choice: Choice) {
  delete d.manualSector
  const round = pilotedRace.value ? playPilotRound(d, choice, Math.random) : playRound(d, choice, Math.random)
  if (d.pilot?.automaticFrom !== undefined) d.timingReview = true
  showRound(round)
}

function switchPilot() {
  const d = duel.value
  if (!canSwitchPilot.value || !d?.pilot) return
  const choice = pendingManual.value?.choice
  d.pilot = switchToAutomatic(d.pilot, index.value)
  liveFeedback.value = null
  if (choice && !shown.value) showAutomaticRound(d, choice)
  else {
    delete d.manualSector
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
  if (!pending || !manualStarted.value || shown.value) return
  const windows = timingWindows.value
  delete pending.duel.manualSector
  const round = pilotedRace.value
    ? playPilotRound(pending.duel, pending.choice, Math.random, () => resolve(pending)) : resolve(pending)
  pending.duel.timingReview = true
  raceStreaks.set(pending.duel, manualStreak.value)
  flawless.value = Boolean(liveFeedback.value && manualStreak.value >= liveFeedback.value.count)
  showRound(round, true)
  // Le dernier geste termine son effet sans déplacer les commandes.
  if (!reducedMotion.value) {
    finishedControls.value = { turns: pending.sequence, windows }
    timers.push(setTimeout(() => { finishedControls.value = undefined }, 260))
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
  if (!fromLive) void scrollToStage(true)
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
    <PilotPicker v-if="pilotPicker && !save.night" :id="isNight ? 'night-pilot' : 'race-pilot'" v-model="pilotPreference"
      :help="isNight ? nightPilotHelp : t('En auto, le hasard joue sur ton score. En manuel, tu passes les vitesses et tu négocies les virages si tu les as activés.')" />
    <section v-if="nightEnd" class="race-end night-panel">
      <h1 tabindex="-1">{{ t('Nuit terminée') }}</h1>
      <p><span v-help="'nightRound'">{{ t('Manches gagnées :') }}</span> {{ nightEnd.wins }}</p>
      <p>{{ tp('{n} crédit versé', '{n} crédits versés', nightEnd.credits) }}</p>
      <p v-if="nightEnd.newRecord" v-help="'nightRecord'" role="status">{{ t('Nouveau record !') }}</p>
      <p v-if="nightEnd.pilot">{{ t('Pilotage de la dernière manche : {mode}', { mode: pilotLabel(nightEnd.pilot) }) }}</p>
      <div class="race-actions"><button type="button" class="button primary wide" @click="nightEnd = null; chosen = null; emit('go', 'garage')">{{ t('Rentrer au garage') }}</button></div>
    </section>
    <section v-else-if="isNight && save.night && (save.night.resting || loadingNextNight)" class="race-end night-panel">
      <h1 tabindex="-1"><span v-help="'nightRound'">{{ t('Manche suivante :') }}</span> {{ save.night.round }}</h1>
      <p>{{ t(nightOpponent.circuit.name) }}</p>
      <p>{{ t(conditionLabels[Object.keys(nightOpponent.circuit.conditions)[0] as Condition]) }}</p>
      <p><span v-help="'nightGains'">{{ t('Gains accumulés :') }}</span> {{ tp('{n} crédit', '{n} crédits', save.night.gains) }}</p>
      <p v-if="save.night.newRecord" v-help="'nightRecord'" role="status">{{ t('Nouveau record !') }}</p>
      <p v-help="'nightRecord'">{{ tp('Record : {n} manche', 'Record : {n} manches', save.nightRecord) }}</p>
      <p v-if="save.night.lastPilot">{{ t('Pilotage de la dernière manche : {mode}', { mode: pilotLabel(save.night.lastPilot) }) }}</p>
      <PilotPicker v-if="pilotPicker" id="night-next-pilot" v-model="pilotPreference" :help="nightPilotHelp" />
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

      <p v-if="isNight && duel.pilot?.mode === 'manuel'" class="pilot-now" role="status">{{ t('Pilotage : {mode}', { mode: pilotLabel(nightPilotNow) }) }}</p>
      <GvButton v-if="canSwitchPilot" variant="filter" class="pilot-switch" @click="switchPilot">
        {{ t('Passer en automatique pour la suite') }}
      </GvButton>

      <section v-if="shown || pendingManual" class="round-result" :class="[shown && settled ? shown.winner : 'pending', { 'manual-stage': pendingManual }]">
        <template v-if="shown && !manualResult">
          <p v-if="pilotedRace && settled">{{ t('Pilotage : {mode}', { mode: pilotLabel(roundPilot(shown)) }) }}</p>
          <h2 v-if="settled" class="verdict">{{ shown.winner === 'player' ? t('Secteur gagné') : shown.winner === 'rival' ? t('Secteur perdu') : t('Égalité parfaite') }}</h2>
          <h2 v-else>{{ t(sectorLabels[shown.sector]) }} · {{ t(conditionLabels[shown.condition]) }}</h2>
        </template>
        <h2 v-else>{{ t(sectorLabels[shown?.sector ?? duel.sectors[index]]) }} · {{ t(conditionLabels[shown?.condition ?? duel.conditions[index]]) }}</h2>
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
        <SectorRun v-else-if="pendingManual || manualResult" :waiting="Boolean(pendingManual && !manualStarted)" :round="shown" :step="step"
          :live="pendingManual ? duel.conditions[index] : undefined" :running="Boolean(shown && !settled)"
          :arts="runArts" :sprites="runSprites" :backdrop="trackBackdrop(shown?.condition ?? duel.conditions[index])"
          :feedback="liveFeedback" hide-score-tags :streak="manualStreak" :flawless="flawless" :keep-controls="Boolean(finishedControls)" :tappable="Boolean(timingWindows.length)" @tap="gauge?.tapScene($event)" @skip="skipRun">
          <template #overlay>
            <ManualCountdown v-if="pendingManual" @go="manualStarted = true" />
          </template>
          <TurnControl v-if="pendingManual?.sequence || finishedControls?.turns" :sequence="(pendingManual?.sequence ?? finishedControls?.turns)!" :waiting="!manualStarted" @turn="steer"
            @judgment="result => showJudgment(turnGrade[result.outcome])" />
          <TimingGauge v-else-if="timingWindows.length || finishedControls?.windows.length" ref="gauge"
            :windows="finishedControls?.windows ?? timingWindows" :waiting="!manualStarted || Boolean(finishedControls)" @finish="shift"
            @judgment="result => showJudgment(shiftGrade[result.zone])" />
        </SectorRun>
        <template v-if="shown">
          <SectorRun v-if="!manualResult" :round="shown" :step="step" :running="!settled" :arts="runArts" :sprites="runSprites" :backdrop="trackBackdrop(shown.condition)" @skip="skipRun" />
          <h2 v-if="manualResult && settled" class="verdict">{{ shown.winner === 'player' ? t('Secteur gagné') : shown.winner === 'rival' ? t('Secteur perdu') : t('Égalité parfaite') }}</h2>
          <p v-if="settled && tieBreak && !manualResult" class="tie-note">{{ tieBreak }}</p>
          <div class="duel-columns" :class="{ 'manual-scores': manualResult }">
            <div v-for="who in (['player', 'rival'] as const)" :key="who" class="duel-col"
              :class="[who, { winner: settled && shown.winner === who, loser: settled && shown.winner !== who && shown.winner !== 'tie', boosted: shown[who].nitro }]">
              <span class="duel-who">{{ who === 'player' ? t('Toi') : rival.name }} <span v-if="shown[who].nitro" class="clash-nitro">{{ t('Nitro') }}</span></span>
              <strong v-if="!manualResult">{{ name(duel[who].lineup[shown[who].car].id) }}</strong>
              <span class="duel-score" :aria-label="tp('{n} point', '{n} points', shown[who].score)">{{ counts[who] }}</span>
              <ul v-if="settled && !manualResult"><li v-for="(l, i) in shown[who].lines" :key="i" :style="{ '--i': i }"><span v-help="helpForLine(l.label)">{{ ruleText(l.label) }}</span><b>{{ l.value > 0 ? '+' : '' }}{{ l.value }}</b></li></ul>
              <template v-if="settled && manualResult">
                <small v-if="shown[who].overheated">{{ t('Surchauffe') }}</small>
                <small v-if="shown[who].luck === 'incident'">{{ t('Incident') }}</small>
              </template>
            </div>
          </div>
          <template v-if="settled && manualResult">
            <p v-if="manualResult.modifier" class="manual-modifier" :class="{ malus: manualResult.modifier < 0 }">
              {{ t('{label} {modifier}', { label: manualResult.label, modifier: signedTiming(manualResult.modifier) }) }}
            </p>
            <p v-if="tieBreak" class="tie-note">{{ tieBreak }}</p>
            <details class="race-terrain-detail sector-detail">
              <summary>{{ t('Détails du secteur') }}</summary>
              <p>{{ manualResult.judgments }}</p>
              <p>{{ t('Score de base {base} + {label} ({modifier}) = {total}', {
                base: shown.player.score - manualResult.modifier, label: manualResult.label,
                modifier: signedTiming(manualResult.modifier), total: shown.player.score,
              }) }}</p>
              <div class="duel-columns">
                <div v-for="who in (['player', 'rival'] as const)" :key="who" class="duel-col">
                  <span class="duel-who">{{ who === 'player' ? t('Toi') : rival.name }}</span>
                  <strong>{{ name(duel[who].lineup[shown[who].car].id) }}</strong>
                  <ul><li v-for="(line, i) in shown[who].lines" :key="i">
                    <span v-help="helpForLine(line.label)">{{ ruleText(line.label) }}</span><b>{{ signedTiming(line.value) }}</b>
                  </li></ul>
                </div>
              </div>
            </details>
          </template>
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
        <button type="button" class="button filled back-link" :disabled="loadingRace" @click="chosen = null"><span aria-hidden="true">←</span> {{ t('Rivaux') }}</button>
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
            :disabled="loadingRace || !stepItem.unlocked"
            @click="chosen = stepItem.id">
            <span class="rival-step-mark" aria-hidden="true">{{ !stepItem.unlocked ? '🔒' : stepItem.won ? '✓' : '◆' }}<span v-if="stepItem.unlocked && stepItem.won && stepItem.perfect" class="rival-step-star">★</span></span>
            <span>{{ t(stepItem.stepLabel ?? '') }}</span>
            <span v-if="stepItem.unlocked && stepItem.won" class="visually-hidden">{{ stepItem.perfect ? t('Victoire parfaite obtenue') : t('Victoire parfaite non obtenue') }}</span>
          </GvButton>
        </div>
        <p class="hint">
          {{ tp('Récompense : {n} crédit', 'Récompense : {n} crédits', (save.record[rival.id]?.wins ? rival.replay : rival.reward) ?? 0) }}<template v-if="rival.completionTicket && !save.record[rival.id]?.wins"> + {{ t('1 ticket {booster}', { booster: t(boosterById.get(rival.completionTicket)?.name ?? '') }) }}</template><template v-if="rival.rewardCar && !save.record[rival.id]?.wins && !save.cars[rival.rewardCar]"> + {{ vehicleById.get(rival.rewardCar)?.name }} {{ vehicleById.get(rival.rewardCar)?.version }}</template>
        </p>
      </section>
      <section v-if="isDaily" class="daily-panel"><h2>{{ t('Contrainte') }}</h2><p>{{ constraintLabel(challenge.constraint) }}</p><p>{{ tp('{n} crédit à la première victoire du jour.', '{n} crédits à la première victoire du jour.', challenge.reward) }}</p></section>
      <section class="race-briefing" aria-labelledby="briefing-title">
        <div class="section-row"><h2 id="briefing-title">{{ t('Préparer ta course') }}</h2><span v-if="!isNight && !isDaily && rival.league === 'neon'" class="race-intro-badge">{{ t('Accessible d’origine') }}</span></div>
        <p v-if="isNight">{{ t(rival.circuit.name) }}</p>
        <ol class="race-sector-order" :aria-label="t('Ordre des secteurs')">
          <li v-for="(sector, i) in rival.circuit.sectors" :key="i"><span aria-hidden="true">{{ sectorIcons[sector] }}</span><span v-help="sector">{{ t(sectorLabels[sector]) }}</span></li>
        </ol>
        <div class="race-conditions" :aria-label="t('Conditions possibles')">
          <span v-for="c in conditions" :key="c.key"><span aria-hidden="true">{{ conditionIcons[c.key] }}</span> <span v-help="c.key">{{ t(conditionLabels[c.key]) }}</span> {{ t('{n} %', { n: c.chance }) }}</span>
        </div>
        <details class="race-terrain-detail">
          <summary>{{ t('Statistiques prioritaires') }}</summary>
          <ul class="race-priorities">
            <li v-for="p in recommendedCars" :key="p.sector">
              <div><b v-help="p.stat">{{ t(statLabels[p.stat]) }}</b><small>{{ tp('{n} secteur', '{n} secteurs', p.times) }} · {{ t(sectorLabels[p.sector]) }}</small></div>
              <button v-if="p.best" class="race-prepare" type="button" :disabled="loadingRace" :aria-label="t('Préparer {name} · {stat}', { name: p.best.name, stat: t(statLabels[p.stat]) })"
                @click="emit('inspect', 'car', p.best.id, rival.circuit, p.stat)">
                <b>{{ p.best.name }}</b><small>{{ t('{n} pts estimés', { n: pointsText(p.best.score) }) }} <span aria-hidden="true">↗</span></small>
              </button>
            </li>
          </ul>
          <p v-if="lineup.length" class="hint">{{ t('Scores moyens estimés selon le terrain, hors nitro et bonus liés à l’adversaire ou à l’écurie. Touche une voiture pour ouvrir l’atelier.') }}</p>
        </details>
      </section>
      <p class="rival-preview">{{ t('Écurie adverse · {cars}', { cars: rivalLineup(rival).map(e => name(e.id)).join(' · ') }) }}</p>
      </div>
      <div class="race-prep-pick">
      <h2 class="list-title lineup-title">{{ t('Écurie · {n}/3', { n: lineup.length }) }}</h2>
      <div class="lineup-slots">
        <div v-for="n in 3" :key="n" class="lineup-slot">
          <template v-if="lineup[n - 1]">
            <div class="race-card">
              <CarCard :id="lineup[n - 1]" :style-name="save.cars[lineup[n - 1]]?.shown" :prep="prepOf(save, lineup[n - 1])" compact />
              <button type="button" class="race-card-hit" :disabled="loadingRace" :aria-label="t('Fiche de {name}', { name: name(lineup[n - 1]) })"
                @click="emit('inspect', 'car', lineup[n - 1], rival.circuit)"></button>
            </div>
            <button type="button" class="button quiet" :disabled="loadingRace" :aria-label="t('Retirer {name} de l’écurie', { name: name(lineup[n - 1]) })"
              @click="removeFromSlot(lineup[n - 1], $event)">{{ t('Retirer') }}</button>
            <button type="button" class="button filled" :disabled="loadingRace" :aria-label="t('Atelier de {name}', { name: name(lineup[n - 1]) })"
              @click="emit('inspect', 'car', lineup[n - 1], rival.circuit, undefined, true)">{{ t('Atelier') }}</button>
          </template>
          <button v-else type="button" class="button slot-placeholder" :disabled="loadingRace" @click="chooseCar">{{ t('+ Choisir') }}</button>
        </div>
      </div>

      <h2 id="race-garage-title" ref="garageTitle" tabindex="-1" class="list-title">{{ t('Ton garage') }}</h2>
      <div class="race-garage" role="region" aria-labelledby="race-garage-title" tabindex="0">
        <ul class="race-card-grid">
          <li v-for="{ v, car, scores, reason, owned } in garageChoices" :key="v.id">
            <div class="race-card" :class="{ selected: lineup.includes(v.id) }">
              <CarCard :id="v.id" :style-name="owned.shown" :prep="car.prep" compact lazy />
              <button type="button" class="race-card-hit" :aria-label="name(v.id)" :aria-pressed="lineup.includes(v.id)"
                :aria-describedby="`race-pick-${v.id}`" :disabled="loadingRace || !!reason" @click="toggleFromList(v.id, $event)"></button>
            </div>
            <div :id="`race-pick-${v.id}`" class="race-card-info">
              <b>
                <span v-if="lineup.includes(v.id)" class="pick-tick" aria-hidden="true">✓</span>
                <span v-if="owned.favorite" role="img" :aria-label="t('Favori')">★ </span>{{ t('Coût {n}', { n: v.cost }) }}
              </b>
              <small>{{ tp('{n} secteur avant surchauffe', '{n} secteurs avant surchauffe', car.uses) }}</small>
              <small v-for="s in scores.filter(s => s.times === priorities[0]?.times)" :key="s.stat">{{ t('{label} {n} pts', { label: t(s.label), n: pointsText(s.average) }) }}</small>
              <small v-if="reason" class="race-card-reason">{{ reason }}</small>
            </div>
          </li>
        </ul>
      </div>
      <div class="race-actions">
        <div class="cap-meter" :class="{ over: cost > cap }">
          <span v-help="isNight ? 'nightCap' : 'plafond'">{{ t('Coût d’écurie') }}</span>
          <div aria-hidden="true"><span :style="{ width: `${Math.min(100, cost / cap * 100)}%` }"></span></div>
          <b>{{ cost }} / {{ cap }}</b>
        </div>
        <p v-if="problem" id="race-launch-problem" role="status">{{ problem }}</p>
        <button type="button" class="button primary wide race-launch" :disabled="loadingRace || !!problem" :aria-busy="loadingRace"
          :aria-describedby="problem ? 'race-launch-problem' : undefined" @click="start">
          {{ loadingRace ? t('Chargement des images…') : isNight ? t('Commencer la nuit') : isDaily ? t('Lancer le défi') : t('Lancer la course') }}
        </button>
      </div>
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
        <li v-for="({ r, perfect }, i) in rivalProgress" :key="r.id" class="deal" :style="{ '--i': i }">
          <button type="button" class="rival-row" :disabled="!unlocked.includes(r.id)" @click="chosen = currentRivalStep(save, r.id)">
            <img v-if="art.rival(r.id)" :src="art.rival(r.id)" alt="" />
            <span v-else class="rival-initial" aria-hidden="true">{{ r.name[0] }}</span>
            <span class="rival-info">
              <b>{{ r.name }}</b>
              <span>
                <span aria-hidden="true">{{ perfect.stars }}</span>
                <span class="visually-hidden">{{ perfect.label }}</span>
              </span>
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
.manual-scores, .sector-detail .duel-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); overflow-wrap: anywhere; }
.manual-scores .duel-col.loser { opacity: 1; filter: none; }
.manual-scores small, .manual-modifier.malus { color: var(--pink); }
.manual-modifier { margin: 8px 0 0; font-weight: 700; text-align: center; }
.sector-detail { margin-top: 4px; }
.sector-detail summary { width: fit-content; }
.sector-detail .duel-col li { animation: none; }
.race-recap .recap-pilot { grid-column: 1 / -1; grid-row: 2; color: var(--muted); }
.lineup-slot { display: grid; align-content: start; gap: 4px; min-width: 0; }
.lineup-slot .button, .race-launch, .race-prepare { min-height: 44px; }
.lineup-slot .button { width: 100%; min-width: 0; padding-inline: 3px; white-space: normal; overflow-wrap: anywhere; }
.lineup-slot .slot-placeholder { min-height: 70px; aspect-ratio: auto; border: 1px dashed var(--line); }
.race-terrain-detail summary { min-height: 44px; align-content: center; cursor: pointer; }
.race-card { position: relative; container-type: inline-size; min-width: 0; }
.race-card-hit {
  position: absolute; z-index: 1; inset: 0; width: 100%; min-height: 44px;
  padding: 0; border: 0; background: transparent;
  scroll-margin-bottom: calc(var(--race-action-height) + var(--race-tabbar-offset) + 12px);
}
.race-card :deep(.car-card.compact .car-card-foot) { font-size: clamp(9px, 5cqw, 15px); }
.race-card-hit:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
.race-card.selected { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: var(--radius); }
.race-garage { max-height: 60svh; overflow: auto; scroll-behavior: auto; }
.race-card-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 10px;
  list-style: none; margin: 0; padding: 5px;
}
.race-card-grid li { min-width: 0; }
.race-card-info { display: grid; gap: 2px; margin-top: 6px; line-height: 1.25; overflow-wrap: anywhere; }
.pick-tick { color: var(--cyan); font-weight: 900; margin-inline-end: .35em; }
.race-card-reason { color: var(--text); font-weight: 700; }
@media (max-width: 360px) {
  main.race:has(.race-prep) { padding-inline: 10px; }
  .lineup-slots { gap: 6px; }
}
@media (min-width: 1024px) {
  .race-card-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.race-actions .cap-meter, .race-actions p { margin: 0; }
.race-actions .cap-meter { grid-template-columns: auto minmax(0, 1fr) auto; }
.race-actions p { text-align: center; overflow-wrap: anywhere; }
</style>
