// Sauvegarde locale, économie du garage et tirage des boosters.
import { constraintCheck, dailyChallenge, dailyRng, localDate, previousDate, validDailyLineup } from './daily'
import {
  series, boosterById, defaultStyle, leagueById, partById, parts, progression, rarities, rivalById, stylesOf, vehicleById, vehicles,
  type Booster, type EditionStyle, type Rarity, type StatKey,
} from './data'
import { compatibility, createRace, rivalLineup, createDuel, lineupCost, partUnlockLevel, potential, prepUsed, racer,
  upgradeForFamily, upgradeKeys, upgradePrices, upgrades, type Duel, type Prep, type Rng } from './rules'

export const SAVE_KEY = 'garageverse:v2'
export const LEGACY_KEY = 'garageverse:v1'

export interface OwnedCar { copies: number; stage: number; parts: string[]; editions: EditionStyle[]; shown: EditionStyle; favorite: boolean; upgrades: Record<StatKey, number> }
export type Pull = { kind: 'car'; id: string; style: EditionStyle; isNew: boolean; showEdition?: boolean } | { kind: 'part'; id: string; isNew: boolean }
export interface Opening { booster: string; pulls: Pull[]; revealed: number; view: 'back' | 'face' | 'recap'; collected: boolean }
// Thème d'interface : 'neon' est le style d'origine, les autres se choisissent dans les Réglages.
export const themeIds = ['neon', 'pixel', 'sobre', 'sport', 'carnet', 'arcade', 'console', 'dos'] as const
export type ThemeId = (typeof themeIds)[number]
export interface Preferences { sound: boolean; reducedMotion: boolean; vibration: boolean; theme: ThemeId }
export type Discovery = 'nitro' | 'heat' | 'daily' | 'perfect' | 'series'
export interface Tutorial { step: number; status: 'active' | 'done' | 'skipped'; seen: Discovery[] }
export const tutorialSteps = 12
export interface Save {
  series: string[]
  tutorial: Tutorial
  version: 2
  daily: { date: string; won: boolean; booster: boolean; streak: number; lastWin: string }
  credits: number
  tickets: Record<string, number>
  cars: Record<string, OwnedCar>
  parts: Record<string, number>
  sealed: string | null
  opening: Opening | null
  dailyLineup?: string[]
  lineup: string[]
  record: Record<string, { wins: number; losses: number; perfect: boolean }>
  duel: Duel | null
  preferences: Preferences
}

export function newSave(): Save {
  const start = progression.start
  const save: Save = {
    series: [],
    tutorial: { step: 0, status: 'active', seen: [] },
    version: 2, daily: { date: localDate(), won: false, booster: false, streak: 0, lastWin: '' }, credits: start.credits, tickets: { ...start.tickets }, cars: {}, parts: {}, sealed: null, opening: null,
    lineup: [...start.vehicles], record: {}, duel: null, preferences: { sound: true, reducedMotion: false, vibration: true, theme: 'neon' },
  }
  for (const id of start.vehicles) addCar(save, id, defaultStyle(id))
  for (const id of start.parts) save.parts[id] = (save.parts[id] ?? 0) + 1
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
    if (old.preferences) save.preferences = { ...save.preferences, ...old.preferences }
  } catch { /* ancienne sauvegarde illisible : on repart du garage de départ */ }
}

const int = (value: unknown, min: number, max: number, fallback: number) =>
  Number.isInteger(value) ? Math.max(min, Math.min(max, value as number)) : fallback

