// Règles locales des échanges. L'appelant coordonne la décision finale entre garages.
import { t } from '../i18n'
import { partById, stylesOf, vehicleById } from './data'
import { compatibility, extraSlotFamily, partUnlockLevel, upgradeKeys } from './rules'
import type { OwnedCar, Save } from './save'

export interface TradeOffer { cars: readonly string[]; credits: number }
export interface TradeGoods { cars: Record<string, OwnedCar>; credits: number }
export type TradeState = 'ouverte' | 'transit' | 'recue' | 'rendue'
export type TradeRecord =
  | { id: string; state: 'ouverte'; offer: TradeOffer }
  | { id: string; state: 'transit'; goods: TradeGoods }
  | { id: string; state: 'recue'; goods?: TradeGoods }
  | { id: string; state: 'rendue' }

const amount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const validId = (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const entry = (save: Save, id: string) => save.trades && Object.hasOwn(save.trades, id) ? save.trades[id] : undefined
const write = (save: Save, record: TradeRecord) => {
  const trades: Record<string, TradeRecord> = save.trades ??= Object.create(null)
  if (record.id === '__proto__' && !Object.hasOwn(trades, record.id)) {
    Object.defineProperty(trades, record.id, { value: record, enumerable: true, writable: true, configurable: true })
  } else trades[record.id] = record
}

function validOffer(offer: unknown): offer is TradeOffer {
  return object(offer) && amount(offer.credits) && Array.isArray(offer.cars)
    && [...offer.cars].every(validId) && new Set(offer.cars).size === offer.cars.length
}

function checkGoods(save: Save, offer: TradeOffer): string | undefined {
  if (!validOffer(offer)) return t('Offre d’échange invalide')
  if (offer.credits > save.credits) return t('Crédits insuffisants pour cet échange')
  const stakeLineup = save.versus?.active?.request?.lineup
  for (const id of offer.cars) {
    if (!vehicleById.has(id) || !Object.hasOwn(save.cars, id)) return t('Voiture absente du garage')
    if (save.lineup.includes(id) || save.nightLineup.includes(id) || save.dailyLineup?.includes(id)
      || save.duel?.player.lineup.some(car => car.id === id) || save.night?.lineup.includes(id)
      || (Array.isArray(stakeLineup) && stakeLineup.some(car => car?.id === id))) return t('Cette voiture est engagée et ne peut pas être échangée')
  }
  if (Object.keys(save.cars).length - offer.cars.length < 3) return t('Tu dois garder au moins trois voitures dans ton garage')
}

export function validateTradeOffer(save: Save, offer: TradeOffer): string | undefined {
  const problem = checkGoods(save, offer)
  if (problem) return problem

  const open = Object.values(save.trades ?? {}).filter(record => record.state === 'ouverte')
  if (open.length >= 10) return t('Tu as déjà dix offres d’échange ouvertes')
  const reserved = new Set(open.flatMap(record => record.offer.cars))
  if (offer.cars.some(id => reserved.has(id))) return t('Cette voiture figure déjà dans une offre d’échange')
  const credits = open.reduce((total, record) => total + record.offer.credits, 0)
  if (offer.credits + credits > save.credits) return t('Crédits insuffisants pour cet échange')
  // Une carte promise peut avoir quitté le garage depuis la proposition.
  const remaining = Object.keys(save.cars).filter(id => !reserved.has(id)).length
  if (remaining - offer.cars.length < 3) return t('Tu dois garder au moins trois voitures dans ton garage')
}

export function openTrade(save: Save, id: string, offer: TradeOffer): string | undefined {
  if (!validId(id) || entry(save, id)) return t('Échange indisponible')
  const problem = validateTradeOffer(save, offer)
  if (problem) return problem
  write(save, { id, state: 'ouverte', offer: { cars: [...offer.cars], credits: offer.credits } })
}

function partCounts(cars: Record<string, OwnedCar>): [string, number][] {
  const counts = new Map<string, number>()
  for (const car of Object.values(cars)) {
    for (const id of car.parts) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return Array.from(counts)
}

function copyCar(car: OwnedCar): OwnedCar {
  return { ...car, parts: [...car.parts], editions: [...car.editions], upgrades: { ...car.upgrades } }
}

export function transitTrade(save: Save, id: string, offer?: TradeOffer): string | undefined {
  const record = entry(save, id)
  if (!validId(id) || (record && record.state !== 'ouverte')) return t('Échange indisponible')
  const outgoing = record?.offer ?? offer
  if (!outgoing) return t('Offre d’échange invalide')
  const problem = checkGoods(save, outgoing)
  if (problem) return problem

  const cars = Object.fromEntries(outgoing.cars.map(carId => [carId, copyCar(save.cars[carId])]))
  const mounted = partCounts(cars)
  if (mounted.some(([partId, count]) => (save.parts[partId] ?? 0) < count)) return t('Stock de pièces incohérent pour cet échange')
  for (const [partId, count] of mounted) save.parts[partId] -= count
  for (const carId of outgoing.cars) delete save.cars[carId]
  const keep = (carId: string) => !Object.hasOwn(cars, carId)
  save.lineup = save.lineup.filter(keep)
  save.nightLineup = save.nightLineup.filter(keep)
  if (save.dailyLineup) save.dailyLineup = save.dailyLineup.filter(keep)
  save.credits -= outgoing.credits
  write(save, { id, state: 'transit', goods: { cars, credits: outgoing.credits } })
}

export function mergeTradeCars(current: OwnedCar, incoming: OwnedCar): OwnedCar {
  const upgrades = { ...current.upgrades }
  for (const key of upgradeKeys) upgrades[key] = Math.max(upgrades[key], incoming.upgrades[key])
  const extraSlot = current.extraSlot ?? incoming.extraSlot
  return {
    ...current, parts: [...current.parts], copies: current.copies + incoming.copies,
    stage: Math.max(current.stage, incoming.stage), upgrades,
    editions: Array.from(new Set([...current.editions, ...incoming.editions])),
    ...(extraSlot ? { extraSlot } : {}),
  }
}

function fits(save: Save, goods: TradeGoods): boolean {
  return amount(save.credits + goods.credits)
    && Object.entries(goods.cars).every(([id, car]) => amount((save.cars[id]?.copies ?? 0) + car.copies))
}

function releaseParts(save: Save, goods: TradeGoods): boolean {
  const mounted = partCounts(goods.cars)
  if (mounted.some(([id, count]) => !amount((save.parts[id] ?? 0) + count))) return false
  for (const [id, count] of mounted) save.parts[id] = (save.parts[id] ?? 0) + count
  return true
}

// À appeler après la décision commune de livraison. Le lot reste disponible pour une reprise côté destinataire.
export function completeTrade(save: Save, id: string): string | undefined {
  const record = entry(save, id)
  if (record?.state !== 'transit') return t('Échange indisponible')
  if (!releaseParts(save, record.goods)) return t('Stock de pièces incohérent pour cet échange')
  const cars = Object.fromEntries(Object.entries(record.goods.cars).map(([carId, car]) => [carId, { ...car, parts: [] }]))
  write(save, { id, state: 'recue', goods: { cars, credits: record.goods.credits } })
}

export function receiveTrade(save: Save, record: TradeRecord): string | undefined {
  if (!validId(record.id) || record.state !== 'recue' || !record.goods || entry(save, record.id)) return t('Échange indisponible')
  const goods = normalizeGoods(record.goods)
  if (!goods) return t('Offre d’échange invalide')
  if (!fits(save, goods)) return t('Quantité invalide')

  const seen = new Set(save.seenCars ?? Object.keys(save.cars))
  for (const [id, car] of Object.entries(goods.cars)) {
    const current = save.cars[id]
    save.cars[id] = current ? mergeTradeCars(current, car) : { ...car, parts: [], editions: Array.from(new Set(car.editions)) }
    if (!current) seen.delete(id)
  }
  save.seenCars = Array.from(seen)
  save.credits += goods.credits
  write(save, { id: record.id, state: 'recue' })
}

export function returnTrade(save: Save, id: string): string | undefined {
  const record = entry(save, id)
  if (!record || record.state === 'rendue' || record.state === 'recue') return t('Échange indisponible')
  if (record.state === 'transit') {
    const { goods } = record
    if (!fits(save, goods)) return t('Quantité invalide')
    if (!releaseParts(save, goods)) return t('Stock de pièces incohérent pour cet échange')
    for (const [carId, car] of Object.entries(goods.cars)) {
      const current = save.cars[carId]
      // Si un booster l'a redonnée entre-temps, le lot rendu garde ses pièces montées.
      save.cars[carId] = current ? mergeTradeCars(car, current) : copyCar(car)
    }
    save.credits += goods.credits
  }
  write(save, { id, state: 'rendue' })
}

function normalizeCar(id: string, car: unknown): OwnedCar | undefined {
  const vehicle = vehicleById.get(id)
  if (!vehicle || !object(car) || !amount(car.copies) || !car.copies || !amount(car.stage) || car.stage > 3
    || !Array.isArray(car.parts) || !Array.isArray(car.editions) || !car.editions.length || !object(car.upgrades)
    || typeof car.favorite !== 'boolean') return
  const styles = stylesOf(id)
  if (!car.editions.every(style => styles.includes(style)) || !car.editions.includes(car.shown)) return
  const upgrades = { acc: 0, vit: 0, man: 0, end: 0 }
  for (const key of upgradeKeys) {
    const level = car.upgrades[key]
    if (!amount(level) || level > partUnlockLevel) return
    upgrades[key] = level
  }
  const slot = upgradeKeys.find(key => key === car.extraSlot && extraSlotFamily[key])
  if (car.extraSlot !== undefined && (!slot || car.stage !== 3 || upgradeKeys.some(key => upgrades[key] !== partUnlockLevel))) return
  const families = new Map<string, number>()
  const installed = new Set<string>()
  for (const id of car.parts) {
    const part = partById.get(id)
    if (!part || compatibility(part, vehicle) || installed.has(id)) return
    const count = (families.get(part.family) ?? 0) + 1
    if (count > (slot && part.family === extraSlotFamily[slot] ? 2 : 1)) return
    installed.add(id)
    families.set(part.family, count)
  }
  return {
    copies: car.copies, stage: car.stage, parts: Array.from(installed), editions: [...car.editions],
    shown: car.shown as OwnedCar['shown'], favorite: car.favorite, upgrades, ...(slot ? { extraSlot: slot } : {}),
  }
}

function normalizeGoods(value: unknown): TradeGoods | undefined {
  if (!object(value) || !amount(value.credits) || !object(value.cars)) return
  const cars: Record<string, OwnedCar> = {}
  for (const [id, data] of Object.entries(value.cars)) {
    const car = normalizeCar(id, data)
    if (!car) return
    cars[id] = car
  }
  return { cars, credits: value.credits }
}

export function readTrades(value: unknown): Save['trades'] {
  if (!object(value)) return
  const trades: Record<string, TradeRecord> = Object.create(null)
  for (const [id, record] of Object.entries(value)) {
    if (!validId(id) || !object(record) || record.id !== id) continue
    switch (record.state) {
      case 'ouverte':
        if (validOffer(record.offer)) trades[id] = { id, state: 'ouverte', offer: { cars: [...record.offer.cars], credits: record.offer.credits } }
        break
      case 'transit': {
        const goods = normalizeGoods(record.goods)
        if (goods) trades[id] = { id, state: 'transit', goods }
        break
      }
      case 'recue': {
        const goods = normalizeGoods(record.goods)
        trades[id] = { id, state: 'recue', ...(goods ? { goods } : {}) }
        break
      }
      case 'rendue':
        trades[id] = { id, state: 'rendue' }
    }
  }
  if (Object.keys(trades).length) return trades
}
