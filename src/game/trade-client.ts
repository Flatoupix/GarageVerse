// Le serveur décide de la livraison. La sauvegarde fait foi pour les mouvements déjà appliqués.
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { VERSUS_OPEN } from './features'
import { discardEditionPurchase, SAVE_KEY, type Save } from './save'
import { exchangeAlerts, save, storageWarning } from './store'
import { acknowledgeTrade, completeTrade, normalizeTradeCar, openTrade, receiveTrade, returnTrade, transitTrade, validateTradeOffer, validateTradeShowcase, type TradeGoods, type TradeOffer } from './trade'

export type Side = 'proposer' | 'recipient'
type State = 'open' | 'accepted' | 'done' | 'returned' | 'declined' | 'countered' | 'expired'
type Item = { side: Side; car_id: string | null; snapshot: Save['cars'][string] | null; credits: number | null }
export interface Trade {
  id: string
  proposer: string
  recipient: string
  previous_id: string | null
  state: State
  created_at: string
  expires_at: string
  gv_trade_items: Item[]
  gv_trade_claims: { player_id: string }[]
}

const connectionRequired = () => new Error(t('Connexion nécessaire'))
const unavailable = () => new Error(t('Serveur indisponible. Réessaie dès que la connexion revient.'))
const invalid = () => new Error(t('Échange indisponible'))
const live = (trade: Trade) => trade.state === 'open' || trade.state === 'accepted'
const sideOf = (trade: Trade, player: string): Side => trade.proposer === player ? 'proposer' : 'recipient'
const otherSide = (side: Side): Side => side === 'proposer' ? 'recipient' : 'proposer'
const receiptId = (id: string) => id + ':reception'
const lotChanged = () => t('Le lot a changé depuis la proposition.')
// Une voiture en pleine course ou déjà en transit redevient disponible d'elle-même : l'offre attend.
const passing = (problem: string) => problem === t('Cette voiture est en pleine course et ne peut pas être échangée') || problem === t('En transit')
// Une erreur de livraison n'est signalée qu'une fois par échange, pas à chaque reprise de l'application.
const reported = new Set<string>()

export function goodsOf(trade: Trade, side: Side): TradeGoods {
  const items = trade.gv_trade_items.filter(item => item.side === side)
  return {
    cars: Object.fromEntries(items.flatMap(item => item.car_id !== null && item.snapshot ? [[item.car_id, item.snapshot]] : [])),
    credits: items.find(item => item.credits !== null)?.credits ?? 0,
  }
}

function offerOf(trade: Trade, side: Side): TradeOffer {
  const goods = goodsOf(trade, side)
  return { cars: Object.keys(goods.cars), credits: goods.credits }
}

function check(problem: string | undefined) {
  if (problem) throw new Error(problem)
}

async function connect() {
  const preferences = save.preferences
  const guard = () => {
    if (preferences !== save.preferences || preferences.friendsEnabled !== true || !navigator.onLine) throw connectionRequired()
  }
  guard()
  const { db } = await import('./versus')
  guard()
  if (!VERSUS_OPEN && !save.versus?.active) {
    await db.auth.initialize()
    await db.auth.stopAutoRefresh()
  }
  guard()
  const { data, error } = await db.auth.getSession()
  guard()
  if (error) throw unavailable()
  const player = data.session?.user.id
  if (!player) throw connectionRequired()
  return { db, player, guard }
}

type Connection = Awaited<ReturnType<typeof connect>>

