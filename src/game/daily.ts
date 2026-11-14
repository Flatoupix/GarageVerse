// Tirage quotidien indépendant du hasard des courses et des boosters.
import { progression, rivals, vehicleById, vehicles, type Rival } from './data'
import { lineupCost } from './rules'

export const DAILY_REWARD = 180
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export function previousDate(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return localDate(new Date(year, month - 1, day - 1))
}
export function dailyRng(key: string) {
  let seed = 2166136261
  for (const c of key) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619)
  return () => { seed = Math.imul(seed ^ seed >>> 15, 1 | seed); seed ^= seed + Math.imul(seed ^ seed >>> 7, 61 | seed); return ((seed ^ seed >>> 14) >>> 0) / 4294967296 }
}
export type Constraint = { type: 'cost'; cap: number } | { type: 'category' | 'rarity'; value: string }
export function constraintText(rule: Constraint) {
  return rule.type === 'cost' ? `Plafond de coût : ${rule.cap}` : rule.type === 'category' ? `Au moins une voiture de catégorie ${rule.value}` : `Au moins une voiture de rareté ${rule.value}`
}
export function constraintCheck(ids: string[], rule: Constraint): string | undefined {
  if (ids.length !== 3 || new Set(ids).size !== 3) return 'Choisis trois voitures différentes'
  if (rule.type === 'cost') { if (lineupCost(ids) > rule.cap) return `Coût ${lineupCost(ids)}/${rule.cap}` }
  else if (!ids.some(id => { const v = vehicleById.get(id); return rule.type === 'category' ? v?.tags.includes(rule.value) : v?.rarity === rule.value })) return constraintText(rule)
}
export function validDailyLineup(ids: string[], rule: Constraint): string[] | undefined {
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) for (let c = b + 1; c < ids.length; c++) {
    const trio = [ids[a], ids[b], ids[c]]
    if (!constraintCheck(trio, rule)) return trio
  }
}
export function dailyChallenge(date = localDate()) {
  const rng = dailyRng(date)
  const pick = <T>(items: T[]) => items[Math.floor(rng() * items.length)]
  const circuit = pick(rivals).circuit
  const vehicle = pick(vehicles)
  const type = pick(['cost', 'category', 'rarity'] as const)
  let constraint: Constraint = type === 'cost' ? { type, cap: 7 + Math.floor(rng() * 3) } : { type, value: type === 'category' ? pick(vehicle.tags) : vehicle.rarity }
  if (!validDailyLineup(progression.start.vehicles, constraint)) constraint = { type: 'cost', cap: lineupCost(progression.start.vehicles) }
  const pool = vehicles.filter(v => v.cost <= 3)
  const lineup = [...pool] // La sélection sans remise conserve un tirage stable.
  const opponent = Array.from({ length: 3 }, () => { const index = Math.floor(rng() * lineup.length); return { id: lineup.splice(index, 1)[0].id, stage: 0, parts: [] } })
  const rival: Rival = { id: `daily:${date}`, name: 'Pilote du jour', title: 'Défi du jour', league: 'neon', circuit: { ...circuit, sectors: [...circuit.sectors] }, lineup: opponent }
  return { date, rival, constraint, reward: DAILY_REWARD }
}
