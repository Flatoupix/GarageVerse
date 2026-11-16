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
  // craft.inBoosters : l'évolution se débloque à l'atelier et sort aussi des boosters (sinon, atelier seulement).
  evolvesFrom?: string; craft?: { stage: number; credits: number; inBoosters?: boolean }; look?: string
  anim?: { setting: string; fx: string[] }
  // Anecdote historique affichée sur la fiche (docs/anecdotes.md, faits à vérifier).
  story?: string
}

export interface Part {
  id: string; name: string; family: string; rarity: Rarity; cost: number; text: string
  stats?: Partial<Stats>; effects?: Effect[]
  requires?: { drive?: string[]; engine?: string[]; notEngine?: string[]; tagsAny?: string[] }
}

export type SlotTable = Partial<Record<Rarity, number>> & { partChance: number }
export interface Booster { id: string; name: string; tagline: string; price: number; maxParts?: number; slots: SlotTable[]; altChance: number; favorTags?: string[]; favorWeight?: number }
// Un rival peut aussi monter ses groupes de statistiques à l’atelier (0 à 2 niveaux), comme le joueur.
export interface LineupEntry { id: string; stage: number; parts: string[]; upgrades?: Partial<Record<StatKey, number>> }
export interface Rival {
  id: string; name: string; title: string; league: string
  circuit: { name: string; sectors: Sector[]; conditions: Partial<Record<Condition, number>> }
  bio?: string; style?: string; likes?: string; intro?: string; win?: string; lose?: string; perfect?: string
  lineup: LineupEntry[]
  // Pilotage simple : ce rival n'utilise ni l'attaque ni la gestion.
  cap?: number; reward?: number; replay?: number; completionTicket?: string
  simple?: boolean
}
export interface CollectionSeries { id: string; name: string; description: string; vehicles: string[]; reward: { credits: number; ticket?: string } }
export const series = garageJson.series as CollectionSeries[]

export interface League { id: string; name: string; cap: number; reward: number; ticket: string }

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
export interface Special { id: string; name: string; sector: Sector; tiers: Rival[] }
export const specials = garageJson.specials as Special[]
export const specialByRivalId = new Map(specials.flatMap(s => s.tiers.map(r => [r.id, s] as const)))
export const rivalById = new Map([...rivals, ...specials.flatMap(s => s.tiers)].map(r => [r.id, r]))
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

export type EditionStyle = 'Pixel 16 bits' | 'Synthwave' | 'Classic' | 'Pixel Art' | 'Photo' | 'Gouache' | 'Rallye argentique' | 'Solarpunk' | 'Abandonnée'
// Le pixel art 16 bits est l'édition par défaut de toutes les cartes ; l'illustration précédente devient une édition à collectionner.
export const PIXEL: EditionStyle = 'Pixel 16 bits'
const formerStyles: Record<string, EditionStyle> = { clio: 'Photo', twingo: 'Gouache', panda: 'Rallye argentique' }
export const formerStyle = (id: string): EditionStyle => formerStyles[id] ?? 'Synthwave'
// Les légendaires (cartes avec un champ anim) montrent par défaut leur grande image fixe, pas le pixel art.
export const defaultStyle = (id: string): EditionStyle => vehicleById.get(id)?.anim ? formerStyle(id) : PIXEL
// Nom affiché du style d'illustration d'une carte qui n'a qu'une édition (champ look du roster).
const lookLabels: Record<string, string> = {
  poster: 'Affiche', rally: 'Rallye argentique', comic: 'Bande dessinée', anime: 'Anime', magazine: 'Magazine',
  watercolor: 'Aquarelle', pulp: 'Pulp',
}
export const styleLabel = (v: Vehicle, style: EditionStyle) => style === 'Synthwave' && v.look ? lookLabels[v.look] ?? style : style
const altStyles: Record<string, EditionStyle[]> = {
  clio: ['Classic'], elise: ['Classic'], r34: ['Classic'], venom: ['Classic', 'Pixel Art'], brian: ['Classic'],
}
// Éditions Solarpunk et Abandonnée : cartes dont les deux images existent (`node pipeline/art.mjs --set edition`, src/assets/cars/<id>-solarpunk.webp et -abandonnee.webp).
const extraStyles: EditionStyle[] = ['Solarpunk', 'Abandonnée']
const editionCars = new Set([
  'clio', 'twingo', 'p205', 'deuch', 'golf1', 'panda', 'c4zr1', 'f40', 'p930', 'supra', 'r34', 'venom', 'mx5nb', 'scirocco',
  's15', 'elise', 'mf1', 'stratos', 'dmc', 'firebird', 'beetle', 'esprit', 'elise111s', 'elise190', 'bttf', 'kitt', 'brian',
  'herbie', 'bond', 'taxi', 'ecto1', 'batmobile', 'abarth', 'logan', 'ek9', 'mx5na', 'm3e46', 'delta', 'evo8', 'a110', 'nsx',
  'tesla', 'gt500', 'demon', 'ruf', 'cgt', 'zonda', 'agera', 'veyron', 'h1', 'r4l', 'saxo', 'p106', 'p206', 'uno', 'golf4',
  'corsa', 'fiesta', 'espace', 'ax',
])
export function stylesOf(id: string): EditionStyle[] {
  const former = formerStyle(id)
  const styles: EditionStyle[] = [PIXEL, former]
  if (former !== 'Synthwave') styles.push('Synthwave')
  return styles.concat(altStyles[id] ?? [], editionCars.has(id) ? extraStyles : [])
}
