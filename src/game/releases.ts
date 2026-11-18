import { dateLocale } from '../i18n'

// Notes de version affichées dans le jeu. Une seule source : CHANGELOG.md, lu au build.
// Le format attendu : « ## [x.y.z] — AAAA-MM-JJ », puis des « ### Rubrique » et des puces « - ».

export type Segment = { text: string; bold?: true; italic?: true }
export interface ReleaseSection { title: string; items: Segment[][] }
export interface Release { version: string; date: string; sections: ReleaseSection[] }

const heading = /^## \[(\d+\.\d+\.\d+)\](?:\s+—\s+(\S+))?\s*$/

// Gras (**…**), italique (*…*) et code (`…`) deviennent des segments de texte : jamais de HTML injecté.
export function inline(text: string): Segment[] {
  const segments: Segment[] = []
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index) })
    if (match[1] !== undefined) segments.push({ text: match[1], bold: true })
    else if (match[2] !== undefined) segments.push({ text: match[2], italic: true })
    else segments.push({ text: match[3] })
    last = match.index + match[0].length
  }
  if (last < text.length) segments.push({ text: text.slice(last) })
  return segments
}

// Les entrées sans numéro de version (« Non publié ») ne sont pas montrées aux joueurs.
export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = []
  let release: Release | undefined
  let section: ReleaseSection | undefined
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (line.startsWith('## ')) {
      const match = line.match(heading)
      release = match ? { version: match[1], date: match[2] ?? '', sections: [] } : undefined
      if (release) releases.push(release)
      section = undefined
    } else if (release && line.startsWith('### ')) {
      section = { title: line.slice(4).trim(), items: [] }
      release.sections.push(section)
    } else if (release && line.startsWith('- ')) {
      if (!section) { section = { title: 'Nouveautés', items: [] }; release.sections.push(section) }
      section.items.push(inline(line.slice(2).trim()))
    }
  }
  return releases
}

export function compareVersions(a: string, b: string) {
  const left = a.split('.').map(Number), right = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((left[i] ?? 0) !== (right[i] ?? 0)) return (left[i] ?? 0) - (right[i] ?? 0)
  return 0
}

// Notes à montrer à l'ouverture : celles publiées depuis la dernière version vue, jusqu'à la version jouée.
// Sans version vue (joueur d'avant cette fonction), seule la version jouée est présentée.
export function releasesToShow(releases: Release[], current: string, seen: string | null, limit = 3): Release[] {
  const upTo = releases.filter(r => compareVersions(r.version, current) <= 0)
  const fresh = seen ? upTo.filter(r => compareVersions(r.version, seen) > 0) : upTo.filter(r => r.version === current)
  return fresh.sort((a, b) => compareVersions(b.version, a.version)).slice(0, limit)
}

export const SEEN_VERSION_KEY = 'garageverse-notes-vues'
export function readSeenVersion(): string | null {
  try { return localStorage.getItem(SEEN_VERSION_KEY) } catch { return null }
}
export function markVersionSeen(version: string) {
  try { localStorage.setItem(SEEN_VERSION_KEY, version) } catch { /* stockage indisponible : les notes reviendront au prochain lancement */ }
}

export const formatDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  return new Date(year, month - 1, day).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
}
