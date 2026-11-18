import { createClient } from '@supabase/supabase-js'
import { t } from '../i18n'
import { ruleText } from './rules-text'
import type { Condition, Rival } from './data'
import type { Round, VersusEntry } from './rules'
import { persist, save, storageWarning } from './store'
import { reserve, settle, type Engagement, type Invitation, type VersusAccount } from './versus-wallet'

export interface Snapshot {
  now: string
  room: Invitation & { code: string; state: string; host: string; guest: string | null; winner: string | null; missed: Record<string, number>; sector: number; sector_deadline: string | null; expires_at: string
    // Graine secrète pendant la course (elle fixe la chance) : le serveur publie le circuit et la météo, et la graine à l'arrivée.
    circuit: Rival['circuit'] | null; conditions: Condition[] | null; revealed_seed: string | null }
  players: Record<string, string>
  lineups: Record<string, VersusEntry[]>
  rounds: Round[]
  played: boolean
  settlement: { delta: number; claimed: boolean } | null
}

const boundedFetch: typeof fetch = (input, init = {}) => {
  const timeout = AbortSignal.timeout(15000)
  const signal = init.signal && AbortSignal.any ? AbortSignal.any([init.signal, timeout]) : init.signal || timeout
  return fetch(input, { ...init, signal })
}

export const db = createClient(import.meta.env.VITE_SUPABASE_URL || 'https://wqfukxadzwxaypqebtqw.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable__Z5ER4kBYKflcgz2Q-wdcA_8UmRQhdh',
  { auth: { detectSessionInUrl: false }, global: { fetch: boundedFetch } })

class Refusal extends Error {}
const messages: Record<string, string> = {
  INVALID_NICKNAME: t('Choisis un pseudo de 2 à 20 caractères.'), ROOM_FULL: t('Salle déjà complète.'), ROOM_NOT_FOUND: t('Salle introuvable.'),
  ROOM_EXPIRED: t('Invitation expirée.'), OWN_ROOM: t('C’est ta propre invitation.'), RATE_LIMITED: t('Limite de dix salles par heure atteinte.'),
  ALREADY_PLAYED: t('Ton choix est déjà enregistré.'), WRONG_SECTOR: t('Ce secteur est terminé.'), DEADLINE_PASSED: t('Le délai est écoulé.'),
  NOT_RACING: t('La salle n’est plus en course.'), NOT_REGISTERED: t('Inscription nécessaire.'),
}
async function invoke<T>(name: string, body: object): Promise<T> {
  const { data, error } = await db.functions.invoke(name, { body, timeout: 15000 })
  if (error || !data) throw new Error(t('Serveur indisponible. Réessaie dès que la connexion revient.'))
  if (!data.ok) throw new Refusal(data.message ? ruleText(data.message) : messages[data.error] || data.error)
  return data.data as T
}

function write(change: () => void) {
  const before = JSON.stringify(save.versus)
  const credits = save.credits
  change()
  persist()
  if (storageWarning.value) {
    save.versus = JSON.parse(before)
    save.credits = credits
    throw new Error(t('Impossible d’enregistrer la mise sur cet appareil.'))
  }
}

export async function identify(nickname: string) {
  const { data, error } = await db.auth.getSession()
  if (error) throw error
  let id = data.session?.user.id
  if (save.versus && id !== save.versus.id) throw new Error(t('Le compte de cette sauvegarde est lié à une autre session.'))
  if (save.versus) return
  if (!id) {
    const signed = await db.auth.signInAnonymously()
    if (signed.error) throw new Error(t('Connexion au serveur impossible.'))
    id = signed.data.user?.id
  }
  const profile = await invoke<Omit<VersusAccount, 'active'>>('register', { nickname })
  if (profile.id !== id) throw new Error(t('Compte Versus inattendu.'))
  write(() => { save.versus = { id: profile.id, nickname: profile.nickname, friend_code: profile.friend_code, active: null } })
}

export const preview = (code: string) => invoke<Invitation>('join-room', { code, preview: true })
export const move = (room: string, sector: number, choice: object) => invoke('submit-move', { room, sector, ...choice })
export async function resolve(room: string) {
  try { await invoke('resolve-due', { room }) }
  catch (e) { if (!(e instanceof Refusal && e.message === 'NOT_DUE')) throw e }
}

export function engage(request: Engagement) { write(() => reserve(save, request)) }

export async function snapshot(): Promise<Snapshot> {
  const active = save.versus?.active
  if (!active) throw new Error(t('Aucune salle en cours.'))
  const request = active.request
  if (request) {
    try {
      await invoke(request.code ? 'join-room' : 'create-room', { ...request, room_id: request.id })
    } catch (e) {
      // Une réponse réseau perdue conserve la demande pour la renvoyer avec le même identifiant.
      if (e instanceof Refusal) write(() => { save.credits += active.stake; save.versus!.active = null })
      throw e
    }
    write(() => { delete active.request })
  }
  const { data, error } = await db.rpc('gv_snapshot', { room_id: active.room })
  if (error || !data) throw new Error(t('Impossible de synchroniser la salle.'))
  const state = data as Snapshot
  if (state.settlement && active.payout === undefined) {
    if (!state.settlement.claimed) {
      try { await invoke('claim-settlement', { room: active.room }) }
      catch (e) { if (!(e instanceof Refusal && e.message === 'ALREADY_CLAIMED')) throw e }
    }
    // Le reçu privé reste lisible si la réponse du premier appel a été perdue.
    write(() => settle(save, active.room, state.settlement!.delta))
  }
  return state
}

export function dismiss() {
  if (save.versus?.active?.payout !== undefined) write(() => { save.versus!.active = null })
}

export function subscribe(room: string, refresh: () => void) {
  const channel = db.channel('versus-' + room)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gv_rooms', filter: 'id=eq.' + room }, refresh)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gv_rounds', filter: 'room=eq.' + room }, refresh)
    .subscribe(status => { if (status === 'SUBSCRIBED') refresh() })
  return () => { void db.removeChannel(channel) }
}
