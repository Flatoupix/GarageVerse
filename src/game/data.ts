import rosterJson from '../data/roster.json'
import garageJson from '../data/garage.json'

export type Rarity = 'Courante' | 'Rare' | 'Épique' | 'Légendaire'
export type StatKey = 'acc' | 'vit' | 'man' | 'end'
export type Sector = 'depart' | 'virage' | 'ligne' | 'endurance'
export type Condition = 'sec' | 'pluie' | 'nuit' | 'terre' | 'ville'
export type Stats = Record<StatKey, number>

export type Effect =
  | { type: 'boost'; value: number; sectors?: Sector[]; condition?: Condition }
  | { type: 'stamina' | 'nitro' | 'nitroPower' | 'potential' | 'comeback' | 'underdog'; value: number }
  | { type: 'aura'; value: number; tag: string }

export interface Vehicle {
  id: string; number: string; name: string; version: string; year: number; origin: string
  rarity: Rarity; cost: number; stats: Stats; drive: string; engine: string; tags: string[]; spec?: string
  signature: { name: string; text: string; effects: Effect[] }
  culture?: { work: string; base?: string; aura: string[] }
  evolvesFrom?: string; craft?: { stage: number; credits: number }
}

export interface Part {
  id: string; name: string; family: string; rarity: Rarity; cost: number; text: string
  stats?: Partial<Stats>; effects?: Effect[]
  requires?: { drive?: string[]; engine?: string[]; notEngine?: string[]; tagsAny?: string[] }
}

export type SlotTable = Partial<Record<Rarity, number>> & { partChance: number }
export interface Booster { id: string; name: string; tagline: string; price: number; slots: SlotTable[]; altChance: number; favorTags?: string[]; favorWeight?: number }
export interface LineupEntry { id: string; stage: number; parts: string[] }
export interface Rival {
  id: string; name: string; title: string; league: string
  circuit: { name: string; sectors: Sector[]; conditions: Partial<Record<Condition, number>> }
  lineup: LineupEntry[]
}
export interface League { id: string; name: string; cap: number; reward: number }

export const vehicles = rosterJson.vehicles as Vehicle[]
export const parts = garageJson.parts as Part[]
export const families = garageJson.families as Record<string, string>
export const boosters = garageJson.boosters as Booster[]
export const leagues = garageJson.leagues as League[]
export const rivals = garageJson.rivals as Rival[]
export const progression = garageJson.progression as {
  stages: { stage: number; credits: number; duplicates: number; text: string }[]
  scrap: Record<Rarity, number>
  start: { credits: number; tickets: Record<string, number>; vehicles: string[]; parts: string[] }
}

export const vehicleById = new Map(vehicles.map(v => [v.id, v]))
export const partById = new Map(parts.map(p => [p.id, p]))
export const boosterById = new Map(boosters.map(b => [b.id, b]))
export const rivalById = new Map(rivals.map(r => [r.id, r]))
export const leagueById = new Map(leagues.map(l => [l.id, l]))

export const rarities: Rarity[] = ['Courante', 'Rare', 'Épique', 'Légendaire']
export const rarityMark: Record<Rarity, string> = { Courante: '●', Rare: '◆', Épique: '✦', Légendaire: '✧' }
export const rarityClass: Record<Rarity, string> = { Courante: 'common', Rare: 'rare', Épique: 'epic', Légendaire: 'legendary' }
export const statLabels: Record<StatKey, string> = { acc: 'Accélération', vit: 'Vitesse', man: 'Maniabilité', end: 'Endurance' }
export const statShort: Record<StatKey, string> = { acc: 'ACC', vit: 'VIT', man: 'MAN', end: 'END' }
export const sectorStat: Record<Sector, StatKey> = { depart: 'acc', virage: 'man', ligne: 'vit', endurance: 'end' }
export const sectorLabels: Record<Sector, string> = { depart: 'Départ', virage: 'Virages', ligne: 'Ligne droite', endurance: 'Endurance' }
export const sectorIcons: Record<Sector, string> = { depart: '⇧', virage: '↝', ligne: '⟶', endurance: '∞' }
export const conditionLabels: Record<Condition, string> = { sec: 'Sec', pluie: 'Pluie', nuit: 'Nuit', terre: 'Terre', ville: 'Ville' }
export const conditionIcons: Record<Condition, string> = { sec: '☀', pluie: '☂', nuit: '☾', terre: '⛰', ville: '▦' }

// Éditions artistiques : Synthwave pour tout le roster, Classic et Pixel Art hérités du prototype.
export type EditionStyle = 'Synthwave' | 'Classic' | 'Pixel Art'
const altStyles: Record<string, EditionStyle[]> = {
  clio: ['Classic'], elise: ['Classic'], r34: ['Classic'], venom: ['Classic', 'Pixel Art'], brian: ['Classic'],
}
export const stylesOf = (id: string): EditionStyle[] => ['Synthwave', ...(altStyles[id] ?? [])]