export function readSave(raw: string | null, legacy: string | null = null): Save {
  const save = newSave()
  let input: Partial<Save> | null = null
  try { input = JSON.parse(raw ?? 'null') } catch { input = null }
  if (input?.version !== 2) { migrate(legacy, save); return save }

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
    const installed: string[] = []
    for (const partId of car.parts ?? []) {
      const part = partById.get(partId)
      if (part && !compatibility(part, v) && !installed.some(p => partById.get(p)?.family === part.family)) installed.push(partId)
    }
    const levels = { acc: 0, vit: 0, man: 0, end: 0 }
    for (const key of upgradeKeys) levels[key] = int(car.upgrades?.[key], 0, partUnlockLevel, 0)
    save.cars[id] = { copies: int(car.copies, 1, 999, 1), stage, parts: installed, editions,
      shown: editions.includes(car.shown) ? car.shown : editions[0],
      favorite: car.favorite === true, upgrades: levels }
  }
  save.parts = Object.fromEntries(Object.entries(input.parts ?? {}).filter(([id]) => partById.has(id)).map(([id, n]) => [id, int(n, 0, 999, 0)]))
  save.sealed = typeof input.sealed === 'string' && boosterById.has(input.sealed) ? input.sealed : null
  const o = input.opening
  if (o && boosterById.has(o.booster) && Array.isArray(o.pulls) && o.pulls.length === 5 &&
      o.pulls.every(p => p.kind === 'car' ? vehicleById.has(p.id) : partById.has(p.id))) {
    const revealed = o.collected ? 5 : int(o.revealed, 0, 5, 0)
    save.opening = { booster: o.booster, pulls: o.pulls, revealed, collected: Boolean(o.collected),
      view: o.collected || (revealed === 5 && o.view === 'recap') ? 'recap' : revealed && (o.view === 'face' || revealed === 5) ? 'face' : 'back' }
  }
  save.dailyLineup = input.dailyLineup?.filter(id => Boolean(save.cars[id])).slice(0, 3)
  save.lineup = (input.lineup ?? []).filter(id => save.cars[id]).slice(0, 3)
  save.record = Object.fromEntries(Object.entries(input.record ?? {}).filter(([id]) => rivalById.has(id)).map(([id, record]) => [id, {
    wins: int(record?.wins, 0, 100000, 0), losses: int(record?.losses, 0, 100000, 0), perfect: record?.perfect === true,
  }]))
  try {
    const duel = input.duel
    if (duel && (rivalById.has(duel.rivalId) || /^daily:\d{4}-\d{2}-\d{2}$/.test(duel.rivalId)) && Array.isArray(duel.rounds) && duel.rounds.length <= duel.sectors.length) {
      for (const who of ['player', 'rival'] as const) duel[who].lineup = duel[who].lineup.map(r => racer(r.id, r.prep))
      save.duel = duel
    }
  } catch { save.duel = null }
  const tutorial = input.tutorial
  if (tutorial) save.tutorial = {
    step: int(tutorial.step, 0, tutorialSteps - 1, 0),
    status: tutorial.status === 'done' || tutorial.status === 'skipped' ? tutorial.status : 'active',
    seen: (['nitro', 'heat', 'daily', 'perfect', 'series'] as const).filter(key => Array.isArray(tutorial.seen) && tutorial.seen.includes(key)),
  }
  else if (Object.keys(save.record).length || save.duel?.rounds.length || save.daily.won || save.daily.lastWin) save.tutorial.status = 'done'
  save.preferences = {
    sound: input.preferences?.sound !== false,
    reducedMotion: input.preferences?.reducedMotion === true,
    vibration: input.preferences?.vibration !== false,
    theme: themeIds.find(id => id === input.preferences?.theme) ?? 'neon',
  }
  return save
}

// ——— Boosters ———

