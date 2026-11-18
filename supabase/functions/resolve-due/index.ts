// Appelée par un joueur de la salle, ou par la tâche planifiée.
import { handle } from '../_shared/http.ts'
import { resolveTrades } from '../_shared/trades.ts'
import { resolveDue } from '../_shared/versus.ts'

Deno.serve(handle(async ctx => {
  const result = await resolveDue(ctx)
  if (!result.ok || ctx.player !== null || typeof result.data !== 'object' || result.data === null || !('rooms' in result.data)) return result
  // Un incident côté échanges ne doit pas modifier le résultat du traitement des salles.
  try {
    return { ok: true, data: { ...result.data, trades: await resolveTrades(ctx) } }
  } catch (error) {
    console.error('resolve-due échanges', error)
    return result
  }
}, { scheduled: true }))
