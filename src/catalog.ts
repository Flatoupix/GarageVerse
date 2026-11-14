export type ArtStyle = 'Classic' | 'Pixel Art' | 'Cel-Shading' | 'Abandoned' | 'Solarpunk'

interface Vehicle {
  name: string
  version: string
}

interface Card {
  vehicleId: keyof typeof vehicles
  number: string
  rarity: 'Courante' | 'Rare' | 'Épique' | 'Légendaire'
  culture?: { baseCardId: string; work: string; aura: readonly string[] }
}

interface ArtEdition {
  cardId: keyof typeof cards
  style: ArtStyle
  artwork: string
  drift?: { backdrop: string; car: string }
}

export const vehicles = {
  clio: { name: 'Renault Clio III', version: '1.5 dCi' },
  elise: { name: 'Lotus Elise S1', version: 'Série 1' },
  r34: { name: 'Skyline GT-R R34', version: 'Nissan · Version de série' },
  venom: { name: 'Hennessey Venom F5', version: 'Revolution Evolution' },
  brian: { name: 'Skyline de Brian', version: 'Nissan Skyline GT-R R34' },
} satisfies Record<string, Vehicle>

export const cards = {
  clio: { vehicleId: 'clio', number: '01', rarity: 'Courante' },
  elise: { vehicleId: 'elise', number: '16', rarity: 'Rare' },
  r34: { vehicleId: 'r34', number: '11', rarity: 'Rare' },
  venom: { vehicleId: 'venom', number: '12', rarity: 'Épique' },
  brian: {
    vehicleId: 'brian', number: '27', rarity: 'Légendaire',
    culture: { baseCardId: 'r34', work: '2 Fast 2 Furious', aura: ['Cinéma', 'Nostalgie', 'Tuning'] },
  },
} satisfies Record<string, Card>

const art = import.meta.glob<string>('./assets/*.webp', { eager: true, query: '?url', import: 'default' })

export const editions = {
  'clio-classic': { cardId: 'clio', style: 'Classic', artwork: art['./assets/clio.webp'] },
  'elise-classic': { cardId: 'elise', style: 'Classic', artwork: art['./assets/elise.webp'] },
  'r34-classic': { cardId: 'r34', style: 'Classic', artwork: art['./assets/r34.webp'] },
  'venom-classic': { cardId: 'venom', style: 'Classic', artwork: art['./assets/venom.webp'] },
  'venom-pixel': { cardId: 'venom', style: 'Pixel Art', artwork: art['./assets/venom-pixel.webp'] },
  'brian-classic': {
    cardId: 'brian', style: 'Classic', artwork: art['./assets/brian.webp'],
    drift: { backdrop: art['./assets/drift-bg.webp'], car: art['./assets/drift-car.webp'] },
  },
} satisfies Record<string, ArtEdition>

export type EditionId = keyof typeof editions
export type BoosterId = 'standard' | 'after-hours'
type FiveCards = readonly [EditionId, EditionId, EditionId, EditionId, EditionId]

export const boosterOrder: readonly BoosterId[] = ['standard', 'after-hours']

export const boosters = {
  standard: {
    name: 'Collection 001', finish: 'Standard',
    editions: ['clio-classic', 'elise-classic', 'r34-classic', 'venom-classic', 'venom-pixel'],
  },
  'after-hours': {
    name: 'After Hours', finish: 'Édition de nuit',
    editions: ['clio-classic', 'elise-classic', 'r34-classic', 'venom-classic', 'brian-classic'],
  },
} satisfies Record<BoosterId, { name: string; finish: string; editions: FiveCards }>

export function cardDetails(id: EditionId) {
  const edition: ArtEdition = editions[id]
  const card: Card = cards[edition.cardId]
  return { edition, card, vehicle: vehicles[card.vehicleId] }
}