async function call({ db, guard }: Connection, name: string, body: object, conflicts: string[] = []) {
  guard()
  const { data, error } = await db.functions.invoke(name, { body, timeout: 15000 })
  guard()
  const status = error?.context?.status
  if (status === 401) throw connectionRequired()
  if (status >= 400 && status < 500) {
    const refusal = await error.context.json().catch(() => null)
    if (conflicts.includes(refusal?.error)) return
    if (refusal?.error === 'NOT_REGISTERED') throw connectionRequired()
    if (refusal?.error === 'CAR_NOT_IN_SHOWCASE') throw new Error(t('Cette voiture ne figure plus dans la vitrine de ton ami.'))
    if (refusal?.error === 'OPEN_TRADE_LIMIT') throw new Error(t('Tu as déjà dix offres d’échange ouvertes'))
    if (refusal?.error) throw invalid()
  }
  if (error || data?.ok !== true) throw unavailable()
}

async function read({ db, guard }: Connection) {
  const trades: Trade[] = []
  const size = 200
  for (let offset = 0; ; offset += size) {
    guard()
    const { data, error } = await db.from('gv_trades')
      .select('id, proposer, recipient, previous_id, state, created_at, expires_at, gv_trade_items(side, car_id, snapshot, credits), gv_trade_claims(player_id)')
      .order('id').range(offset, offset + size - 1).returns<Trade[]>()
    guard()
    if (error || !data) throw unavailable()
    trades.push(...data)
    if (data.length < size) return trades
  }
}

// Les transitions d'un échange sont publiées ensemble, après écriture durable.
function update(connection: Connection, change: (draft: Save) => void) {
  connection.guard()
  const before = JSON.stringify(save)
  const draft: Save = JSON.parse(before)
  change(draft)
  const after = JSON.stringify(draft)
  if (after === before) return
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...draft, editionPurchase: undefined }))
    storageWarning.value = false
  } catch {
    storageWarning.value = true
    throw new Error(t('Impossible d’enregistrer cet échange sur cet appareil.'))
  }
  const { cars, parts, credits, lineup, nightLineup, dailyLineup, seenCars, trades, tradeHistory } = draft
  if (!draft.editionPurchase) delete save.editionPurchase
  Object.assign(save, { cars, parts, credits, lineup, nightLineup, dailyLineup, seenCars, trades, tradeHistory })
}

function deliver(draft: Save, trade: Trade, side: Side) {
  const { id } = trade
  if (draft.trades?.[id]?.state === 'transit') check(completeTrade(draft, id))
  check(receiveTrade(draft, { id: receiptId(id), state: 'recue', goods: goodsOf(trade, otherSide(side)) }))
  check(acknowledgeTrade(draft, id))
}

function apply(connection: Connection, trade: Trade) {
  const { id, state } = trade
  const side = sideOf(trade, connection.player)
  const record = save.trades?.[id]
  if (save.tradeHistory?.includes(id) || record?.state === 'quarantaine') return
  if (state === 'open') {
    if (side === 'proposer' && !record) update(connection, draft => check(openTrade(draft, id, offerOf(trade, side))))
  } else if (state === 'accepted') {
    if (!record || record.state === 'ouverte') {
      update(connection, draft => {
        const problem = transitTrade(draft, id, offerOf(trade, side), goodsOf(trade, side))
        check(problem === lotChanged() ? t('Échange bloqué : ta voiture a changé depuis l’offre. Il sera annulé à l’échéance et tout te sera rendu.') : problem)
      })
    }
  } else if (state === 'done') {
    // Une livraison exige un transit durable de ce garage, créé avant sa réclamation.
    if (record?.state === 'transit' || record?.state === 'recue') update(connection, draft => deliver(draft, trade, side))
  } else if (record?.state === 'ouverte' || record?.state === 'transit') {
    update(connection, draft => check(returnTrade(draft, id)))
  }
}

