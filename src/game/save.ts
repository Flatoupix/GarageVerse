// Sauvegarde locale, économie du garage et tirage des boosters.
import { t, tp } from '../i18n'
import { ruleText } from './rules-text'
import { NIGHT_CAP, nightRival, nightReward, type Night } from './endless'
import { constraintCheck, dailyChallenge, dailyRng, localDate, previousDate, validDailyLineup } from './daily'
import {
  specials, specialByRivalId, rivals, rivalStepMap, series, boosterById, defaultStyle, leagueById, partById, parts, PIXEL, progression, rarities, rivalById, statLabels, stylesOf, vehicleById, vehicles,
  type Booster, type EditionStyle, type Part, type Rarity, type Rival, type StatKey,
} from './data'
import { circuitPriorities, compatibility, createRace, rivalLineup, createDuel, engagements, EXTRA_SLOT_PRICE, extraSlotFamily, lineupCost, partUnlockLevel, potential, prepUsed, racer,
  STAT_CAP, statsOf, upgradeForFamily, upgradeKeys, upgradePrices, upgrades, type Prep, type Rng } from './rules'
import type { PilotMode } from './pilot'
import type { SoloDuel } from './timing'

export const SAVE_KEY = 'garageverse:v2'
export const LEGACY_KEY = 'garageverse:v1'

export interface OwnedCar { copies: number; stage: number; parts: string[]; editions: EditionStyle[]; shown: EditionStyle; favorite: boolean; upgrades: Record<StatKey, number>; extraSlot?: StatKey }
export type Pull = { kind: 'car'; id: string; style: EditionStyle; isNew: boolean; showEdition?: boolean } | { kind: 'part'; id: string; isNew: boolean }
export interface Opening { booster: string; pulls: Pull[]; revealed: number; view: 'back' | 'face' | 'recap'; collected: boolean }
// Thème d'interface : 'neon' est le style d'origine, les autres se choisissent dans les Réglages.
export const themeIds = ['neon', 'pixel', 'sobre', 'sport', 'carnet', 'arcade', 'console', 'dos'] as const
export type ThemeId = (typeof themeIds)[number]
// Dos des cartes au choix : Blason (a), Carbone (b), Autoroute (c, par défaut) et Motif (d).
export const cardBackIds = ['a', 'b', 'c', 'd'] as const
export type CardBackId = (typeof cardBackIds)[number]
export interface Preferences { sound: boolean; music: boolean; reducedMotion: boolean; vibration: boolean; theme: ThemeId; garageCols?: number; garageSort?: string; garageRarity?: Rarity; garageCategory?: string; touchHelp?: boolean; cardBack?: CardBackId; timingMode?: boolean; turnMode?: boolean; pilotMode?: PilotMode }
export type Discovery = 'nitro' | 'heat' | 'daily' | 'perfect' | 'series' | 'stance'
export interface Tutorial { step: number; status: 'active' | 'done' | 'skipped'; seen: Discovery[] }
export const tutorialSteps = 12
import type { VersusAccount } from './versus-wallet'

export interface Save {
  versus: VersusAccount | null
  seenCars?: string[]
  nightRecord: number
  night: Night | null
  nightLineup: string[]
  series: string[]
  tutorial: Tutorial
  version: 2
  daily: { date: string; won: boolean; booster: boolean; streak: number; lastWin: string }
  credits: number
  tickets: Record<string, number>
  cars: Record<string, OwnedCar>
  parts: Record<string, number>
  sealedPulls: Pull[] | null
  sealed: string | null
  opening: Opening | null
  dailyLineup?: string[]
  lineup: string[]
  record: Record<string, { wins: number; losses: number; perfect: boolean }>
  duel: SoloDuel | null
  preferences: Preferences
}

export function newSave(): Save {
  const start = progression.start
  const save: Save = {
    versus: null, nightRecord: 0, night: null, nightLineup: [...start.vehicles],
    series: [],
    tutorial: { step: 0, status: 'active', seen: [] },
    version: 2, daily: { date: localDate(), won: false, booster: false, streak: 0, lastWin: '' }, credits: start.credits, tickets: { ...start.tickets }, cars: {}, parts: {}, sealedPulls: null, sealed: null, opening: null,
    lineup: [...start.vehicles], record: {}, duel: null, preferences: { sound: true, music: true, reducedMotion: false, vibration: true, theme: 'neon', touchHelp: false, timingMode: false, turnMode: false },
  }
  for (const id of start.vehicles) addCar(save, id, defaultStyle(id))
  for (const id of start.parts) save.parts[id] = (save.parts[id] ?? 0) + 1
  save.seenCars = Object.keys(save.cars)
  return save
}

function addCar(save: Save, id: string, style: EditionStyle) {
  const car = save.cars[id] ??= { copies: 0, stage: 0, parts: [], editions: [], shown: style, favorite: false, upgrades: { acc: 0, vit: 0, man: 0, end: 0 } }
  car.copies++
  if (!car.editions.includes(style)) car.editions.push(style)
}

const legacyEditions: Record<string, [string, EditionStyle]> = {
  'clio-classic': ['clio', 'Classic'], 'elise-classic': ['elise', 'Classic'], 'r34-classic': ['r34', 'Classic'],
  'venom-classic': ['venom', 'Classic'], 'venom-pixel': ['venom', 'Pixel Art'], 'brian-classic': ['brian', 'Classic'],
}

// Reprend les cartes collectées dans le prototype précédent.
function migrate(raw: string | null, save: Save) {
  try {
    const old = JSON.parse(raw ?? 'null')
    if (old?.version !== 1) return
    for (const opening of Object.values(old.openings ?? {}) as { editions?: string[]; collected?: boolean }[]) {
      if (!opening?.collected) continue
      for (const key of opening.editions ?? []) if (legacyEditions[key]) addCar(save, ...legacyEditions[key])
    }
    if (Object.keys(old.record ?? {}).length) save.tutorial.status = 'done'
    if (old.preferences) {
      save.preferences = { ...save.preferences, ...old.preferences }
      save.preferences.music = old.preferences.music ?? (old.preferences.sound !== false)
    }
  } catch { /* ancienne sauvegarde illisible : on repart du garage de départ */ }
}

const int = (value: unknown, min: number, max: number, fallback: number) =>
  Number.isInteger(value) ? Math.max(min, Math.min(max, value as number)) : fallback

