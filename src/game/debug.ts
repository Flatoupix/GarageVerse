// Compteur déterministe : l'appelant fournit l'heure en millisecondes.
export interface DebugTaps { count: number; lastTap: number | null }

export function debugTap(previous: DebugTaps, now: number): { state: DebugTaps; triggered: boolean } {
  const count = previous.lastTap === null || now - previous.lastTap > 1500 || now < previous.lastTap ? 1 : previous.count + 1
  const triggered = count === 14
  return { state: { count: triggered ? 0 : count, lastTap: now }, triggered }
}