async function reconcile(connection: Connection, initial?: Trade[], only?: string) {
  let trades = initial ?? await read(connection)
  let problem: unknown
  const applyEach = (rows: Trade[]) => {
    // Libérer les anciennes réservations avant d'ouvrir les nouvelles.
    for (const trade of [...rows.filter(trade => !live(trade)), ...rows.filter(live)]) {
      try { apply(connection, trade) } catch (cause) {
        if (!reported.has(trade.id)) problem ??= cause
        reported.add(trade.id)
      }
    }
  }
  applyEach(trades)
  // Une offre envoyée que ce garage ne pourrait plus honorer est annulée avant d'être acceptée, au lieu de rester bloquée en transit.
  const notices: string[] = []
  let changed = false
  for (const trade of trades) {
    if (trade.state !== 'open' || trade.proposer !== connection.player || save.trades?.[trade.id]?.state !== 'ouverte') continue
    const refusal = transitTrade(JSON.parse(JSON.stringify(save)), trade.id, offerOf(trade, 'proposer'), goodsOf(trade, 'proposer'))
    if (!refusal || passing(refusal)) continue
    await call(connection, 'answer-trade', { id: trade.id, action: 'cancel' }, ['TRADE_EXPIRED', 'TRADE_NOT_OPEN'])
    notices.push(t('Offre annulée : {reason}', { reason: refusal === lotChanged() ? t('ta voiture a changé depuis l’offre.') : refusal }))
    changed = true
  }
  let claimed = changed
  for (const trade of trades) {
    if (trade.state !== 'accepted' || (only && trade.id !== only) || save.trades?.[trade.id]?.state !== 'transit'
      || trade.gv_trade_claims.some(claim => claim.player_id === connection.player)) continue
    // Vérifier que le lot entrant tient dans le garage avant de confirmer la réclamation.
    try { deliver(JSON.parse(JSON.stringify(save)), trade, sideOf(trade, connection.player)) }
    catch (cause) { problem ??= cause; continue }
    // Un reçu obtenu ici reste provisoire jusqu'à la décision commune.
    await call(connection, 'claim-trade', { id: trade.id }, ['TRADE_RETURNED', 'TRADE_NOT_ACCEPTED'])
    claimed = true
  }
  if (claimed) {
    trades = await read(connection)
    applyEach(trades)
  }
  await refreshShowcase(connection)
  if (problem) throw problem
  return lists(trades, connection.player, notices)
}

function lists(trades: Trade[], player: string, notices: string[] = []) {
  const received = trades.filter(trade => live(trade) && trade.recipient === player)
  exchangeAlerts.offers = received.filter(trade => trade.state === 'open' && Date.parse(trade.expires_at) > Date.now()).length
  return {
    received,
    sent: trades.filter(trade => live(trade) && trade.proposer === player),
    history: trades.filter(trade => !live(trade)),
    notices,
  }
}

// La vitrine suit le garage : une voiture partie en est retirée, une voiture changée (doublon, niveau, style) y est mise à jour.
async function refreshShowcase(connection: Connection) {
  try {
    const shown = await readShowcase(connection, connection.player)
    const ids = Object.keys(shown).filter(id => Object.hasOwn(save.cars, id))
    const current = (id: string) => JSON.stringify(normalizeTradeCar(id, save.cars[id]))
    if (ids.length === Object.keys(shown).length && ids.every(id => current(id) === JSON.stringify(shown[id]))) return
    for (const id of ids) discardEditionPurchase(save, id)
    await call(connection, 'set-showcase', { cars: Object.fromEntries(ids.map(id => [id, save.cars[id]])) })
  } catch {
    // La prochaine synchronisation réessaiera ; les échanges eux-mêmes ne dépendent pas de cette mise à jour.
  }
}

// Une seule opération locale à la fois, même si plusieurs événements demandent une reprise.
const queuedTrades = ref(0)
export const tradeBusy = computed(() => queuedTrades.value > 0)
let pending: Promise<unknown> = Promise.resolve()
function run<T>(action: (connection: Connection) => Promise<T>): Promise<T> {
  queuedTrades.value++
  const result = pending.then(async () => action(await connect())).finally(() => { queuedTrades.value-- })
  pending = result.catch(() => {})
  return result
}

