// Textes d'erreur de rules.ts (copié tel quel côté serveur Deno, donc sans `t`) traduits à l'affichage du client.
// Les messages à paramètres sont reconnus par leur forme française puis recomposés en une phrase traduite.
import { t, tq } from '../i18n'

const list = (items: string, separator: string) => items.split(separator).map(item => t(item)).join(', ')

const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Réservé aux transmissions (.+)$/, m => t('Réservé aux transmissions {list}', { list: list(m[1], ' ou ') })],
  [/^Réservé aux moteurs (.+)$/, m => t('Réservé aux moteurs {list}', { list: list(m[1], ', ') })],
  [/^Incompatible avec un moteur (.+)$/, m => t('Incompatible avec un moteur {engine}', { engine: t(m[1]) })],
  [/^Réservé aux catégories (.+)$/, m => t('Réservé aux catégories {list}', { list: list(m[1], ', ') })],
  [/^Mise inconnue : choisis (.+) crédits$/, m => t('Mise inconnue : choisis {list} crédits', { list: m[1] })],
  [/^Mise trop haute : au plus (\d+) crédits \(25 % de tes crédits\)$/, m => t('Mise trop haute : au plus {n} crédits (25 % de tes crédits)', { n: m[1] })],
  [/^Plafond inconnu : choisis (.+)$/, m => t('Plafond inconnu : choisis {list}', { list: m[1] })],
  [/^Voiture inconnue : (.+)$/, m => t('Voiture inconnue : {id}', { id: m[1] })],
  [/^Coût (\d+)\/(\d+) : l’écurie dépasse le plafond$/, m => t('Coût {cost}/{cap} : l’écurie dépasse le plafond', { cost: m[1], cap: m[2] })],
  [/^Aura (.+)$/, m => t('Aura {tag}', { tag: t(m[1]) })],
  [/^pièce inconnue : (.+)$/, m => t('pièce inconnue : {id}', { id: m[1] })],
  [/^(.+) niveau (\d+) requis$/, m => t('{workshop} niveau {level} requis', { workshop: t(m[1]), level: m[2] })],
]
// Phrases simples de rules.ts, listées pour la vérification i18n (qui lit les littéraux de t).
const plain = new Set([
  'Choisis trois voitures', 'Choisis trois voitures différentes', 'préparation absente', 'stage invalide', 'niveau d’atelier invalide', 'atelier inconnu',
  '3ᵉ emplacement impossible sur cet atelier', '3ᵉ emplacement : Stage 3 et les 4 ateliers au niveau 2 requis', 'pièces invalides',
  'la même pièce est montée deux fois', 'trop de pièces dans la même famille', 'potentiel de préparation dépassé',
])
// Les mêmes phrases en littéraux de t pour que la vérification i18n les voie.
void [t('Choisis trois voitures'), t('Choisis trois voitures différentes'), t('préparation absente'), t('stage invalide'), t('niveau d’atelier invalide'),
  t('atelier inconnu'), t('3ᵉ emplacement impossible sur cet atelier'), t('3ᵉ emplacement : Stage 3 et les 4 ateliers au niveau 2 requis'),
  t('pièces invalides'), t('la même pièce est montée deux fois'), t('trop de pièces dans la même famille'), t('potentiel de préparation dépassé')]

export function ruleText(message: string): string
export function ruleText(message: string | undefined): string | undefined
export function ruleText(message: string | undefined): string | undefined {
  if (!message) return message
  // Une phrase déjà connue en entier (« Ville · gabarit ») passe avant le découpage sur « · ».
  const whole = tq('', message)
  if (whole !== message) return whole
  // « Voiture version · problème » et « Pièce · raison » : le nom reste tel quel, la suite se traduit.
  const split = message.indexOf(' · ')
  if (split > 0) return `${message.slice(0, split)} · ${ruleText(message.slice(split + 3))}`
  for (const [pattern, build] of patterns) { const m = message.match(pattern); if (m) return build(m) }
  return t(message)
}