export function readSave(raw: string | null, legacy: string | null = null): Save {
  const save = newSave()
  let input: Partial<Save> | null = null
  try { input = JSON.parse(raw ?? 'null') } catch { input = null }
  if (input?.version !== 2) {
    migrate(legacy, save)
    if (legacy) save.preferences.touchHelp = true
    save.seenCars = Object.keys(save.cars)
    return save
  }

  const account = input.versus
  if (account && typeof account.id === 'string' && typeof account.nickname === 'string' && typeof account.friend_code === 'string') {
    const active = account.active
    save.versus = { id: account.id, nickname: account.nickname, friend_code: account.friend_code, active: active && typeof active.room === 'string' && Number.isSafeInteger(active.stake) ? active : null }
  }
  save.series = series.filter(s => Array.isArray(input.series) && input.series.includes(s.id)).map(s => s.id)
  if (input.daily) save.daily = {
    date: typeof input.daily.date === 'string' ? input.daily.date : localDate(),
    won: input.daily.won === true, booster: input.daily.booster === true,
    streak: int(input.daily.streak, 0, 100000, 0), lastWin: typeof input.daily.lastWin === 'string' ? input.daily.lastWin : '',
  }
  refreshDaily(save)
  save.credits = int(input.credits, 0, 1e7, save.credits)
  save.tickets = Object.fromEntries(Object.entries(input.tickets ?? {}).filter(([id]) => boosterById.has(id)).map(([id, n]) => [id, int(n, 0, 99, 0)]))
  save.cars = {}
  let refunds = 0
  for (const [id, car] of Object.entries(input.cars ?? {})) {
    const v = vehicleById.get(id)
    if (!v || !car) continue
    const styles = stylesOf(id)
    const editions = Array.isArray(car.editions) ? car.editions.filter(s => styles.includes(s)) : []
    // Offre l’édition par défaut sans remplacer une apparence déjà choisie.
    const primary = defaultStyle(id)
    const usesOldDefault = !editions.includes(primary)
    if (usesOldDefault) editions.unshift(primary)
    const stage = int(car.stage, 0, 3, 0)
    const levels = { acc: 0, vit: 0, man: 0, end: 0 }
    for (const key of upgradeKeys) levels[key] = int(car.upgrades?.[key], 0, partUnlockLevel, 0)
    const maxed = stage === 3 && upgradeKeys.every(k => levels[k] >= partUnlockLevel)
    const extraSlot = maxed ? upgradeKeys.find(k => k === car.extraSlot && extraSlotFamily[k]) : undefined
    // Un 3ᵉ emplacement acheté sur un atelier qui n'en propose plus est remboursé.
    if (maxed && car.extraSlot && !extraSlot && upgradeKeys.includes(car.extraSlot)) refunds += EXTRA_SLOT_PRICE
    const doubled = extraSlot && extraSlotFamily[extraSlot]
    const installed: string[] = []
    for (const partId of car.parts ?? []) {
      const part = partById.get(partId)
      if (!part || compatibility(part, v) || installed.includes(partId)) continue
      const sameFamily = installed.filter(p => partById.get(p)?.family === part.family).length
      if (sameFamily < (part.family === doubled ? 2 : 1)) installed.push(partId)
    }
    // Une légendaire restée sur l'ancien défaut pixel prend sa nouvelle image fixe ; un autre choix du joueur est gardé.
    const shownBefore = editions.includes(car.shown) ? car.shown : editions[0]
    save.cars[id] = { copies: int(car.copies, 1, 999, 1), stage, parts: installed, editions,
      shown: primary !== PIXEL && usesOldDefault && shownBefore === PIXEL ? primary : shownBefore,
      favorite: car.favorite === true, upgrades: levels, ...(extraSlot ? { extraSlot } : {}) }
  }
  save.credits = Math.min(1e7, save.credits + refunds)
  save.seenCars = Array.isArray(input.seenCars) ? input.seenCars.filter(id => typeof id === 'string' && vehicleById.has(id)) : Object.keys(save.cars)
  save.parts = Object.fromEntries(Object.entries(input.parts ?? {}).filter(([id]) => partById.has(id)).map(([id, n]) => [id, int(n, 0, 999, 0)]))
  save.sealed = typeof input.sealed === 'string' && boosterById.has(input.sealed) ? input.sealed : null
  if (save.sealed && Array.isArray(input.sealedPulls) && input.sealedPulls.length === 5 &&
      input.sealedPulls.every(p => p && (p.kind === 'car' ? vehicleById.has(p.id) && stylesOf(p.id).includes(p.style) : p.kind === 'part' && partById.has(p.id)))) {
    save.sealedPulls = input.sealedPulls
  }
  const o = input.opening
  if (o && boosterById.has(o.booster) && Array.isArray(o.pulls) && o.pulls.length === 5 &&
      o.pulls.every(p => p.kind === 'car' ? vehicleById.has(p.id) : partById.has(p.id))) {
    const revealed = o.collected ? 5 : int(o.revealed, 0, 5, 0)
    save.opening = { booster: o.booster, pulls: o.pulls, revealed, collected: Boolean(o.collected),
      view: o.collected || (revealed === 5 && o.view === 'recap') ? 'recap' : revealed && (o.view === 'face' || revealed === 5) ? 'face' : 'back' }
  }
  save.nightRecord = int(input.nightRecord, 0, 100000, 0)
  save.nightLineup = (input.nightLineup ?? save.nightLineup).filter(id => Boolean(save.cars[id])).slice(0, 3)
  // Écurie de la nuit incomplète (voitures vendues, ancienne sauvegarde) : on la complète avec les voitures les moins chères.
  if (save.nightLineup.length < 3) {
    const cheap = Object.keys(save.cars).filter(id => vehicleById.has(id) && !save.nightLineup.includes(id)).sort((x, y) => vehicleById.get(x)!.cost - vehicleById.get(y)!.cost)
    for (const id of cheap) {
      if (save.nightLineup.length === 3) break
      if (lineupCost([...save.nightLineup, id]) <= NIGHT_CAP) save.nightLineup.push(id)
    }
  }
  const night = input.night
  if (night && typeof night.seed === 'string' && Array.isArray(night.lineup) && night.lineup.length === 3 && new Set(night.lineup).size === 3 && night.lineup.every(id => save.cars[id])) {
    save.night = { seed: night.seed, round: int(night.round, 1, 100000, 1), wins: int(night.wins, 0, 100000, 0), gains: int(night.gains, 0, 1e7, 0), lineup: [...night.lineup], resting: night.resting === true, newRecord: night.newRecord === true }
  }
  save.dailyLineup = input.dailyLineup?.filter(id => Boolean(save.cars[id])).slice(0, 3)
  save.lineup = (input.lineup ?? []).filter(id => save.cars[id]).slice(0, 3)
  save.record = Object.fromEntries(Object.entries(input.record ?? {}).filter(([id]) => rivalById.has(id)).map(([id, record]) => [id, {
    wins: int(record?.wins, 0, 100000, 0), losses: int(record?.losses, 0, 100000, 0), perfect: record?.perfect === true,
  }]))
  try {
    const duel = input.duel
    if (duel && (rivalById.has(duel.rivalId) || (save.night && duel.rivalId === `night:${save.night.seed}:${save.night.round}`) || /^daily:\d{4}-\d{2}-\d{2}$/.test(duel.rivalId)) && Array.isArray(duel.rounds) && duel.rounds.length <= duel.sectors.length) {
      for (const who of ['player', 'rival'] as const) duel[who].lineup = duel[who].lineup.map(r => racer(r.id, r.prep))
      const choice = duel.timingChoice
      if (choice && (duel.winner || duel.rounds.length >= duel.sectors.length || !Number.isInteger(choice.car)
        || !duel.player.lineup[choice.car] || typeof choice.nitro !== 'boolean'
        || (choice.stance !== 'normal' && choice.stance !== 'attaque' && choice.stance !== 'gestion'))) delete duel.timingChoice
      if (rivalById.has(duel.rivalId)) {
        const pilot = duel.pilot
        if (pilot?.mode === 'manuel') {
          const from = pilot.automaticFrom
          duel.pilot = { mode: 'manuel', turn: pilot.turn === true }
          if (from !== undefined && Number.isInteger(from) && from >= 0 && from <= duel.rounds.length) {
            duel.pilot.automaticFrom = from
            delete duel.timingChoice
          }
        } else if (!pilot && duel.timingChoice) {
          // Une ancienne course peut déjà attendre un passage de vitesse.
          duel.pilot = { mode: 'manuel', turn: input.preferences?.turnMode === true }
        } else {
          duel.pilot = { mode: 'auto' }
          delete duel.timingChoice
        }
      }
      save.duel = duel
    }
  } catch { save.duel = null }
  if (save.night && !save.night.resting && !save.duel) createNightRound(save)
  const tutorial = input.tutorial
  if (tutorial) save.tutorial = {
    step: int(tutorial.step, 0, tutorialSteps - 1, 0),
    status: tutorial.status === 'done' || tutorial.status === 'skipped' ? tutorial.status : 'active',
    seen: (['nitro', 'heat', 'daily', 'perfect', 'series', 'stance'] as const).filter(key => Array.isArray(tutorial.seen) && tutorial.seen.includes(key)),
  }
  else if (Object.keys(save.record).length || save.duel?.rounds.length || save.daily.won || save.daily.lastWin) save.tutorial.status = 'done'
  save.preferences = {
    // Les anciennes parties conservent l’aide tactile ; les nouvelles la désactivent.
    touchHelp: input.preferences?.touchHelp !== false,
    timingMode: input.preferences?.timingMode === true,
    turnMode: input.preferences?.turnMode === true,
    pilotMode: input.preferences?.pilotMode === 'manuel' ? 'manuel' : 'auto',
    sound: input.preferences?.sound !== false,
    music: input.preferences?.music ?? (input.preferences?.sound !== false),
    reducedMotion: input.preferences?.reducedMotion === true,
    vibration: input.preferences?.vibration !== false,
    theme: themeIds.find(id => id === input.preferences?.theme) ?? 'neon',
    ...(typeof input.preferences?.garageSort === 'string' && ['number', 'rarity', 'power', 'name', 'copies', 'stage', 'cost', 'cost-desc', 'acc', 'vit', 'man', 'end', 'year'].includes(input.preferences.garageSort) ? { garageSort: input.preferences.garageSort } : {}),
    ...(typeof input.preferences?.garageCategory === 'string' ? { garageCategory: input.preferences.garageCategory } : {}),
    ...(input.preferences?.garageRarity && rarities.includes(input.preferences.garageRarity) ? { garageRarity: input.preferences.garageRarity } : {}),
    ...(cardBackIds.includes(input.preferences?.cardBack as CardBackId) ? { cardBack: input.preferences!.cardBack } : {}),
    ...(Number.isInteger(input.preferences?.garageCols) ? { garageCols: int(input.preferences?.garageCols, 0, 6, 0) } : {}),
  }
  return save
}

