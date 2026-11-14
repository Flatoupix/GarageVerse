import type { EditionStyle } from './data'

const url = (files: Record<string, string>, folder: string) =>
  Object.fromEntries(Object.entries(files).map(([path, href]) => [path.slice(folder.length).replace(/\.webp$/, ''), href]))
const carArt = url(import.meta.glob<string>('../assets/cars/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/cars/')
const partArt = url(import.meta.glob<string>('../assets/parts/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/parts/')
const rivalArt = url(import.meta.glob<string>('../assets/rivals/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/rivals/')
const packArt = url(import.meta.glob<string>('../assets/packs/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/packs/')
const uiArt = url(import.meta.glob<string>('../assets/ui/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/ui/')
const legacy = url(import.meta.glob<string>('../assets/*.webp', { eager: true, query: '?url', import: 'default' }), '../assets/')

export interface Edition { style: EditionStyle; art?: string; drift?: { backdrop: string; car: string } }
const legacyArt: Record<string, Partial<Record<EditionStyle, Edition>>> = {
  clio: { Classic: { style: 'Classic', art: legacy.clio } },
  elise: { Classic: { style: 'Classic', art: legacy.elise } },
  r34: { Classic: { style: 'Classic', art: legacy.r34 } },
  venom: { Classic: { style: 'Classic', art: legacy.venom }, 'Pixel Art': { style: 'Pixel Art', art: legacy['venom-pixel'] } },
  brian: { Classic: { style: 'Classic', art: legacy.brian, drift: { backdrop: legacy['drift-bg'], car: legacy['drift-car'] } } },
}

export function edition(id: string, style: EditionStyle = 'Synthwave'): Edition {
  return legacyArt[id]?.[style] ?? { style: 'Synthwave', art: carArt[id] }
}
export const art = {
  part: (id: string) => partArt[id] as string | undefined,
  rival: (id: string) => rivalArt[id] as string | undefined,
  pack: (id: string) => packArt[id] as string | undefined,
  hero: uiArt.hero as string | undefined,
}
