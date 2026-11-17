// Enveloppe Deno commune aux fonctions versus (docs/supabase.md § 7) : CORS, jeton du joueur, base, réponse JSON.
// Aucune logique métier ici : tout est dans versus.ts, testé hors ligne avec Node.
import { createClient } from 'npm:@supabase/supabase-js@2'
import postgres from 'npm:postgres@3'
import type { Context, Result } from './versus.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } })
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32

async function playerOf(token: string): Promise<string | undefined> {
  if (!token) return
  const { data, error } = await auth.auth.getUser(token)
  return error ? undefined : data.user?.id
}

// `scheduled` : la tâche planifiée appelle avec la clé service_role, sans joueur (resolve-due seulement).
export function handle(fn: (ctx: Context) => Promise<Result>, options: { scheduled?: boolean } = {}) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
    if (req.method !== 'POST') return reply({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405)
    const token = req.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? ''
    try {
      const service = options.scheduled && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const scheduler = options.scheduled && Deno.env.get('GV_SCHEDULER_TOKEN')
      const scheduled = (service && token === service) || (scheduler && scheduler.length >= 32 && token === scheduler)
      const player = scheduled ? null : await playerOf(token)
      if (player === undefined) return reply({ ok: false, error: 'UNAUTHORIZED' }, 401)
      let body: unknown
      try {
        body = await req.json()
      } catch {
        return reply({ ok: false, error: 'INVALID_REQUEST' }, 400)
      }
      // Une seule connexion par appel : début, requêtes et fin de transaction passent par la même session.
      const db = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1, prepare: false })
      try {
        const sql = async (text: string, params: unknown[] = []) => ({ rows: [...await db.unsafe(text, params as never[])] })
        return reply(await fn({ sql, player, body, now: () => new Date(), random }))
      } finally {
        await db.end({ timeout: 2 })
      }
    } catch (error) {
      console.error(error)
      return reply({ ok: false, error: 'INTERNAL' }, 500)
    }
  }
}
