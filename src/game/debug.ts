// Compteur déterministe : l'appelant fournit l'heure en millisecondes.
export interface DebugTaps { count: number; lastTap: number | null }

// `target` appuis rapides (moins de 1,5 s d'écart) déclenchent le raccourci : 14 sur le logo pour les crédits, 7 sur la version pour le Showroom.
export function debugTap(previous: DebugTaps, now: number, target = 14): { state: DebugTaps; triggered: boolean } {
  const count = previous.lastTap === null || now - previous.lastTap > 1500 || now < previous.lastTap ? 1 : previous.count + 1
  const triggered = count === target
  return { state: { count: triggered ? 0 : count, lastTap: now }, triggered }
}
