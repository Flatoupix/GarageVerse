// Vérification hors réseau du client, avec la sauvegarde et les règles réelles.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const compile = filename => ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
require.extensions['.ts'] = (module, filename) => module._compile(compile(filename), filename)
const { newSave, readSave, sellCheck } = require('./save.ts')
const rules = require('./trade.ts')
const store = { save: newSave(), storageWarning: { value: false } }
const navigator = { onLine: true }
let stored
let player = 'a'
let fault
let calls = 0
const rows = []
const callsOf = []
const unavailable = () => ({ error: { context: { status: 503 } } })
const ok = { data: { ok: true } }
function create(recipient, give, want, previous_id = null) {
  const items = (side, cars, credits) => [
    ...cars.map(([car_id, snapshot]) => ({ side, car_id, snapshot: { ...snapshot, parts: [] }, credits: null })),
    ...(credits ? [{ side, car_id: null, snapshot: null, credits }] : []),
  ]
  rows.push({
    id: String(rows.length + 1), proposer: player, recipient, previous_id, state: 'open',
    gv_trade_items: [...items('proposer', Object.entries(give.cars), give.credits), ...items('recipient', [], want.credits)],
    gv_trade_claims: [],
  })
}
const db = {
  auth: {
    initialize: async () => { calls++ },
    stopAutoRefresh: async () => {},
    getSession: async () => ({ data: { session: { user: { id: player } } } }),
  },
  from(table) {
    assert.equal(table, 'gv_trades')
    calls++
    return { select: () => ({ order: () => ({ range: () => ({
      returns: async () => fault === 'read' ? unavailable() : {
        data: structuredClone(rows.filter(row => [row.proposer, row.recipient].includes(player))),
      },
    }) }) }) }
  },
  functions: {
    async invoke(name, { body }) {
      callsOf.push(name)
      const row = rows.find(row => row.id === body.id)
      if (name === 'propose-trade') create(body.recipient, body.give, body.want)
      if (name === 'answer-trade') {
        assert.equal(row.state, 'open')
        if (body.action === 'counter') {
          row.state = 'countered'
          create(row.proposer, body.give, body.want, row.id)
        } else row.state = body.action === 'accept' ? 'accepted' : 'declined'
      }
      if (name === 'claim-trade') {
        assert.equal(row.state, 'accepted')
        assert.equal(JSON.parse(stored).trades[row.id].state, 'transit')
        if (!row.gv_trade_claims.some(claim => claim.player_id === player)) row.gv_trade_claims.push({ player_id: player })
        if (row.gv_trade_claims.length === 2) row.state = 'done'
      }
      if (fault === name) { fault = undefined; return unavailable() }
      return ok
    },
  },
}

let imports = 0
const mocks = { './trade': rules, './save': { SAVE_KEY: 'save' }, './store': store,
  './features': { VERSUS_OPEN: false }, '../i18n': { t: text => text }, './versus': { db } }
function loadClient() {
  const exports = {}
  vm.runInNewContext(compile(__dirname + '/trade-client.ts'), {
    exports, navigator,
    fetch: () => assert.fail('fetch inattendu'),
    localStorage: { setItem: (_, value) => { stored = value } },
    require(name) {
      if (name === './versus') imports++
      assert.ok(Object.hasOwn(mocks, name), name)
      return mocks[name]
    },
  })
  return exports
}

