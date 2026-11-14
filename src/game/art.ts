import { defaultStyle, formerStyle, PIXEL, vehicleById, type EditionStyle } from './data'

const url = (files: Record<string, string>, folder: string) =>
  Object.fromEntries(Object.entries(files).map(([path, href]) => [path.slice(folder.length).replace(/\.webp$/, ''), href]))
const carArt = url(import.meta.glob<string>('../assets/cars/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/cars/')
const partArt = url(import.meta.glob<string>('../assets/parts/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/parts/')
const rivalArt = url(import.meta.glob<string>('../assets/rivals/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/rivals/')
const packArt = url(import.meta.glob<string>('../assets/packs/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/packs/')
const uiArt = url(import.meta.glob<string>('../assets/ui/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/ui/')
// Jeu pixel art : fichiers <id>.px.webp, affichés sans lissage (règle CSS img[src*=".px"]).
const pixelUrl = (files: Record<string, string>, folder: string) =>
  Object.fromEntries(Object.entries(url(files, folder)).map(([id, href]) => [id.replace(/\.px$/, ''), href]))
const pixelCar = pixelUrl(import.meta.glob<string>('../assets/pixel/cars/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/pixel/cars/')
const pixelPart = pixelUrl(import.meta.glob<string>('../assets/pixel/parts/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/pixel/parts/')
const pixelRival = pixelUrl(import.meta.glob<string>('../assets/pixel/rivals/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/pixel/rivals/')
const pixelPack = pixelUrl(import.meta.glob<string>('../assets/pixel/packs/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/pixel/packs/')
const pixelUi = pixelUrl(import.meta.glob<string>('../assets/pixel/ui/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/pixel/ui/')
const pixelAnim = pixelUrl(import.meta.glob<string>('../assets/pixel/anim/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/pixel/anim/')
const legacy = url(import.meta.glob<string>('../assets/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/')

// Une légendaire en pixel art roule : décor qui défile, voiture détourée, poursuivant éventuel et effets propres à la carte.
export interface Scene { bg: string; car: string; chaser?: string; fx: string[] }
export interface Edition { style: EditionStyle; art?: string; drift?: { backdrop: string; car: string }; scene?: Scene }
function sceneOf(id: string): Scene | undefined {
  const fx = vehicleById.get(id)?.anim?.fx
  const bg = pixelAnim[`${id}-bg`], car = pixelAnim[`${id}-car`]
  if (!fx || !bg || !car) return
  return { bg, car, chaser: fx.includes('trex') ? pixelAnim[`${id}-trex`] : undefined, fx }
}
const legacyArt: Record<string, Partial<Record<EditionStyle, Edition>>> = {
  clio: { Classic: { style: 'Classic', art: legacy.clio } },
  elise: { Classic: { style: 'Classic', art: legacy.elise } },
  r34: { Classic: { style: 'Classic', art: legacy.r34 } },
  venom: { Classic: { style: 'Classic', art: legacy.venom }, 'Pixel Art': { style: 'Pixel Art', art: legacy['venom-pixel'] } },
  brian: { Classic: { style: 'Classic', art: legacy.brian, drift: { backdrop: legacy['drift-bg'], car: legacy['drift-car'] } } },
}

export function edition(id: string, style: EditionStyle = defaultStyle(id)): Edition {
  // Tant que l'image pixel d'une carte manque, son édition par défaut montre l'illustration précédente.
  if (style === PIXEL) return pixelCar[id] ? { style, art: pixelCar[id], scene: sceneOf(id) } : { ...edition(id, formerStyle(id)), style }
  const former = formerStyle(id)
  if (style === former && former !== 'Synthwave') return { style, art: carArt[`${id}-portrait`] }
  return legacyArt[id]?.[style] ?? { style: 'Synthwave', art: carArt[id] }
}
export const art = {
  part: (id: string) => (pixelPart[id] ?? partArt[id]) as string | undefined,
  rival: (id: string) => (pixelRival[id] ?? rivalArt[id]) as string | undefined,
  pack: (id: string) => (pixelPack[id] ?? packArt[id]) as string | undefined,
  hero: (pixelUi.hero ?? uiArt.hero) as string | undefined,
}
