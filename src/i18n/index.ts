// Traduction : le texte français du code est la clé. En français `t` rend la clé ; en anglais il cherche la phrase dans les
// dictionnaires de `en/` et retombe sur le français quand elle manque (jamais de clé technique à l'écran).
// La langue est fixée au chargement : en changer enregistre le choix puis recharge la page, ce qui permet de garder des
// constantes de module traduites (`const label = t('…')`). Voir docs/i18n.md.
import { en } from './en'

export type Locale = 'fr' | 'en'
export const LANG_KEY = 'garageverse:lang'
export const locales: readonly { id: Locale; name: string }[] = [{ id: 'fr', name: 'Français' }, { id: 'en', name: 'English' }]

function detect(): Locale {
  // Hors navigateur (vérifications Node, rendu serveur) : le français, langue du code.
  if (typeof window === 'undefined') return 'fr'
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored === 'fr' || stored === 'en') return stored
    // Un joueur qui a déjà une partie garde le français tant qu'il n'a rien choisi ; les clés sont celles de save.ts.
    if (localStorage.getItem('garageverse:v2') || localStorage.getItem('garageverse:v1')) return 'fr'
  } catch {}
  return (typeof navigator !== 'undefined' ? navigator.language : '').toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export const locale: Locale = detect()
if (typeof document !== 'undefined') document.documentElement.lang = locale

// Phrases sans traduction rencontrées en anglais : lues par les vérifications de parcours, jamais montrées au joueur.
export const missing = new Set<string>()
if (typeof window !== 'undefined') (window as unknown as { __i18nMissing: Set<string> }).__i18nMissing = missing

type Params = Record<string, string | number>
const fill = (text: string, params?: Params) => params ? text.replace(/\{(\w+)\}/g, (whole, name: string) => name in params ? String(params[name]) : whole) : text

export function t(key: string, params?: Params): string {
  if (locale === 'fr') return fill(key, params)
  const text = en[key]
  if (text === undefined) { if (key.trim()) missing.add(key); return fill(key, params) }
  return fill(text, params)
}

// Singulier ou pluriel : `{n}` est rempli automatiquement. Le français met 0 et 1 au singulier, l'anglais seulement 1.
export function tp(one: string, other: string, n: number, params?: Params): string {
  const singular = locale === 'fr' ? Math.abs(n) < 2 : n === 1
  return t(singular ? one : other, { n, ...params })
}

// Même phrase française, sens différent selon l'endroit (« Série » : collection ou séries télé) : l'entrée anglaise s'appelle
// « contexte|phrase » ; sans elle, on retombe sur la traduction ordinaire.
export function tc(context: string, key: string, params?: Params): string {
  const text = locale === 'fr' ? undefined : en[`${context}|${key}`]
  return text !== undefined ? fill(text, params) : t(key, params)
}

// Comme `tc`, mais sans signaler l'absence de traduction : pour les données mêlant texte et valeurs techniques (« 1.9 TDI »).
export function tq(context: string, key: string): string {
  return locale === 'fr' ? key : en[`${context}|${key}`] ?? en[key] ?? key
}

export function setLocale(next: Locale) {
  if (next === locale) return
  try { localStorage.setItem(LANG_KEY, next) } catch {}
  location.reload()
}

// Date longue dans la langue du joueur.
export const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB'
