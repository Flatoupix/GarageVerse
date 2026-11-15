// Tirage reproductible : la nuit garde la même grille après un rechargement.
import { parts, rivals, vehicles, type Condition, type Rival } from './data'
import { dailyRng } from './daily'
import { compatibility, partUnlockLevel, potential, prepUsed, upgradeKeys } from './rules'

export const NIGHT_CAP = 9
export const nightReward = (round: number) => 60 + 20 * round
export interface Night { seed: string; round: number; wins: number; gains: number; lineup: string[]; resting: boolean; newRecord: boolean }
export function nightRival(seed: string, round: number): Rival {
  const rng = dailyRng(`${seed}:${round}`)
  const maxCost = Math.max(...vehicles.map(v => v.cost))
  const tier = Math.min(maxCost, round + 1)
  const pool = vehicles.map(v => ({ v, roll: rng() })).filter(({ v }) => v.cost <= tier)
    .sort((a, b) => b.v.cost - a.v.cost || a.roll - b.roll).slice(0, 3)
  const stage = Math.min(3, Math.max(0, Math.floor((round - maxCost + 1) / 2)))
  const lineup = pool.map(({ v }) => {
    const prep = { stage, parts: [] as string[] }
    if (stage) for (const part of parts) {
      if (prep.parts.length >= stage || compatibility(part, v) || prep.parts.some(id => parts.find(p => p.id === id)?.family === part.family)) continue
      if (prepUsed(prep) + part.cost <= potential(v, stage)) prep.parts.push(part.id)
    }
    // Après le Stage et les pièces, les groupes de statistiques progressent à leur tour.
    const level = Math.min(partUnlockLevel, Math.max(0, Math.floor((round - maxCost - 5) / 2)))
    const upgrades = Object.fromEntries(upgradeKeys.map(key => [key, level]))
    return { id: v.id, ...prep, upgrades }
  })
  const offset = Math.floor(dailyRng(seed)() * rivals.length)
  const circuit = rivals[(offset + round - 1) % rivals.length].circuit
  const weather: Condition[] = ['sec', 'pluie', 'nuit', 'terre', 'ville']
  return { id: `night:${seed}:${round}`, name: `Manche ${round}`, title: 'Nuit sans fin', league: 'neon', lineup,
    circuit: { ...circuit, sectors: [...circuit.sectors], conditions: { [weather[(offset + round - 1 + Math.floor((round - 1) / rivals.length)) % weather.length]]: 1 } } }
}
