// Le serveur décide de la livraison. La sauvegarde fait foi pour les mouvements déjà appliqués.
import { t } from '../i18n'
import { VERSUS_OPEN } from './features'
import { SAVE_KEY, type Save } from './save'
import { save, storageWarning } from './store'
import { acknowledgeTrade, completeTrade, openTrade, receiveTrade, returnTrade, transitTrade, validateTradeOffer, validateTradeShowcase, type TradeGoods, type TradeOffer } from './trade'

type Side = 'proposer' | 'recipient'
type State = 'open' | 'accepted' | 'done' | 'returned' | 'declined' | 'countered' | 'expired'
type Item = { side: Side; car_id: string | null; snapshot: Save['cars'][string] | null; credits: number | null }
interface Trade {
  id: string
  proposer: string
  recipient: string
  previous_id: string | null
  state: State
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

function goodsOf(trade: Trade, side: Side): TradeGoods {
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
      .select('id, proposer, recipient, previous_id, state, expires_at, gv_trade_items(side, car_id, snapshot, credits), gv_trade_claims(player_id)')
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
    localStorage.setItem(SAVE_KEY, after)
    storageWarning.value = false
  } catch {
    storageWarning.value = true
    throw new Error(t('Impossible d’enregistrer cet échange sur cet appareil.'))
  }
  const { cars, parts, credits, lineup, nightLineup, dailyLineup, seenCars, trades, tradeHistory } = draft
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
      update(connection, draft => check(transitTrade(draft, id, offerOf(trade, side), goodsOf(trade, side))))
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
      try { apply(connection, trade) } catch (cause) { problem ??= cause }
    }
  }
  applyEach(trades)
  let claimed = false
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
  if (problem) throw problem
  return lists(trades, connection.player)
}

function lists(trades: Trade[], player: string) {
  return {
    received: trades.filter(trade => live(trade) && trade.recipient === player),
    sent: trades.filter(trade => live(trade) && trade.proposer === player),
    history: trades.filter(trade => !live(trade)),
  }
}

// Une seule opération locale à la fois, même si plusieurs événements demandent une reprise.
let pending: Promise<unknown> = Promise.resolve()
function run<T>(action: (connection: Connection) => Promise<T>): Promise<T> {
  const result = pending.then(async () => action(await connect()))
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
  await call(connection, 'set-showcase', { cars: Object.fromEntries(carIds.map(id => [id, save.cars[id]])) })
})

export const listShowcase = (player: string) => run(async ({ db, guard }) => {
  guard()
  const { data, error } = await db.from('gv_showcase').select('car_id, snapshot').eq('player_id', player)
    .returns<{ car_id: string; snapshot: Save['cars'][string] }[]>()
  guard()
  if (error || !data) throw unavailable()
  return Object.fromEntries(data.map(row => [row.car_id, row.snapshot]))
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