// ——— Boosters ———

export function buyBooster(save: Save, id: string, rng: Rng = Math.random): string | undefined {
  const booster = boosterById.get(id)
  if (!booster) return t('Booster inconnu')
  if (save.sealed || (save.opening && !save.opening.collected)) return t('Termine d’abord le booster en cours')
  if ((save.tickets[id] ?? 0) > 0) save.tickets[id]--
  else if (save.credits >= booster.price) save.credits -= booster.price
  else return t('Il manque {n} crédits', { n: booster.price - save.credits })
  save.sealed = id
  save.sealedPulls = drawPulls(save, booster, rng)
  save.opening = null
}

// Achat groupé : `count` boosters payés d'un coup deviennent des tickets, puis le premier est scellé pour l'ouverture.
export function buyBoosters(save: Save, id: string, count: number, rng: Rng = Math.random): string | undefined {
  const booster = boosterById.get(id)
  if (!booster) return t('Booster inconnu')
  if (!Number.isInteger(count) || count < 2 || count > 10) return t('Quantité invalide')
  if (save.sealed || (save.opening && !save.opening.collected)) return t('Termine d’abord le booster en cours')
  const price = booster.price * count
  if (save.credits < price) return t('Il manque {n} crédits', { n: price - save.credits })
  save.credits -= price
  save.tickets[id] = (save.tickets[id] ?? 0) + count
  return buyBooster(save, id, rng)
}

function weighted<T>(items: T[], weight: (item: T) => number, rng: Rng): T {
  let roll = rng() * items.reduce((n, item) => n + weight(item), 0)
  for (const item of items) if ((roll -= weight(item)) < 0) return item
  return items[items.length - 1]
}

const owned = (save: Save, pull: { kind: 'car' | 'part'; id: string }) =>
  pull.kind === 'car' ? Boolean(save.cars[pull.id]) : (save.parts[pull.id] ?? 0) > 0

export function drawPulls(save: Save, booster: Booster, rng: Rng): Pull[] {
  const seen = new Set<string>()
  let partsDrawn = 0
  return booster.slots.map(slot => {
    const isPart = partsDrawn < (booster.maxParts ?? 1) && rng() < slot.partChance
    const spawnable = rarities.filter(r => slot[r] && (!isPart || parts.some(p => p.rarity === r)))
    const rarity = weighted(spawnable.length ? spawnable : rarities.filter(r => slot[r]), r => slot[r] ?? 0, rng)
    const nearest = <T extends { rarity: Rarity }>(pool: T[]): T[] => {
      for (let d = 0; d < rarities.length; d++) {
        const i = rarities.indexOf(rarity)
        const found = pool.filter(x => x.rarity === rarities[i - d] || x.rarity === rarities[i + d])
        if (found.length) return found
      }
      return pool
    }
    if (isPart) {
      partsDrawn++
      const unseen = parts.filter(p => !seen.has(`part:${p.id}`))
      const part = weighted(nearest(unseen.length ? unseen : parts), () => 1, rng)
      const pull: Pull = { kind: 'part', id: part.id, isNew: !owned(save, { kind: 'part', id: part.id }) && !seen.has(`part:${part.id}`) }
      seen.add(`part:${part.id}`)
      return pull
    }
    const pool = nearest(vehicles.filter(v => !v.craft || v.craft.inBoosters))
    const unseen = pool.filter(v => !seen.has(`car:${v.id}`))
    const favor = (v: (typeof vehicles)[number]) =>
      booster.favorTags?.some(tag => v.tags.includes(tag) || v.culture?.aura.includes(tag)) ? booster.favorWeight ?? 1 : 1
    const v = weighted(unseen.length ? unseen : pool, favor, rng)
    const [primary, ...alts] = stylesOf(v.id)
    const style = alts.length && rng() < booster.altChance ? weighted(alts, () => 1, rng) : primary
    const pull: Pull = { kind: 'car', id: v.id, style, isNew: !save.cars[v.id] && !seen.has(`car:${v.id}`) }
    seen.add(`car:${v.id}`)
    seen.add(`edition:${v.id}:${style}`)
    return pull
  })
}

