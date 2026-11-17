import type { VersusEntry } from './rules'

export interface Invitation { id: string; cap: number; stake: number }
export interface Engagement extends Invitation {
  code?: string
  rematch_of?: string
  credits: number
  lineup: VersusEntry[]
}
export interface VersusAccount {
  id: string
  nickname: string
  friend_code: string
  active: { room: string; stake: number; request?: Engagement; payout?: number } | null
}

type Wallet = { credits: number; versus: VersusAccount | null }

// Le solde et la salle sont écrits ensemble dans la même sauvegarde.
export function reserve(wallet: Wallet, request: Engagement) {
  const account = wallet.versus
  if (!account || account.active || wallet.credits < request.stake) throw new Error('Engagement impossible')
  wallet.credits -= request.stake
  account.active = { room: request.id, stake: request.stake, request }
}

export function settle(wallet: Wallet, room: string, delta: number) {
  const active = wallet.versus?.active
  if (active?.room !== room || active.payout !== undefined) return
  if (!Number.isSafeInteger(delta) || delta < 0) throw new Error('Règlement invalide')
  wallet.credits += delta
  active.payout = delta
  delete active.request
}
