import { vehicles, rarities, type Rarity, type Vehicle } from './data'
import { statsOf } from './rules'
import { prepOf, type Save, type Preferences } from './save'

export type BrowserView = 'owned' | 'favorites' | 'lineup' | 'collection'
export const normalize = (name: string) => name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
export const browserSort = (preferences: Preferences, mode: 'browse' | 'pick') => preferences.garageSort === 'circuit' && mode === 'browse' ? 'number' : preferences.garageSort ?? (mode === 'pick' ? 'circuit' : 'number')
export const overBudget = (id: string, price: number, lineup: readonly string[], cost: number, cap: number) => lineup.includes(id) ? 0 : Math.max(0, cost + price - cap)
export function filterCars(save: Save, filters: { view: BrowserView; rarity: '' | Rarity; category: string; query: string }, sort: string, lineup: readonly string[] = save.lineup, averages: Record<string, number> = {}) {
  function carStats(v: Vehicle) {
    return statsOf(v, prepOf(save, v.id))
  }

  function totalPower(v: Vehicle) {
    const s = carStats(v)
    return s.acc + s.vit + s.man + s.end
  }

  function prepScore(v: Vehicle) {
    if (!save.cars[v.id]) return -1
    const p = prepOf(save, v.id)
    const levels = Object.values(p.upgrades ?? {}).reduce<number>((sum, lvl) => sum + (lvl ?? 0), 0)
    return p.stage * 100 + levels * 10 + p.parts.length
  }

  const search = normalize(filters.query.trim())
  return vehicles.filter(v => {
    const car = save.cars[v.id]
    if (filters.view !== 'collection' && !car) return false
    if (filters.view === 'favorites' && !car?.favorite) return false
    if (filters.view === 'lineup' && !lineup.includes(v.id)) return false
    if (filters.rarity && v.rarity !== filters.rarity) return false
    if (filters.category && !v.tags.includes(filters.category) && !v.culture?.aura.includes(filters.category)) return false
    return normalize(`${v.name} ${v.version} ${v.year}`).includes(search)
  }).sort((a, b) => {
    if (filters.view === 'owned' && sort === 'number') {
      const favorite = Number(Boolean(save.cars[b.id]?.favorite)) - Number(Boolean(save.cars[a.id]?.favorite))
      if (favorite) return favorite
    }
    if (sort === 'circuit') return (averages[b.id] ?? 0) - (averages[a.id] ?? 0) || a.number.localeCompare(b.number)
    if (sort === 'name') return a.name.localeCompare(b.name, 'fr') || a.number.localeCompare(b.number)
    if (sort === 'cost') return a.cost - b.cost || a.number.localeCompare(b.number)
    if (sort === 'cost-desc') return b.cost - a.cost || a.number.localeCompare(b.number)
    if (sort === 'rarity') return rarities.indexOf(b.rarity) - rarities.indexOf(a.rarity) || a.number.localeCompare(b.number)
    if (sort === 'power') return totalPower(b) - totalPower(a) || a.number.localeCompare(b.number)
    if (sort === 'stage') return prepScore(b) - prepScore(a) || totalPower(b) - totalPower(a) || a.number.localeCompare(b.number)
    if (sort === 'acc') return carStats(b).acc - carStats(a).acc || a.number.localeCompare(b.number)
    if (sort === 'vit') return carStats(b).vit - carStats(a).vit || a.number.localeCompare(b.number)
    if (sort === 'man') return carStats(b).man - carStats(a).man || a.number.localeCompare(b.number)
    if (sort === 'end') return carStats(b).end - carStats(a).end || a.number.localeCompare(b.number)
    if (sort === 'copies') return (save.cars[b.id]?.copies ?? 0) - (save.cars[a.id]?.copies ?? 0) || a.number.localeCompare(b.number)
    if (sort === 'year') return b.year - a.year || a.number.localeCompare(b.number)
    return a.number.localeCompare(b.number)
  })
}