export function sealedHasLegend(save: Save): boolean {
  return Boolean(save.sealed && save.sealedPulls?.some(p =>
    (p.kind === 'car' ? vehicleById.get(p.id) : partById.get(p.id))?.rarity === 'Légendaire'))
}

export function tear(save: Save, rng: Rng) {
  if (!save.sealed) return
  const booster = boosterById.get(save.sealed)!
  const pulls = save.sealedPulls ?? drawPulls(save, booster, rng)
  const seen = new Set<string>()
  for (const pull of pulls) {
    const key = `${pull.kind}:${pull.id}`
    pull.isNew = !owned(save, pull) && !seen.has(key)
    seen.add(key)
  }
  save.sealedPulls = null
  save.opening = { booster: booster.id, pulls, revealed: 0, view: 'back', collected: false }
  save.sealed = null
}

// Apparence prévue après les cartes précédentes, avant leur attribution au récapitulatif.
export function openingStyle(save: Save, index: number): EditionStyle | undefined {
  const pulls = save.opening?.pulls ?? []
  const pull = pulls[index]
  if (pull?.kind !== 'car') return
  let shown = save.cars[pull.id]?.shown
  for (const previous of pulls.slice(0, index + 1)) {
    if (previous.kind === 'car' && previous.id === pull.id) {
      shown ??= previous.style
      if (previous.showEdition) shown = previous.style
    }
  }
  return shown
}

export function showPullEdition(save: Save, index: number) {
  const opening = save.opening
  const pull = opening?.pulls[index]
  if (!opening || opening.collected || opening.view !== 'face' || index !== opening.revealed - 1 || pull?.kind !== 'car') return
  pull.showEdition = true
  const car = save.cars[pull.id]
  if (car) {
    if (!car.editions.includes(pull.style)) car.editions.push(pull.style)
    car.shown = pull.style
  }
}

export function collect(save: Save) {
  const opening = save.opening
  if (!opening || opening.collected || opening.revealed !== opening.pulls.length) return
  for (const pull of opening.pulls) {
    if (pull.kind === 'car') {
      addCar(save, pull.id, pull.style)
      if (pull.showEdition) save.cars[pull.id].shown = pull.style
    }
    else save.parts[pull.id] = (save.parts[pull.id] ?? 0) + 1
  }
  opening.collected = true
  opening.view = 'recap'
}

// ——— Garage ———

export const prepOf = (save: Save, id: string): Prep => {
  const car = save.cars[id]
  return { stage: car?.stage ?? 0, parts: [...(car?.parts ?? [])], upgrades: { ...car?.upgrades }, ...(car?.extraSlot ? { extraSlot: car.extraSlot } : {}) }
}
export const installedCount = (save: Save, partId: string) => Object.values(save.cars).filter(c => c.parts.includes(partId)).length
export const freeParts = (save: Save, partId: string) => (save.parts[partId] ?? 0) - installedCount(save, partId)
export const lockedInDuel = (save: Save, carId: string) => Boolean(save.duel?.player.lineup.some(c => c.id === carId))
export const totalMountedParts = (save: Save) =>
  Object.entries(save.cars).reduce((sum, [id, car]) => sum + (lockedInDuel(save, id) ? 0 : car.parts.length), 0)

export function uninstallAll(save: Save): string | undefined {
  let count = 0
  for (const [id, car] of Object.entries(save.cars)) {
    if (lockedInDuel(save, id) || !car.parts.length) continue
    count += car.parts.length
    car.parts = []
  }
  if (!count) return t('Aucune pièce démontable pour le moment')
}

export function uninstallPartEverywhere(save: Save, partId: string): string | undefined {
  let count = 0
  for (const [id, car] of Object.entries(save.cars)) {
    if (lockedInDuel(save, id) || !car.parts.includes(partId)) continue
    car.parts = car.parts.filter(p => p !== partId)
    count++
  }
  if (!count) return t('Cette pièce n’est montée sur aucune voiture disponible')
}

export const isCarMaxedForExtraSlot = (car?: OwnedCar) =>
  Boolean(car && car.stage >= 3 && upgradeKeys.every(k => car.upgrades[k] >= partUnlockLevel))

export function extraSlotCheck(save: Save, carId: string, key: StatKey): string | undefined {
  const car = save.cars[carId]
  if (!car) return t('Voiture absente du garage')
  if (!extraSlotFamily[key]) return t('Pas de 3ᵉ pièce sur cet atelier')
  if (!isCarMaxedForExtraSlot(car)) return t('Requiert Stage 3 et les 4 ateliers au niveau 2')
  if (car.extraSlot === key) return t('3ᵉ emplacement déjà débloqué sur cet atelier')
  const previous = car.extraSlot && extraSlotFamily[car.extraSlot]
  if (previous && car.parts.filter(p => partById.get(p)?.family === previous).length > 1) return t('Retire d’abord la 3ᵉ pièce de {workshop}', { workshop: t(upgrades[car.extraSlot!].label) })
  if (save.credits < EXTRA_SLOT_PRICE) return t('Il te manque {n} crédits', { n: EXTRA_SLOT_PRICE - save.credits })
}

export function unlockExtraSlot(save: Save, carId: string, key: StatKey): string | undefined {
  const problem = extraSlotCheck(save, carId, key)
  if (problem) return problem
  save.credits -= EXTRA_SLOT_PRICE
  save.cars[carId].extraSlot = key
}

export function upgradeCheck(save: Save, id: string, key: StatKey): string | undefined {
  const car = save.cars[id]
  if (!car) return t('Voiture absente du garage')
  const level = car.upgrades[key]
  const price = upgradePrices[level]
  if (price === undefined) return t('Niveau maximal atteint')
  if (save.credits < price) return t('Il te manque {n} crédits', { n: price - save.credits })
}

