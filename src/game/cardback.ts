import artA from '../assets/ui/cardback-a.webp'
import artB from '../assets/ui/cardback-b.webp'
import artC from '../assets/ui/cardback-c.webp'
import artD from '../assets/ui/cardback-d.webp'
import type { CardBackId } from './save'

// Les quatre dos de carte au choix (Réglages › Dos des cartes). L'accent donne la lueur et les liserés du nom du jeu.
export interface CardBack { id: CardBackId; name: string; art: string; accent: readonly [string, string] }
export const cardBacks: readonly CardBack[] = [
  { id: 'a', name: 'Blason', art: artA, accent: ['#ffd36a', '#ff9f1c'] },
  { id: 'b', name: 'Carbone', art: artB, accent: ['#ff2a8a', '#2de2ff'] },
  { id: 'c', name: 'Autoroute', art: artC, accent: ['#ff7a2a', '#ff2a8a'] },
  { id: 'd', name: 'Motif', art: artD, accent: ['#2de2ff', '#ff2a8a'] },
]
export const defaultCardBack: CardBackId = 'c'
export const cardBackOf = (id?: CardBackId): CardBack => cardBacks.find(back => back.id === id) ?? cardBacks.find(back => back.id === defaultCardBack)!
