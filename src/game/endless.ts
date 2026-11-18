// Tirage reproductible : la nuit garde la même grille après un rechargement.
import { t } from '../i18n'
import { parts, rivals, sectorStat, vehicles, type Condition, type Rival } from './data'
import { dailyRng } from './daily'
import { compatibility, partUnlockLevel, potential, prepUsed, upgradeKeys } from './rules'

export const NIGHT_CAP = 9
export const nightReward = (round: number) => 60 + 20 * round
export interface Night { seed: string; round: number; wins: number; gains: number; lineup: string[]; resting: boolean; newRecord: boolean }
export function nightRival(seed: string, round: number): Rival {
  const rng = dailyRng(`${seed}:${round}`)
  const offset = Math.floor(dailyRng(seed)() * rivals.length)
  const circuit = rivals[(offset + round - 1) % rivals.length].circuit
  const weatherList: Condition[] = ['sec', 'pluie', 'nuit', 'terre', 'ville']
  const weather = weatherList[(offset + round - 1 + Math.floor((round - 1) / rivals.length)) % weatherList.length]

  // Montée progressive : on étale le coût individuel et le budget total sur 18 manches, puis on sélectionne des spécialistes du circuit.
  const maxCost = Math.max(...vehicles.map(v => v.cost))
  const tier = Math.min(maxCost, 2 + Math.floor((round + 1) / 3))
  const teamBudget = Math.min(maxCost * 3, 7 + Math.floor(round * 0.7))
  const sectorStats = circuit.sectors.map(s => sectorStat[s])

  const candidates = vehicles.filter(v => v.cost <= tier).map(v => {
    const fit = sectorStats.reduce((sum, stat) => sum + v.stats[stat], 0) / sectorStats.length
    const synergyWeight = Math.min(1, Math.max(0, (round - 10) / 12))
    return { v, score: v.cost * (1 - synergyWeight * 0.35) + fit * synergyWeight + rng() * 1.8 }
  }).sort((a, b) => b.score - a.score)

  const picked: typeof vehicles = []
  let spent = 0
  for (const { v } of candidates) {
    if (picked.length === 3) break
    const remainingSlots = 3 - picked.length - 1
    if (spent + v.cost + remainingSlots * 2 <= teamBudget) {
      picked.push(v)
      spent += v.cost
    }
  }
  while (picked.length < 3) {
    const fallback = candidates.find(({ v }) => !picked.includes(v))?.v ?? vehicles[picked.length]
    picked.push(fallback)
    spent += fallback.cost
  }
  // Le trio s'approche du budget : la voiture la moins chère cède sa place à une plus chère tant qu'il reste de la marge,
  // pour que la force adverse ne redescende jamais d'une manche à l'autre.
  for (let guard = 0; spent < teamBudget && guard < 12; guard++) {
    const cheapest = picked.reduce((a, b) => (b.cost < a.cost ? b : a))
    const swap = candidates.find(({ v }) => !picked.includes(v) && v.cost > cheapest.cost && v.cost - cheapest.cost <= teamBudget - spent)?.v
    if (!swap) break
    picked[picked.indexOf(cheapest)] = swap
    spent += swap.cost - cheapest.cost
  }

  const stage = Math.min(3, Math.max(0, Math.floor((round - 4) / 4)))
  const level = Math.min(partUnlockLevel, Math.max(0, Math.floor((round - 6) / 5)))
  const maxPartsCount = Math.min(4, Math.max(0, Math.floor((round - 3) / 3)))
  const shuffledParts = [...parts].sort(() => rng() - 0.5)

  const lineup = picked.map(v => {
    const prep = { stage, parts: [] as string[] }
    if (maxPartsCount > 0) for (const part of shuffledParts) {
      if (prep.parts.length >= maxPartsCount || compatibility(part, v) || prep.parts.some(id => parts.find(p => p.id === id)?.family === part.family)) continue
      if (prepUsed(prep) + part.cost <= potential(v, stage)) prep.parts.push(part.id)
    }
    const upgrades = Object.fromEntries(upgradeKeys.map(key => [key, level]))
    return { id: v.id, ...prep, upgrades }
  })
  return { id: `night:${seed}:${round}`, name: t('Manche {round}', { round }), title: t('Nuit sans fin'), league: 'neon', lineup,
    circuit: { ...circuit, sectors: [...circuit.sectors], conditions: { [weather]: 1 } } }
}