export function upgradeStat(save: Save, id: string, key: StatKey): string | undefined {
  const problem = upgradeCheck(save, id, key)
  if (problem) return problem
  const levels = save.cars[id].upgrades
  const level = levels[key]
  save.credits -= upgradePrices[level]
  levels[key] = level + 1
}

export function stageCost(save: Save, id: string) {
  const car = save.cars[id]
  return car && progression.stages.find(s => s.stage === car.stage + 1)
}

export function upgrade(save: Save, id: string): string | undefined {
  const car = save.cars[id], next = stageCost(save, id)
  if (!car || !next) return t('Préparation maximale atteinte')
  if (save.credits < next.credits) return t('Il manque {n} crédits', { n: next.credits - save.credits })
  if (car.copies - 1 < next.duplicates) return tp('Il faut {n} doublon', 'Il faut {n} doublons', next.duplicates)
  save.credits -= next.credits
  car.copies -= next.duplicates
  car.stage = next.stage
}

// Pièce remplacée au montage : celle de la même famille, sauf quand le 3ᵉ emplacement de l'atelier laisse la place
// à une 2ᵉ pièce de sa famille.
export function partReplacedOnInstall(car: OwnedCar, part: Part): Part | undefined {
  const sameFamily = car.parts.map(id => partById.get(id)!).filter(p => p?.family === part.family)
  const room = car.extraSlot && extraSlotFamily[car.extraSlot] === part.family ? 2 : 1
  return sameFamily.length < room ? undefined : sameFamily[0]
}

export function installCheck(save: Save, carId: string, partId: string): string | undefined {
  const v = vehicleById.get(carId), part = partById.get(partId), car = save.cars[carId]
  if (!v || !part || !car) return t('Pièce ou voiture absente')
  const reason = compatibility(part, v)
  if (reason) return ruleText(reason)
  if (car.parts.includes(partId)) return t('Déjà installée')
  const key = upgradeForFamily(part.family)
  if (key && car.upgrades[key] < partUnlockLevel && !car.parts.some(id => partById.get(id)?.family === part.family)) {
    return t('{workshop} · niveau {level} requis', { workshop: t(upgrades[key].label), level: partUnlockLevel })
  }
  if (freeParts(save, partId) <= 0) return t('Aucun exemplaire libre')
  const toReplace = partReplacedOnInstall(car, part)
  const remaining = toReplace ? car.parts.filter(p => p !== toReplace.id) : car.parts
  if (prepUsed({ stage: car.stage, parts: remaining }) + part.cost > potential(v, car.stage, car.extraSlot)) return t('Potentiel de préparation insuffisant')
}

export function install(save: Save, carId: string, partId: string): string | undefined {
  const problem = installCheck(save, carId, partId)
  if (problem) return problem
  const part = partById.get(partId)!
  const car = save.cars[carId]
  const toReplace = partReplacedOnInstall(car, part)
  car.parts = [...(toReplace ? car.parts.filter(p => p !== toReplace.id) : car.parts), partId]
}

export function uninstall(save: Save, carId: string, partId: string) {
  const car = save.cars[carId]
  if (car) car.parts = car.parts.filter(p => p !== partId)
}

export function craftCheck(save: Save, id: string): string | undefined {
  const v = vehicleById.get(id)
  if (!v?.craft || !v.evolvesFrom) return t('Cette voiture ne se débloque pas au garage')
  if (save.cars[id]) return t('Déjà débloquée')
  const base = save.cars[v.evolvesFrom]
  if (!base) return t('Il faut posséder {car}', { car: `${vehicleById.get(v.evolvesFrom)!.name} ${vehicleById.get(v.evolvesFrom)!.version}` })
  if (base.stage < v.craft.stage) return t('Préparer la version de base au Stage {stage}', { stage: v.craft.stage })
  if (save.credits < v.craft.credits) return t('Il te manque {n} crédits', { n: v.craft.credits - save.credits })
}

export function craft(save: Save, id: string): string | undefined {
  const problem = craftCheck(save, id)
  if (problem) return problem
  save.credits -= vehicleById.get(id)!.craft!.credits
  addCar(save, id, defaultStyle(id))
}

export function scrapCar(save: Save, id: string): string | undefined {
  const car = save.cars[id], v = vehicleById.get(id)
  if (!car || !v || car.copies < 2) return t('Aucun doublon')
  car.copies--
  save.credits += progression.scrap[v.rarity]
}

// La vente porte sur toute la voiture, doublons compris ; ses pièces restent au stock.
export function sellPrice(save: Save, id: string): number {
  const car = save.cars[id], v = vehicleById.get(id)
  if (!car || !v) return 0
  const spent = upgradeKeys.reduce((total, key) =>
    total + upgradePrices.slice(0, car.upgrades[key]).reduce((sum, price) => sum + price, 0), 0)
  return progression.scrap[v.rarity] * (2 + car.copies - 1) + 10 * car.stage + Math.floor(spent / 2)
}

export function sellCheck(save: Save, id: string): string | undefined {
  if (!save.cars[id]) return t('Voiture absente du garage')
  if (save.night?.lineup.includes(id)) return t('Cette voiture est engagée dans ta Nuit sans fin en cours')
  if (save.nightLineup.includes(id)) return t('Retire cette voiture de l’écurie Nuit sans fin avant de la vendre')
  if (save.lineup.includes(id)) return t('Retire cette voiture de ton écurie avant de la vendre')
  if (save.dailyLineup?.includes(id)) return t('Retire cette voiture de l’écurie du défi du jour avant de la vendre')
  if (save.duel?.player.lineup.some(car => car.id === id)) return t('Cette voiture est engagée dans une course en cours')
  if (Object.keys(save.cars).length <= 3) return t('Tu dois garder au moins trois voitures dans ton garage')
}

export function sellCar(save: Save, id: string): string | undefined {
  const problem = sellCheck(save, id)
  if (problem) return problem
  const price = sellPrice(save, id)
  delete save.cars[id]
  save.credits += price
}

export function scrapPart(save: Save, id: string): string | undefined {
  const part = partById.get(id)
  if (!part || freeParts(save, id) <= 0) return t('Aucun exemplaire libre')
  save.parts[id]--
  save.credits += Math.round(progression.scrap[part.rarity] / 2)
}

// ——— Styles & Éditions ———

export const editionPrices: Record<Rarity, number> = { Courante: 40, Rare: 75, Épique: 120, Légendaire: 200 }
// Débloquer une édition coûte aussi deux doublons de la carte (un exemplaire reste toujours).
export const editionDuplicates = 2
export const editionPrice = (id: string) => {
  const v = vehicleById.get(id)
  return v ? editionPrices[v.rarity] : 60
}

