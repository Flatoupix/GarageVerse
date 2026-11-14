import { ref } from 'vue'
import arcade from '../themes/arcade.css?inline'
import base from '../themes/base.css?inline'
import carnet from '../themes/carnet.css?inline'
import consoleSheet from '../themes/console.css?inline'
import dos from '../themes/dos.css?inline'
import neon from '../themes/neon.css?inline'
import shared from '../themes/shared.css?inline'
import sobre from '../themes/sobre.css?inline'
import sport from '../themes/sport.css?inline'
import { vehicleById } from './data'
import type { Save, ThemeId } from './save'

// Un thème à débloquer indique son objectif et l'avancée du joueur ; les conditions ne régressent jamais.
interface Unlock { goal: string; progress: (save: Save) => [number, number] }
interface ThemeInfo { id: ThemeId; name: string; hint: string; swatch: readonly string[]; color: string; unlock?: Unlock }

const wins = (save: Save) => Object.values(save.record).reduce((sum, r) => sum + r.wins, 0)
const owned = (save: Save) => Object.keys(save.cars).length
const legends = (save: Save) => Object.keys(save.cars).filter(id => vehicleById.get(id)?.rarity === 'Légendaire').length

// Thèmes d'interface : seuls les menus changent, les cartes gardent leurs éditions.
export const themes: readonly ThemeInfo[] = [
  { id: 'neon', name: 'Synthwave', hint: 'Le style d’origine : nuit violette, soleil rayé et néons', swatch: ['#0b0420', '#ff2a8a', '#2de2ff'], color: '#0b0420' },
  { id: 'pixel', name: 'Rétro pixel', hint: 'Menus 16 bits et polices pixel', swatch: ['#262b44', '#feae34', '#2ce8f5'], color: '#262b44' },
  { id: 'sobre', name: 'Sobre', hint: 'Interface épurée, les illustrations en vedette', swatch: ['#111214', '#1e1f23', '#ffb547'], color: '#111214' },
  { id: 'sport', name: 'Sport auto', hint: 'Bandes de course, compteurs et italiques', swatch: ['#f4f1ea', '#e63322', '#1d5fd1'], color: '#121212' },
  { id: 'carnet', name: 'Carnet de garage', hint: 'Papier, tampons et notes au stylo', swatch: ['#e9dfc9', '#2b2420', '#c0392b'], color: '#e9dfc9' },
  { id: 'arcade', name: 'Borne d’arcade', hint: 'Écran à balayage et boutons ronds de borne', swatch: ['#000000', '#ffe100', '#ff3b3b'], color: '#000000',
    unlock: { goal: 'Gagner 10 courses', progress: s => [Math.min(wins(s), 10), 10] } },
  { id: 'console', name: 'Console 16 bits', hint: 'Fenêtres bleues de jeu de rôle et curseur clignotant', swatch: ['#1a2470', '#ffffff', '#ffd84a'], color: '#0f1640',
    unlock: { goal: 'Réunir 25 voitures', progress: s => [Math.min(owned(s), 25), 25] } },
  { id: 'dos', name: 'Atelier PC 1991', hint: 'Bureau bleu, fenêtres grises et police VGA', swatch: ['#0000a8', '#c0c0c0', '#000080'], color: '#aaaaaa',
    unlock: { goal: 'Posséder une Légendaire', progress: s => [Math.min(legends(s), 1), 1] } },
]
export type Theme = ThemeId

export function unlocked(save: Save, id: Theme) {
  const goal = themes.find(t => t.id === id)?.unlock
  if (!goal) return true
  const [done, total] = goal.progress(save)
  return done >= total
}

const sheets: Record<Theme, string> = {
  neon, pixel: base, sobre: base + sobre, sport: base + sport, carnet: base + carnet,
  arcade: base + arcade, console: base + consoleSheet, dos: base + dos,
}
export const theme = ref<Theme>('neon')
let sheet: HTMLStyleElement | undefined

export function applyTheme(id: Theme) {
  theme.value = id
  sheet ??= document.head.appendChild(document.createElement('style'))
  sheet.textContent = sheets[id] + shared
  document.documentElement.dataset.theme = id
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themes.find(t => t.id === id)!.color)
}
