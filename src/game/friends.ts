import { t } from '../i18n'
import { VERSUS_OPEN } from './features'
import { save } from './store'
import type { VersusAccount } from './versus-wallet'

type Profile = Pick<VersusAccount, 'nickname' | 'friend_code'>
export interface Friendship extends Profile {
  id: string
  state: 'pending' | 'accepted'
  outgoing: boolean
}
export type FriendAction = 'accept' | 'refuse' | 'remove'

const connectionRequired = () => new Error(t('Connexion nécessaire'))
const unavailable = () => new Error(t('Serveur indisponible. Réessaie dès que la connexion revient.'))
const messages: Record<string, () => string> = {
  INVALID_NICKNAME: () => t('Choisis un pseudo de 2 à 20 caractères.'),
  INVALID_FRIEND_CODE: () => t('Saisis un code ami de 6 lettres ou chiffres.'),
  UNKNOWN_FRIEND_CODE: () => t('Ce code ami est inconnu.'),
  SELF_REQUEST: () => t('C’est ton propre code ami.'),
  ALREADY_FRIENDS: () => t('Vous êtes déjà amis.'),
  ALREADY_REQUESTED: () => t('Tu as déjà envoyé cette demande.'),
  PENDING_LIMIT: () => t('Tu as déjà 10 demandes envoyées en attente.'),
  FRIEND_LIMIT: () => t('L’un de vous a déjà 50 amis.'),
  FRIENDSHIP_UNAVAILABLE: () => t('Cette demande ou amitié n’est plus disponible.'),
  UNAUTHORIZED: () => t('Connexion nécessaire'),
  NOT_REGISTERED: () => t('Connexion nécessaire'),
}

function checkConnection() {
  if (save.preferences.friendsEnabled !== true || !navigator.onLine) throw connectionRequired()
}

async function connect() {
  checkConnection()
  const { db } = await import('./versus')
  // Pour les échanges, la session se rafraîchit à la demande, sans trafic en arrière-plan.
  if (!VERSUS_OPEN && !save.versus?.active) {
    await db.auth.initialize()
    await db.auth.stopAutoRefresh()
  }
  checkConnection()
  const { data, error } = await db.auth.getSession()
  if (error) throw navigator.onLine ? unavailable() : connectionRequired()
  checkConnection()
  return { db, session: data.session }
}

async function call(db: Awaited<ReturnType<typeof connect>>['db'], name: string, body: object) {
  checkConnection()
  const { data, error } = await db.functions.invoke(name, { body, timeout: 15000 })
  if (error?.context?.status === 401) throw connectionRequired()
  if (error || !data) throw unavailable()
  if (!data.ok) throw new Error(messages[data.error]?.() ?? unavailable().message)
}

export async function loadFriends(): Promise<{ profile: Profile | null; list: Friendship[] }> {
  const { db, session } = await connect()
  if (!session) return { profile: null, list: [] }
  const { data: profile, error: profileError } = await db.from('gv_players')
    .select('nickname, friend_code').eq('id', session.user.id).maybeSingle<Profile>()
  if (profileError) throw unavailable()
  if (!profile) return { profile: null, list: [] }
  checkConnection()
  const { data, error } = await db.rpc('gv_friends')
  if (error || !data) throw unavailable()
  return { profile, list: data as Friendship[] }
}

export async function registerFriends(nickname: string) {
  const { db, session } = await connect()
  if (!session) {
    checkConnection()
    const { error } = await db.auth.signInAnonymously()
    if (error) throw unavailable()
  }
  await call(db, 'register', { nickname })
}

async function changeFriend(name: string, body: object) {
  const { db, session } = await connect()
  if (!session) throw connectionRequired()
  await call(db, name, body)
}

export const requestFriend = (code: string) => changeFriend('request-friend', { code })
export const answerFriend = (id: string, action: FriendAction) => changeFriend('answer-friend', { id, action })