export function selectEdition(save: Save, id: string, style: EditionStyle): string | undefined {
  const car = save.cars[id]
  if (!car) return t('Voiture absente du garage')
  if (!car.editions.includes(style)) return t('Style non débloqué')
  car.shown = style
}

export function unlockEditionCheck(save: Save, id: string, style: EditionStyle): string | undefined {
  const car = save.cars[id], v = vehicleById.get(id)
  if (!car || !v) return t('Voiture absente du garage')
  if (!stylesOf(id).includes(style)) return t('Style indisponible pour cette voiture')
  if (car.editions.includes(style)) return t('Style déjà débloqué')
  const missing: string[] = []
  const credits = editionPrice(id) - save.credits
  const duplicates = editionDuplicates - (car.copies - 1)
  if (credits > 0) missing.push(t('Il te manque {n} crédits', { n: credits }))
  if (duplicates > 0) missing.push(tp('Il te manque {n} doublon', 'Il te manque {n} doublons', duplicates))
  if (missing.length) return missing.join(' · ')
}

export function unlockEdition(save: Save, id: string, style: EditionStyle): string | undefined {
  const problem = unlockEditionCheck(save, id, style)
  if (problem) return problem
  const car = save.cars[id]
  save.credits -= editionPrice(id)
  car.copies -= editionDuplicates
  car.editions.push(style)
  car.shown = style
}

// ——— Amélioration automatique ———

export interface AutoUpgradePlan {
  credits: number
  duplicates: number
  steps: string[]
  statChanges: { key: StatKey; label: string; before: number; after: number }[]
  staminaBefore: number
  staminaAfter: number
  potentialBefore: number
  potentialAfter: number
  installedParts: string[]
  stageAfter: number
  upgradesAfter: Record<StatKey, number>
  partsAfter: string[]
  summary: string
  blockedReason?: string
}

const partScore = (p: Part, priority: StatKey[]) => {
  const statBonus = Object.entries(p.stats ?? {}).reduce((sum, [k, val]) => {
    const rank = Math.max(0, 4 - priority.indexOf(k as StatKey))
    return sum + (val ?? 0) * (1 + rank * 0.15)
  }, 0)
  const effectBonus = (p.effects ?? []).reduce((sum, e) => sum + e.value * 0.9, 0)
  return statBonus + effectBonus + rarities.indexOf(p.rarity) * 0.2
}

function statPriority(id: string, circuit?: Rival['circuit'], suggestedStat?: StatKey): StatKey[] {
  const v = vehicleById.get(id)!
  const circuitOrder = circuit ? circuitPriorities(circuit).map(p => p.stat) : []
  return [...upgradeKeys].sort((a, b) => {
    if (suggestedStat && (a === suggestedStat) !== (b === suggestedStat)) return a === suggestedStat ? -1 : 1
    const ca = circuitOrder.indexOf(a), cb = circuitOrder.indexOf(b)
    if (ca !== -1 || cb !== -1) {
      if (ca === -1) return 1
      if (cb === -1) return -1
      if (ca !== cb) return ca - cb
    }
    return v.stats[b] - v.stats[a]
  })
}

export function autoUpgradePlan(save: Save, id: string, circuit?: Rival['circuit'], suggestedStat?: StatKey): AutoUpgradePlan | undefined {
  const v = vehicleById.get(id), car = save.cars[id]
  if (!v || !car) return
  const priority = statPriority(id, circuit, suggestedStat)
  const beforePrep = prepOf(save, id)
  const beforeStats = statsOf(v, beforePrep)
  const staminaBefore = engagements(v, beforePrep)
  const potentialBefore = potential(v, car.stage, car.extraSlot)

  // Clone léger de la sauvegarde pour simuler les actions réelles dans l'ordre le plus rentable.
  const sim: Save = {
    ...save,
    credits: save.credits,
    cars: Object.fromEntries(Object.entries(save.cars).map(([k, c]) => [k, { ...c, parts: [...c.parts], editions: [...c.editions], upgrades: { ...c.upgrades } }])),
    parts: { ...save.parts },
  }
  const simCar = sim.cars[id]
  const steps: string[] = []
  const installedNames: string[] = []

  const fitBestParts = () => {
    for (const key of priority) {
      for (const family of upgrades[key].families) {
        const candidates = parts
          .filter(p => p.family === family && !compatibility(p, v) && (freeParts(sim, p.id) > 0 || simCar.parts.includes(p.id)))
          .sort((a, b) => partScore(b, priority) - partScore(a, priority))
        const current = simCar.parts.map(pid => partById.get(pid)!).find(p => p?.family === family)
        for (const candidate of candidates) {
          if (current && (candidate.id === current.id || partScore(candidate, priority) <= partScore(current, priority))) break
          if (!install(sim, id, candidate.id)) {
            installedNames.push(candidate.name)
            steps.push(t('Monter {name} ({text})', { name: t(candidate.name), text: t(candidate.text) }))
            break
          }
        }
      }
    }
  }

  // 1. Monter d'abord les pièces compatibles déjà débloquées gratuitement.
  fitBestParts()

  // 2. Privilégier les groupes d'atelier où une pièce compatible est en stock, puis les statistiques prioritaires.
  const orderedKeys = [...priority].sort((a, b) => {
    const hasPart = (key: StatKey) => parts.some(p => upgrades[key].families.includes(p.family) && !compatibility(p, v) && freeParts(sim, p.id) > 0 && !simCar.parts.includes(p.id))
    return Number(hasPart(b)) - Number(hasPart(a))
  })

  for (const key of orderedKeys) {
    const startLevel = simCar.upgrades[key]
    while (simCar.upgrades[key] < partUnlockLevel) {
      const currentStats = statsOf(v, prepOf(sim, id))
      const hasCompatibleFree = parts.some(p => upgrades[key].families.includes(p.family) && !compatibility(p, v) && freeParts(sim, p.id) > 0 && !simCar.parts.includes(p.id))
      if (currentStats[key] >= STAT_CAP && !hasCompatibleFree) break
      if (upgradeStat(sim, id, key)) break
    }
    if (simCar.upgrades[key] > startLevel) {
      steps.push(t('{workshop} → niv. {level}', { workshop: t(upgrades[key].label), level: simCar.upgrades[key] }))
      fitBestParts()
    }
  }

  // 3. Si une pièce en stock manque de potentiel ou si les groupes utiles sont montés, tenter un passage de Stage.
  const needsPotentialForStock = parts.some(p => {
    const key = upgradeForFamily(p.family)
    return !compatibility(p, v) && freeParts(sim, p.id) > 0 && !simCar.parts.includes(p.id)
      && key && simCar.upgrades[key] >= partUnlockLevel
      && installCheck(sim, id, p.id) === t('Potentiel de préparation insuffisant')
  })
  const allWorkshopMaxed = upgradeKeys.every(k => simCar.upgrades[k] >= partUnlockLevel || statsOf(v, prepOf(sim, id))[k] >= STAT_CAP)
  if ((needsPotentialForStock || allWorkshopMaxed || !steps.length) && !upgrade(sim, id)) {
    steps.push(t('Passer au Stage {stage}', { stage: simCar.stage }))
    fitBestParts()
  }

  const afterPrep = prepOf(sim, id)
  const afterStats = statsOf(v, afterPrep)
  const staminaAfter = engagements(v, afterPrep)
  const potentialAfter = potential(v, simCar.stage, simCar.extraSlot)
  const statChanges = upgradeKeys
    .filter(k => afterStats[k] !== beforeStats[k])
    .map(k => ({ key: k, label: t(statLabels[k]), before: beforeStats[k], after: afterStats[k] }))

  const credits = save.credits - sim.credits
  const duplicates = car.copies - simCar.copies

  // Si aucune étape n'a pu être financée, expliquer clairement la prochaine amélioration bloquée.
  let blockedReason: string | undefined
  if (!steps.length) {
    const nextWorkshop = orderedKeys.find(k => car.upgrades[k] < partUnlockLevel && beforeStats[k] < STAT_CAP)
    if (nextWorkshop) {
      const price = upgradePrices[car.upgrades[nextWorkshop]]
      blockedReason = t('Prochaine étape : {workshop} niv. {level} (+1 {stat}) · il manque {n} crédits', { workshop: t(upgrades[nextWorkshop].label), level: car.upgrades[nextWorkshop] + 1, stat: t(statLabels[nextWorkshop]), n: price - save.credits })
    } else {
      const nextStage = stageCost(save, id)
      if (nextStage) {
        const problem = upgrade(sim, id)
        blockedReason = t('Prochaine étape : Stage {stage} ({text}) · {problem}', { stage: nextStage.stage, text: t(nextStage.text), problem: String(problem) })
      } else {
        blockedReason = t('Voiture déjà préparée au maximum avec les pièces de ton stock.')
      }
    }
  }

  const summaryParts = [...steps]
  if (staminaAfter > staminaBefore) summaryParts.push(tp('+{n} secteur avant surchauffe', '+{n} secteurs avant surchauffe', staminaAfter - staminaBefore))
  return {
    credits,
    duplicates,
    steps,
    statChanges,
    staminaBefore,
    staminaAfter,
    potentialBefore,
    potentialAfter,
    installedParts: installedNames,
    stageAfter: simCar.stage,
    upgradesAfter: simCar.upgrades,
    partsAfter: simCar.parts,
    summary: summaryParts.join(' · '),
    blockedReason,
  }
}

