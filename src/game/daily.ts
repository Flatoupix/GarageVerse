// Tirage quotidien indépendant du hasard des courses et des boosters.
import { t } from '../i18n'
import { leagueById, progression, rivals, vehicleById, vehicles, type Rival } from './data'
import { createRace, lineupCost, seededRng } from './rules'

export const DAILY_REWARD = 180
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export function previousDate(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return localDate(new Date(year, month - 1, day - 1))
}
// Même générateur que les salles versus (rules.ts), sous son nom historique.
export const dailyRng = seededRng
export type Constraint = { type: 'cost'; cap: number } | { type: 'category' | 'rarity'; value: string }
export const constraintCap = (rule: Constraint) => rule.type === 'cost' ? rule.cap : leagueById.get('neon')!.cap
export function constraintText(rule: Constraint) {
  return rule.type === 'cost' ? t('Plafond de coût : {cap}', { cap: rule.cap }) : rule.type === 'category' ? t('Au moins une voiture de catégorie {value}', { value: t(rule.value) }) : t('Au moins une voiture de rareté {value}', { value: t(rule.value) })
}
export function constraintCheck(ids: string[], rule: Constraint): string | undefined {
  if (ids.length !== 3 || new Set(ids).size !== 3) return t('Choisis trois voitures différentes')
  if (ids.some(id => !vehicleById.has(id))) return t('Voiture inconnue')
  const cap = constraintCap(rule)
  if (lineupCost(ids) > cap) return t('Coût {cost}/{cap}', { cost: lineupCost(ids), cap })
  if (rule.type !== 'cost' && (!ids.some(id => { const v = vehicleById.get(id); return rule.type === 'category' ? v?.tags.includes(rule.value) : v?.rarity === rule.value }))) return constraintText(rule)
}
export function validDailyLineup(ids: string[], rule: Constraint): string[] | undefined {
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) for (let c = b + 1; c < ids.length; c++) {
    const trio = [ids[a], ids[b], ids[c]]
    if (!constraintCheck(trio, rule)) return trio
  }
}
// Le tirage est le même pour tout le monde. Seule la contrainte se replie sur un plafond de coût si le garage du joueur ne peut pas la tenir.
export const FALLBACK_CAP = 6
export function dailyChallenge(date = localDate(), owned: string[] = progression.start.vehicles) {
  const rng = dailyRng(date)
  const pick = <T>(items: T[]) => items[Math.floor(rng() * items.length)]
  const circuit = pick(rivals).circuit
  const vehicle = pick(vehicles)
  const type = pick(['cost', 'category', 'rarity'] as const)
  let constraint: Constraint = type === 'cost' ? { type, cap: 7 + Math.floor(rng() * 2) } : { type, value: type === 'category' ? pick(vehicle.tags) : vehicle.rarity }
  if (!validDailyLineup(owned, constraint)) constraint = { type: 'cost', cap: FALLBACK_CAP }
  const pool = vehicles.filter(v => v.cost <= 3)
  const lineup = [...pool] // La sélection sans remise conserve un tirage stable.
  const opponent = Array.from({ length: 3 }, () => { const index = Math.floor(rng() * lineup.length); return { id: lineup.splice(index, 1)[0].id, stage: 0, parts: [] } })
  const rival: Rival = { id: `daily:${date}`, name: t('Pilote du jour'), title: t('Défi du jour'), league: 'neon', circuit: { ...circuit, sectors: [...circuit.sectors] }, lineup: opponent }
  const weather = createRace(rival.id, rival.circuit, [], [], dailyRng(date)).conditions
  return { date, rival, constraint, weather, reward: DAILY_REWARD }
}