export function buyBooster(save: Save, id: string): string | undefined {
  const booster = boosterById.get(id)
  if (!booster) return 'Booster inconnu'
  if (save.sealed || (save.opening && !save.opening.collected)) return 'Termine d’abord le booster en cours'
  if ((save.tickets[id] ?? 0) > 0) save.tickets[id]--
  else if (save.credits >= booster.price) save.credits -= booster.price
  else return `Il manque ${booster.price - save.credits} crédits`
  save.sealed = id
  save.opening = null
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
  let drewPart = false
  return booster.slots.map(slot => {
    const isPart = !drewPart && rng() < slot.partChance
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
      drewPart = true
      const part = weighted(nearest(parts), () => 1, rng)
      const pull: Pull = { kind: 'part', id: part.id, isNew: !owned(save, { kind: 'part', id: part.id }) && !seen.has(`part:${part.id}`) }
      seen.add(`part:${part.id}`)
      return pull
    }
    const pool = nearest(vehicles.filter(v => !v.craft))
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

export function tear(save: Save, rng: Rng) {
  if (!save.sealed) return
  const booster = boosterById.get(save.sealed)!
  save.opening = { booster: booster.id, pulls: drawPulls(save, booster, rng), revealed: 0, view: 'back', collected: false }
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
  return { stage: car?.stage ?? 0, parts: [...(car?.parts ?? [])], upgrades: { ...car?.upgrades } }
}
export const installedCount = (save: Save, partId: string) => Object.values(save.cars).filter(c => c.parts.includes(partId)).length
export const freeParts = (save: Save, partId: string) => (save.parts[partId] ?? 0) - installedCount(save, partId)

export function upgradeCheck(save: Save, id: string, key: StatKey): string | undefined {
  const car = save.cars[id]
  if (!car) return 'Voiture absente du garage'
  const level = car.upgrades[key]
  const price = upgradePrices[level]
  if (price === undefined) return 'Niveau maximal atteint'
  if (save.credits < price) return `Il manque ${price - save.credits} crédits`
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
  if (!car || !next) return 'Préparation maximale atteinte'
  if (save.credits < next.credits) return `Il manque ${next.credits - save.credits} crédits`
  if (car.copies - 1 < next.duplicates) return `Il faut ${next.duplicates} doublon${next.duplicates > 1 ? 's' : ''}`
  save.credits -= next.credits
  car.copies -= next.duplicates
  car.stage = next.stage
}

export function installCheck(save: Save, carId: string, partId: string): string | undefined {
  const v = vehicleById.get(carId), part = partById.get(partId), car = save.cars[carId]
  if (!v || !part || !car) return 'Pièce ou voiture absente'
  const reason = compatibility(part, v)
  if (reason) return reason
  if (car.parts.includes(partId)) return 'Déjà installée'
  const key = upgradeForFamily(part.family)
  if (key && car.upgrades[key] < partUnlockLevel && !car.parts.some(id => partById.get(id)?.family === part.family)) {
    return `${upgrades[key].label} · niveau ${partUnlockLevel} requis`
  }
  if (freeParts(save, partId) <= 0) return 'Aucun exemplaire libre'
  const replaced = car.parts.filter(p => partById.get(p)?.family !== part.family)
  if (prepUsed({ stage: car.stage, parts: replaced }) + part.cost > potential(v, car.stage)) return 'Potentiel de préparation insuffisant'
}

export function install(save: Save, carId: string, partId: string): string | undefined {
  const problem = installCheck(save, carId, partId)
  if (problem) return problem
  const family = partById.get(partId)!.family
  const car = save.cars[carId]
  car.parts = [...car.parts.filter(p => partById.get(p)?.family !== family), partId]
}

export function uninstall(save: Save, carId: string, partId: string) {
  const car = save.cars[carId]
  if (car) car.parts = car.parts.filter(p => p !== partId)
}

export function craftCheck(save: Save, id: string): string | undefined {
  const v = vehicleById.get(id)
  if (!v?.craft || !v.evolvesFrom) return 'Cette voiture ne se débloque pas au garage'
  if (save.cars[id]) return 'Déjà débloquée'
  const base = save.cars[v.evolvesFrom]
  if (!base) return `Il faut posséder ${vehicleById.get(v.evolvesFrom)!.name} ${vehicleById.get(v.evolvesFrom)!.version}`
  if (base.stage < v.craft.stage) return `Préparer la version de base au Stage ${v.craft.stage}`
  if (save.credits < v.craft.credits) return `Il manque ${v.craft.credits - save.credits} crédits`
}

export function craft(save: Save, id: string): string | undefined {
  const problem = craftCheck(save, id)
  if (problem) return problem
  save.credits -= vehicleById.get(id)!.craft!.credits
  addCar(save, id, defaultStyle(id))
}

export function scrapCar(save: Save, id: string): string | undefined {
  const car = save.cars[id], v = vehicleById.get(id)
  if (!car || !v || car.copies < 2) return 'Aucun doublon'
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
  if (!save.cars[id]) return 'Voiture absente du garage'
  if (save.lineup.includes(id)) return 'Retire cette voiture de ton écurie avant de la vendre'
  if (save.dailyLineup?.includes(id)) return 'Retire cette voiture de l’écurie du défi du jour avant de la vendre'
  if (save.duel?.player.lineup.some(car => car.id === id)) return 'Cette voiture est engagée dans une course en cours'
  if (Object.keys(save.cars).length <= 3) return 'Tu dois garder au moins trois voitures dans ton garage'
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
  if (!part || freeParts(save, id) <= 0) return 'Aucun exemplaire libre'
  save.parts[id]--
  save.credits += Math.round(progression.scrap[part.rarity] / 2)
}

// ——— Duels ———

export function lineupCheck(save: Save, ids: string[], rivalId: string): string | undefined {
  const rival = rivalById.get(rivalId), league = rival && leagueById.get(rival.league)
  if (!rival || !league) return 'Rival inconnu'
  if (ids.length !== 3 || new Set(ids).size !== 3) return 'Choisis trois voitures différentes'
  if (ids.some(id => !save.cars[id])) return 'Voiture absente du garage'
  const cost = lineupCost(ids)
  if (cost > league.cap) return `Écurie trop chère : ${cost} / ${league.cap}`
}

export function startDuel(save: Save, rivalId: string, rng: Rng): string | undefined {
  const problem = lineupCheck(save, save.lineup, rivalId)
  if (problem) return problem
  save.duel = createDuel(rivalId, save.lineup.map(id => ({ id, prep: prepOf(save, id) })), rng)
}

export interface Reward { credits: number; ticket?: string; perfect?: true; perfectTicket?: string }
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
  const rival = rivalById.get(duel.rivalId)!, league = leagueById.get(rival.league)!
  const record = save.record[rival.id] ??= { wins: 0, losses: 0, perfect: false }
  let reward: Reward
  if (duel.winner === 'player') {
    reward = { credits: league.reward }
    if (record.wins === 0) reward.ticket = league.id === 'neon' ? 'neon' : league.id === 'chrome' ? 'night' : 'overdrive'
    if (perfect) {
      reward.perfect = true
      reward.credits *= 2
      reward.perfectTicket = league.id === 'neon' ? 'neon' : league.id === 'chrome' ? 'night' : 'overdrive'
      record.perfect = true
    }
    record.wins++
  } else {
    reward = { credits: duel.winner === 'tie' ? Math.round(league.reward / 2) : 30 }
    if (duel.winner === 'rival') record.losses++
  }
  save.credits += reward.credits
  if (reward.ticket) save.tickets[reward.ticket] = (save.tickets[reward.ticket] ?? 0) + 1
  if (reward.perfectTicket) save.tickets[reward.perfectTicket] = (save.tickets[reward.perfectTicket] ?? 0) + 1
  save.duel = null
  return reward
}

export const unlockedRivals = (save: Save) => {
  const order = [...rivalById.values()]
  return order.filter((r, i) => i === 0 || (save.record[order[i - 1].id]?.wins ?? 0) > 0).map(r => r.id)
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
  if (save.daily.booster) return 'Reviens demain'
  save.daily.booster = true
  save.tickets.neon = (save.tickets.neon ?? 0) + 1
}
export function dailyLineupCheck(save: Save) {
  if ((save.dailyLineup ?? []).some(id => !save.cars[id])) return 'Voiture absente du garage'
  return constraintCheck(save.dailyLineup ?? [], todayChallenge(save).constraint)
}
export function prepareDaily(save: Save) {
  refreshDaily(save)
  save.dailyLineup = validDailyLineup(Object.keys(save.cars), todayChallenge(save).constraint) ?? []
}
export function startDaily(save: Save) {
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
  if (!entry) return 'Série inconnue'
  if (save.series.includes(id)) return 'Récompense déjà récupérée'
  if (!seriesComplete(save, entry)) return 'Réunis toutes les voitures de cette série'
  save.series.push(id)
  save.credits += entry.reward.credits
  if (entry.reward.ticket) save.tickets[entry.reward.ticket] = (save.tickets[entry.reward.ticket] ?? 0) + 1
}