export function applyAutoUpgrade(save: Save, id: string, circuit?: Rival['circuit'], suggestedStat?: StatKey): string | undefined {
  const plan = autoUpgradePlan(save, id, circuit, suggestedStat)
  if (!plan) return t('Voiture absente du garage')
  if (!plan.steps.length) return plan.blockedReason ?? t('Aucune amélioration disponible')
  const car = save.cars[id]
  save.credits -= plan.credits
  car.copies -= plan.duplicates
  car.stage = plan.stageAfter
  car.upgrades = { ...plan.upgradesAfter }
  car.parts = [...plan.partsAfter]
}

// ——— Duels ———

export function lineupCheck(save: Save, ids: string[], rivalId: string): string | undefined {
  const rival = rivalById.get(rivalId), league = rival && leagueById.get(rival.league)
  if (!rival || (!league && !specialByRivalId.has(rivalId))) return t('Rival inconnu')
  if (specialByRivalId.has(rivalId) && !unlockedSpecials(save).includes(rivalId)) return t('Palier verrouillé')
  if (rival.baseRivalId && !unlockedRivalSteps(save, rival.baseRivalId).includes(rivalId)) return t('Étape verrouillée')
  const cap = rival.cap ?? league!.cap
  if (ids.length !== 3 || new Set(ids).size !== 3) return t('Choisis trois voitures différentes')
  if (ids.some(id => !save.cars[id])) return t('Voiture absente du garage')
  const cost = lineupCost(ids)
  if (cost > cap) return t('Écurie trop chère : {cost} / {cap}', { cost, cap })
}

export function startDuel(save: Save, rivalId: string, rng: Rng): string | undefined {
  if (save.night || save.duel) return t('Termine d’abord la course en cours')
  const problem = lineupCheck(save, save.lineup, rivalId)
  if (problem) return problem
  save.duel = createDuel(rivalId, save.lineup.map(id => ({ id, prep: prepOf(save, id) })), rng)
  save.duel.pilot = save.preferences.timingMode && save.preferences.pilotMode === 'manuel'
    ? { mode: 'manuel', turn: save.preferences.turnMode === true }
    : { mode: 'auto' }
}

export interface Reward { credits: number; ticket?: string; perfect?: true; perfectTicket?: string; car?: string }
export function settleDuel(save: Save): Reward | undefined {
  const duel = save.duel
  if (!duel?.winner) return
  const perfect = duel.winner === 'player' && duel.player.points === duel.sectors.length
  if (duel.rivalId.startsWith('daily:')) {
    refreshDaily(save)
    const date = duel.rivalId.slice(6)
    const reward: Reward = perfect ? { credits: 0, perfect: true } : { credits: 0 }
    if (duel.winner === 'player' && date === save.daily.date && !save.daily.won) {
      save.daily.streak = save.daily.lastWin === previousDate(date) ? save.daily.streak + 1 : 1
      save.daily.lastWin = date
      save.daily.won = true
      reward.credits = dailyChallenge(date).reward * (perfect ? 2 : 1)
      save.credits += reward.credits
    }
    save.duel = null
    return reward
  }
  const rival = rivalById.get(duel.rivalId)!
  const record = save.record[rival.id] ??= { wins: 0, losses: 0, perfect: false }
  if (specialByRivalId.has(rival.id)) {
    const first = record.wins === 0
    const reward: Reward = { credits: 0 }
    if (duel.winner === 'player') {
      reward.credits = first ? rival.reward! * (perfect ? 2 : 1) : rival.replay!
      if (perfect) { record.perfect = true; if (first) reward.perfect = true }
      if (first && rival.completionTicket) reward.ticket = rival.completionTicket
      record.wins++
    } else if (duel.winner === 'rival') record.losses++
    save.credits += reward.credits
    if (reward.ticket) save.tickets[reward.ticket] = (save.tickets[reward.ticket] ?? 0) + 1
    save.duel = null
    return reward
  }
  const league = leagueById.get(rival.league)!
  const first = record.wins === 0
  let reward: Reward
  if (duel.winner === 'player') {
    const baseCredits = first ? (rival.reward ?? league.reward) : (rival.replay ?? league.reward)
    const ticketId = rival.completionTicket ?? league.ticket
    reward = { credits: baseCredits }
    if (first && ticketId) reward.ticket = ticketId
    if (first && rival.rewardCar && !save.cars[rival.rewardCar]) {
      addCar(save, rival.rewardCar, defaultStyle(rival.rewardCar))
      reward.car = rival.rewardCar
    }
    if (perfect) {
      reward.perfect = true
      reward.credits *= 2
      reward.perfectTicket = ticketId
      record.perfect = true
    }
    record.wins++
  } else {
    reward = { credits: duel.winner === 'tie' ? Math.round((rival.reward ?? league.reward) / 2) : 30 }
    if (duel.winner === 'rival') record.losses++
  }
  save.credits += reward.credits
  if (reward.ticket) save.tickets[reward.ticket] = (save.tickets[reward.ticket] ?? 0) + 1
  if (reward.perfectTicket) save.tickets[reward.perfectTicket] = (save.tickets[reward.perfectTicket] ?? 0) + 1
  save.duel = null
  return reward
}