async function run() {
  let client = loadClient()
  const offer = { cars: [], credits: 25 }
  const want = { cars: [], credits: 10 }
  const sync = () => client.syncTrades()
  await assert.rejects(sync(), /Connexion nécessaire/)
  await assert.rejects(client.publishShowcase([]), /Connexion nécessaire/)
  assert.equal(imports, 0)
  assert.equal(calls, 0)
  store.save.preferences.friendsEnabled = true
  navigator.onLine = false
  await assert.rejects(sync(), /Connexion nécessaire/)
  assert.equal(calls, 0)
  navigator.onLine = true

  const car = 'f40'
  store.save.cars[car] = {
    copies: 1, stage: 0, parts: [], editions: ['Solarpunk'], shown: 'Solarpunk', favorite: false,
    upgrades: { acc: 0, vit: 0, man: 0, end: 0 },
  }
  const give = { ...offer, cars: [car] }
  const aCredits = store.save.credits
  fault = 'propose-trade'
  await assert.rejects(client.proposeTrade('b', give, want), /Serveur indisponible/)
  assert.equal(store.save.trades, undefined)
  await client.proposeTrade('b', give, want)
  assert.equal(rows.length, 1)
  assert.equal(store.save.trades['1'].state, 'ouverte')
  assert.equal((await client.listTrades()).sent[0].id, '1')
  await client.publishShowcase([car])
  assert.equal(callsOf.at(-1), 'set-showcase')
  let a = stored
  const b = newSave()
  b.preferences.friendsEnabled = true
  const bCredits = b.credits
  player = 'b'
  store.save = b
  assert.equal((await client.listTrades()).received[0].id, '1')
  fault = 'answer-trade'
  await assert.rejects(client.answerTrade('1', 'accept'), /Serveur indisponible/)
  assert.equal(store.save.credits, bCredits)
  fault = 'claim-trade'
  await assert.rejects(client.answerTrade('1', 'accept'), /Serveur indisponible/)
  assert.equal(store.save.trades['1'].state, 'transit')
  assert.equal(store.save.credits, bCredits - want.credits)
  const bTransit = stored
  store.save = readSave(stored)
  client = loadClient()
  await sync()
  assert.equal(JSON.stringify(store.save.trades), JSON.stringify(JSON.parse(bTransit).trades))
  assert.equal(callsOf.filter(name => name === 'claim-trade').length, 1)

  player = 'a'
  store.save = readSave(a)
  await sync()
  assert.equal(rows[0].state, 'done')
  assert.equal(store.save.cars[car], undefined)
  assert.ok(sellCheck(store.save, car))
  assert.equal(store.save.credits, aCredits - offer.credits + want.credits)
  a = stored
  await sync()
  assert.equal(JSON.stringify(store.save), a)

  player = 'b'
  store.save = readSave(bTransit)
  await sync()
  assert.equal(store.save.cars[car].copies, 1)
  assert.equal(store.save.credits, bCredits - want.credits + offer.credits)
  const delivered = JSON.stringify(store.save)
  await client.claimTrade('1')
  assert.equal(JSON.stringify(store.save), delivered)

  await client.proposeTrade('a', offer, want)
  player = 'a'
  store.save = readSave(a)
  fault = 'answer-trade'
  await assert.rejects(client.counterTrade('2', offer, want), /Serveur indisponible/)
  const list = await client.counterTrade('2', offer, want)
  assert.equal(list.sent.find(row => row.id === '3').previous_id, '2')
  assert.equal(rows.length, 3)
  a = stored

  player = 'b'
  store.save = readSave(delivered)
  await sync()
  assert.ok(!store.save.trades?.['2'] || store.save.trades['2'].state === 'rendue')
  await client.answerTrade('3', 'accept')
  const inTransit = JSON.stringify(store.save)
  fault = 'read'
  await assert.rejects(sync(), /Serveur indisponible/)
  assert.equal(JSON.stringify(store.save), inTransit)
  fault = undefined
  rows[2].state = 'returned'
  await sync()
  assert.equal(store.save.trades['3'].state, 'rendue')
  assert.equal(store.save.credits, JSON.parse(delivered).credits)

  player = 'a'
  store.save = readSave(a)
  await client.proposeTrade('b', offer, want)
  rows.at(-1).state = 'expired'
  await sync()
  assert.equal(store.save.trades['4'].state, 'rendue')
  console.log('Échanges client · transit durable, livraison unique, reprise, retours et contre-offres')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