let syncing: ReturnType<typeof listTrades> | undefined
export function syncTrades() {
  syncing ??= run(connection => reconcile(connection)).finally(() => { syncing = undefined })
  return syncing
}

export const listTrades = () => run(async connection => lists(await read(connection), connection.player))
export const claimTrade = (id: string) => run(connection => reconcile(connection, undefined, id))

export const publishShowcase = (carIds: readonly string[]) => run(async connection => {
  check(validateTradeShowcase(save, carIds))
  for (const id of carIds) discardEditionPurchase(save, id)
  await call(connection, 'set-showcase', { cars: Object.fromEntries(carIds.map(id => [id, save.cars[id]])) })
})

async function readShowcase({ db, guard }: Connection, owner: string) {
  guard()
  const { data, error } = await db.from('gv_showcase').select('car_id, snapshot').eq('player_id', owner)
    .returns<{ car_id: string; snapshot: Save['cars'][string] }[]>()
  guard()
  if (error || !data) throw unavailable()
  const cars: TradeGoods['cars'] = {}
  for (const row of data) {
    const car = normalizeTradeCar(row.car_id, row.snapshot)
    if (car) cars[row.car_id] = car
  }
  return cars
}

export const listShowcase = (player?: string) => run(connection => readShowcase(connection, player ?? connection.player))

export const listFriendShowcase = (id: string) => run(async connection => {
  const { db, player, guard } = connection
  guard()
  const { data, error } = await db.from('gv_friendships').select('requester, recipient')
    .eq('id', id).eq('state', 'accepted').maybeSingle<{ requester: string; recipient: string }>()
  guard()
  if (error) throw unavailable()
  if (!data) throw invalid()
  const owner = data.requester === player ? data.recipient : data.requester
  return { owner, cars: await readShowcase(connection, owner) }
})

function payload(give: TradeOffer, want: TradeOffer) {
  check(validateTradeOffer(save, give))
  return { give: { cars: Object.fromEntries(give.cars.map(id => [id, save.cars[id]])), credits: give.credits }, want }
}

function sameOffer(a: TradeOffer, b: TradeOffer) {
  if (a.credits !== b.credits || a.cars.length !== b.cars.length) return false
  const sorted = [...b.cars].sort()
  return [...a.cars].sort().every((id, index) => id === sorted[index])
}

export const proposeTrade = (recipient: string, give: TradeOffer, want: TradeOffer) => run(async connection => {
  const trades = await read(connection)
  const existing = trades.some(trade => live(trade) && trade.proposer === connection.player && trade.recipient === recipient
    && sameOffer(offerOf(trade, 'proposer'), give) && sameOffer(offerOf(trade, 'recipient'), want))
  if (!existing) await call(connection, 'propose-trade', { recipient, ...payload(give, want) })
  return reconcile(connection)
})

export const answerTrade = (id: string, action: 'accept' | 'refuse' | 'cancel') => run(async connection => {
  const trades = await read(connection)
  const trade = trades.find(row => row.id === id)
  if (!trade) throw invalid()
  if (trade.state !== 'open') return reconcile(connection, trades)
  if (action === 'accept') {
    // Vérifier le transit sans modifier la sauvegarde avant la décision du serveur.
    const side = sideOf(trade, connection.player)
    check(transitTrade(JSON.parse(JSON.stringify(save)), id, offerOf(trade, side), goodsOf(trade, side)))
  }
  await call(connection, 'answer-trade', { id, action }, ['TRADE_EXPIRED', 'TRADE_NOT_OPEN'])
  return reconcile(connection)
})

export const counterTrade = (id: string, give: TradeOffer, want: TradeOffer) => run(async connection => {
  const trades = await read(connection)
  if (trades.some(trade => trade.previous_id === id)) return reconcile(connection, trades)
  await call(connection, 'answer-trade', { id, action: 'counter', ...payload(give, want) }, ['TRADE_EXPIRED', 'TRADE_NOT_OPEN'])
  return reconcile(connection)
})