export const specialsOpen = (save: Save) => rivals.filter(r => r.league === 'neon').every(r => (save.record[r.id]?.wins ?? 0) > 0)
export const unlockedSpecials = (save: Save) => specialsOpen(save) ? specials.flatMap(s => s.tiers.filter((r, i) => i === 0 || (save.record[s.tiers[i - 1].id]?.wins ?? 0) > 0).map(r => r.id)) : []

export const unlockedRivals = (save: Save) => {
  const order = rivals
  return order.filter((r, i) => i === 0 || (save.record[order[i - 1].id]?.wins ?? 0) > 0).map(r => r.id)
}

export const unlockedRivalSteps = (save: Save, baseRivalId: string): string[] => {
  if (!unlockedRivals(save).includes(baseRivalId)) return []
  const steps = rivalStepMap.get(baseRivalId) ?? []
  const bossWon = (save.record[baseRivalId]?.wins ?? 0) > 0
  return steps.filter((step, idx) => idx === 0 || bossWon || (save.record[steps[idx - 1].id]?.wins ?? 0) > 0).map(s => s.id)
}

export const rivalStepsDone = (save: Save, baseRivalId: string): number => {
  const steps = rivalStepMap.get(baseRivalId) ?? []
  if ((save.record[baseRivalId]?.wins ?? 0) > 0) return steps.length
  return steps.filter(s => (save.record[s.id]?.wins ?? 0) > 0).length
}

export const currentRivalStep = (save: Save, baseRivalId: string): string => {
  const steps = rivalStepMap.get(baseRivalId) ?? []
  if ((save.record[baseRivalId]?.wins ?? 0) > 0) return baseRivalId
  const next = steps.find(s => !(save.record[s.id]?.wins ?? 0))
  return next ? next.id : baseRivalId
}

// Défi du jour vu par ce joueur : la contrainte tient compte des voitures qu'il possède.
export const todayChallenge = (save: Save, date = save.daily.date) => dailyChallenge(date, Object.keys(save.cars))

export function refreshDaily(save: Save, date = localDate()) {
  if (save.daily.date === date) return
  save.daily.date = date
  save.daily.won = false
  save.daily.booster = false
  if (save.daily.lastWin !== previousDate(date)) save.daily.streak = 0
}
export function claimDailyBooster(save: Save) {
  refreshDaily(save)
  if (save.daily.booster) return t('Reviens demain')
  save.daily.booster = true
  save.tickets.neon = (save.tickets.neon ?? 0) + 1
}
export function dailyLineupCheck(save: Save) {
  if ((save.dailyLineup ?? []).some(id => !save.cars[id])) return t('Voiture absente du garage')
  return constraintCheck(save.dailyLineup ?? [], todayChallenge(save).constraint)
}
export function prepareDaily(save: Save) {
  refreshDaily(save)
  save.dailyLineup = validDailyLineup(Object.keys(save.cars), todayChallenge(save).constraint) ?? []
}
export function startDaily(save: Save) {
  if (save.night || save.duel) return t('Termine d’abord la course en cours')
  refreshDaily(save)
  const problem = dailyLineupCheck(save)
  if (problem) return problem
  const challenge = todayChallenge(save)
  save.duel = createRace(challenge.rival.id, challenge.rival.circuit, (save.dailyLineup ?? []).map(id => ({ id, prep: prepOf(save, id) })), rivalLineup(challenge.rival), dailyRng(challenge.date))
}

// Les récompenses restent acquises même si une voiture est vendue ensuite.
export const seriesProgress = (save: Save, entry: (typeof series)[number]) => entry.vehicles.filter(id => Boolean(save.cars[id])).length
export const seriesComplete = (save: Save, entry: (typeof series)[number]) => seriesProgress(save, entry) === entry.vehicles.length
export function claimSeries(save: Save, id: string): string | undefined {
  const entry = series.find(s => s.id === id)
  if (!entry) return t('Série inconnue')
  if (save.series.includes(id)) return t('Récompense déjà récupérée')
  if (!seriesComplete(save, entry)) return t('Réunis toutes les voitures de cette série')
  save.series.push(id)
  save.credits += entry.reward.credits
  if (entry.reward.ticket) save.tickets[entry.reward.ticket] = (save.tickets[entry.reward.ticket] ?? 0) + 1
}

// ——— Nuit sans fin ———
export function nightLineupCheck(save: Save) {
  if (save.nightLineup.some(id => !save.cars[id])) return t('Voiture absente du garage')
  return constraintCheck(save.nightLineup, { type: 'cost', cap: NIGHT_CAP })
}
export function createNightRound(save: Save) {
  const night = save.night
  if (!night || save.duel) return
  const rival = nightRival(night.seed, night.round)
  save.duel = createRace(rival.id, rival.circuit, night.lineup.map(id => ({ id, prep: prepOf(save, id) })), rivalLineup(rival), dailyRng(`${night.seed}:${night.round}`))
  night.resting = false
}
export function startNight(save: Save, seed = String(Date.now())) {
  if (save.duel || save.night) return t('Termine d’abord la course en cours')
  const problem = nightLineupCheck(save)
  if (problem) return problem
  save.night = { seed, round: 1, wins: 0, gains: 0, lineup: [...save.nightLineup], resting: false, newRecord: false }
  createNightRound(save)
}
export function finishNight(save: Save) {
  const night = save.night
  if (!night) return
  save.credits += night.gains
  save.night = null
  save.duel = null
  return { wins: night.wins, credits: night.gains, newRecord: night.newRecord }
}
export function settleNight(save: Save) {
  const night = save.night, duel = save.duel
  if (!night || !duel?.winner) return
  if (duel.winner !== 'player') return finishNight(save)
  night.wins++
  night.gains += nightReward(night.round)
  night.newRecord = night.wins > save.nightRecord
  save.nightRecord = Math.max(save.nightRecord, night.wins)
  night.round++
  night.resting = true
  save.duel = null
}
