import { defaultStyle, formerStyle, PIXEL, vehicleById, type Condition, type EditionStyle } from './data'
import { theme } from './theme'

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

// Les légendaires ne s'animent plus sur la carte : elles montrent une grande image fixe. Leurs calques animés
// (décor et voiture de profil) ne servent plus qu'à la mini-course.
export interface Edition { style: EditionStyle; art?: string; drift?: { backdrop: string; car: string } }
// Décor qui défile pendant un secteur, un par condition. Tant que le décor dédié (track-<condition>-bg, produit par
// `yarn art --set anim --kind tracks`) n'existe pas, la course emprunte celui d'une légendaire animée.
const trackStandIn: Record<Condition, string> = { sec: 'venom', pluie: 'elise190', nuit: 'mf1', terre: 'jpjeep', ville: 'bttf' }
export const trackBackdrop = (condition: Condition): string | undefined =>
  pixelAnim[`track-${condition}-bg`] ?? pixelAnim[`${trackStandIn[condition]}-bg`]
// Voiture détourée, vue de profil, pour la mini-course. Les légendaires animées en ont déjà une ; les autres arrivent avec
// `yarn art --set anim --kind sprites`. Sans elle, la course montre la vignette de la carte.
export const carSprite = (id: string): string | undefined => pixelAnim[`${id}-car`]
const legacyArt: Record<string, Partial<Record<EditionStyle, Edition>>> = {
  clio: { Classic: { style: 'Classic', art: legacy.clio } },
  elise: { Classic: { style: 'Classic', art: legacy.elise } },
  r34: { Classic: { style: 'Classic', art: legacy.r34 } },
  venom: { Classic: { style: 'Classic', art: legacy.venom }, 'Pixel Art': { style: 'Pixel Art', art: legacy['venom-pixel'] } },
  brian: { Classic: { style: 'Classic', art: legacy.brian, drift: { backdrop: legacy['drift-bg'], car: legacy['drift-car'] } } },
}

export function edition(id: string, style: EditionStyle = defaultStyle(id)): Edition {
  // Tant que l'image pixel d'une carte manque, son édition par défaut montre l'illustration précédente.
  if (style === PIXEL) return pixelCar[id] ? { style, art: pixelCar[id] } : { ...edition(id, formerStyle(id)), style }
  // Éditions supplémentaires : fichiers src/assets/cars/<id>-solarpunk.webp et <id>-abandonnee.webp.
  if (style === 'Solarpunk') return { style, art: carArt[`${id}-solarpunk`] }
  if (style === 'Abandonnée') return { style, art: carArt[`${id}-abandonnee`] }
  const former = formerStyle(id)
  if (style === 'Photo') return { style, art: carArt[`${id}-portrait`] }
  if (style === former && former !== 'Synthwave') return { style, art: carArt[`${id}-portrait`] }
  return legacyArt[id]?.[style] ?? { style: 'Synthwave', art: carArt[id] }
}
// Le thème Synthwave reprend les illustrations d'origine des pièces, rivaux, sachets et de l'accueil ; les autres thèmes montrent le pixel art.
const pick = (pixel: Record<string, string>, former: Record<string, string>, id: string) =>
  (theme.value === 'neon' ? former[id] ?? pixel[id] : pixel[id] ?? former[id]) as string | undefined
const packStandIn: Record<string, string> = {
  starter: 'neon',
  'starter-legend': 'neon-legend',
  atelier: 'night',
  'atelier-legend': 'night-legend',
}
export const art = {
  part: (id: string) => pick(pixelPart, partArt, id),
  rival: (id: string) => pick(pixelRival, rivalArt, id.replace(/:\d+$/, '')),
  pack: (id: string) => pick(pixelPack, packArt, id) ?? pick(pixelPack, packArt, packStandIn[id] ?? 'neon'),
  get hero() { return pick(pixelUi, uiArt, 'hero') },
}
