// Vérification hors réseau : node src/game/trade.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)

const { claimSeries, freeParts, install, newSave, readSave } = require('./save.ts')
const { series, stylesOf, vehicles } = require('./data.ts')
const { completeTrade, openTrade, receiveTrade, returnTrade, transitTrade, validateTradeOffer } = require('./trade.ts')

const id = 'f40'
const offer = { cars: [id], credits: 25 }
const reload = save => readSave(JSON.stringify(save))
const car = (editions = ['Solarpunk']) => ({
  copies: 1, stage: 0, parts: [], editions, shown: editions[0], favorite: false,
  upgrades: { acc: 0, vit: 0, man: 0, end: 0 },
})
function garage() {
  const save = newSave()
  save.cars[id] = {
    ...car(['Solarpunk', 'Abandonnée']), stage: 3, favorite: true, extraSlot: 'acc',
    upgrades: { acc: 2, vit: 2, man: 2, end: 2 },
  }
  for (const part of ['nitro', 'underglow']) {
    save.parts[part] = 1
    assert.equal(install(save, id, part), undefined)
  }
  return save
}
function refused(save, action) {
  const before = JSON.stringify(save)
  assert.ok(action())
  assert.equal(JSON.stringify(save), before)
}

assert.ok(validateTradeOffer(newSave(), offer))
for (const engage of [
  save => { save.lineup = [id] },
  save => { save.nightLineup = [id] },
  save => { save.dailyLineup = [id] },
  save => { save.duel = { player: { lineup: [{ id }] } } },
  save => { save.night = { lineup: [id] } },
  save => { save.versus = { active: { request: { lineup: [{ id }] } } } },
]) {
  const save = garage()
  engage(save)
  refused(save, () => transitTrade(save, 'engagée', offer))
}
const valid = garage()
for (const credits of [valid.credits + 1, -1, 1.5, Infinity]) {
  assert.ok(validateTradeOffer(valid, { ...offer, credits }))
}
assert.ok(validateTradeOffer(valid, { ...offer, cars: [id, id] }))
assert.equal(validateTradeOffer(valid, { ...offer, credits: valid.credits }), undefined)
const small = garage()
delete small.cars[small.lineup.pop()]
assert.ok(validateTradeOffer(small, offer))
for (let i = 0; i < 10; i++) assert.equal(openTrade(valid, String(i), { cars: [], credits: 1 }), undefined)
refused(valid, () => openTrade(valid, '11', { cars: [], credits: 1 }))
assert.equal(returnTrade(valid, '0'), undefined)
assert.equal(openTrade(valid, '11', { cars: [], credits: 1 }), undefined)
const pending = garage()
assert.equal(openTrade(pending, 'proposition', offer), undefined)
assert.ok(validateTradeOffer(pending, offer))
assert.deepEqual(reload(pending).trades, pending.trades)
pending.credits = 0
refused(pending, () => transitTrade(pending, 'proposition'))

const donor = reload(garage())
const receiver = newSave()
receiver.seenCars.push(id) // Une carte revendue doit pouvoir réapparaître comme nouvelle.
const set = series.find(set => set.vehicles.includes(id))
assert.ok(set)
for (const other of set.vehicles.filter(other => other !== id)) receiver.cars[other] ??= car()
const donorClaim = series[0].id
donor.series.push(donorClaim)
const original = structuredClone(donor.cars[id])
const balance = donor.credits
assert.equal(original.copies, 1)
assert.ok(claimSeries(receiver, set.id))
assert.equal(transitTrade(donor, '__proto__', offer), undefined)
assert.ok(!donor.cars[id])
assert.equal(donor.credits, balance - offer.credits)
assert.equal(donor.parts.nitro, 0)
assert.equal(freeParts(donor, 'nitro'), 0)
assert.deepEqual(donor.trades.__proto__.goods.cars[id], original)
assert.deepEqual(donor.series, [donorClaim])
assert.deepEqual(reload(donor).trades, donor.trades)
const staleTransit = structuredClone(donor.trades.__proto__)
refused(receiver, () => receiveTrade(receiver, staleTransit))
assert.equal(completeTrade(donor, '__proto__'), undefined)
const delivery = reload(donor).trades.__proto__
assert.equal(freeParts(donor, 'nitro'), 1)
assert.equal(freeParts(donor, 'underglow'), 1)
refused(donor, () => completeTrade(donor, '__proto__'))
refused(donor, () => returnTrade(donor, '__proto__'))
refused(donor, () => receiveTrade(donor, delivery))
const receiverCredits = receiver.credits
assert.equal(receiveTrade(receiver, delivery), undefined)
assert.deepEqual(receiver.cars[id], { ...original, parts: [] })
assert.equal(receiver.credits, receiverCredits + offer.credits)
assert.ok(!receiver.seenCars.includes(id))
assert.deepEqual(receiver.series, [])
assert.deepEqual(donor.series, [donorClaim])
assert.equal(claimSeries(receiver, set.id), undefined)
refused(receiver, () => claimSeries(receiver, set.id))
const received = reload(receiver)
assert.deepEqual(received.trades, receiver.trades)
refused(received, () => receiveTrade(received, delivery))
refused(received, () => returnTrade(received, '__proto__'))

const returning = reload(garage())
returning.series.push(donorClaim)
const before = structuredClone(returning)
assert.equal(transitTrade(returning, 'retour', offer), undefined)
const beforeReturn = structuredClone(returning.trades.retour)
const restored = reload(returning)
assert.equal(returnTrade(restored, 'retour'), undefined)
for (const key of ['cars', 'credits', 'parts', 'series']) assert.deepEqual(restored[key], before[key])
refused(restored, () => returnTrade(restored, 'retour'))
refused(restored, () => completeTrade(restored, 'retour'))
refused(receiver, () => receiveTrade(receiver, beforeReturn))
refused(receiver, () => receiveTrade(receiver, restored.trades.retour))
assert.deepEqual(reload(restored).trades, restored.trades)
const reacquired = garage()
assert.equal(transitTrade(reacquired, 'booster', offer), undefined)
reacquired.cars[id] = car(['Synthwave'])
assert.equal(returnTrade(reacquired, 'booster'), undefined)
assert.deepEqual(reacquired.cars[id], {
  ...original, copies: original.copies + 1, editions: [...original.editions, 'Synthwave'],
})

const duplicate = newSave()
duplicate.credits = 1e7
duplicate.cars[id] = { ...car(['Abandonnée', 'Abandonnée']), copies: 999, stage: 2, upgrades: { acc: 2, vit: 0, man: 1, end: 0 } }
duplicate.seenCars.push(id)
duplicate.parts.nitro = 1
assert.equal(install(duplicate, id, 'nitro'), undefined)
assert.equal(receiveTrade(duplicate, delivery), undefined)
assert.deepEqual(duplicate.cars[id], {
  ...car(['Abandonnée', 'Solarpunk']), copies: 1000, stage: 3, parts: ['nitro'], extraSlot: 'acc',
  upgrades: { acc: 2, vit: 2, man: 2, end: 2 },
})
assert.ok(duplicate.seenCars.includes(id))
assert.deepEqual(reload(duplicate).cars, duplicate.cars)
assert.equal(reload(duplicate).credits, 1e7 + offer.credits)
const mixed = newSave()
mixed.cars[id] = { ...car(), stage: 2, upgrades: { acc: 2, vit: 0, man: 1, end: 0 } }
const mixedDonor = newSave()
mixedDonor.cars[id] = { ...car(), stage: 1, upgrades: { acc: 0, vit: 2, man: 0, end: 1 } }
assert.equal(transitTrade(mixedDonor, 'niveaux', offer), undefined)
assert.equal(completeTrade(mixedDonor, 'niveaux'), undefined)
assert.equal(receiveTrade(mixed, mixedDonor.trades.niveaux), undefined)
assert.equal(mixed.cars[id].stage, 2)
assert.deepEqual(mixed.cars[id].upgrades, { acc: 2, vit: 2, man: 1, end: 1 })

const old = reload(newSave())
for (const trades of [null, 4, [], {}, { inutilisable: { id: 'inutilisable', state: 'transit', goods: { cars: { [id]: null }, credits: 2 } } }]) {
  assert.deepEqual(reload({ ...old, trades }), old)
}

// On contrôle le total à chaque étape, y compris entre la décision de livraison et sa réception.
const garages = Array.from({ length: 4 }, garage)
const pool = vehicles.filter(v => !garages[0].cars[v.id]).slice(0, 12).map(v => v.id)
for (const [i, save] of garages.entries()) {
  for (const id of pool.slice(i * 2, i * 2 + 6)) save.cars[id] = { ...car([stylesOf(id)[1]]), copies: i + 1 }
}
const exchanges = []
function totals() {
  let credits = 0
  const copies = new Map(), parts = new Map()
  const add = (counts, key, value) => counts.set(key, (counts.get(key) ?? 0) + value)
  const addCars = cars => {
    for (const [id, car] of Object.entries(cars)) add(copies, id, car.copies)
  }
  for (const save of garages) {
    credits += save.credits
    addCars(save.cars)
    for (const [id, count] of Object.entries(save.parts)) add(parts, id, count)
  }
  for (const { from, to, id } of exchanges) {
    const record = garages[from].trades?.[id]
    if (record?.state === 'transit' || (record?.state === 'recue' && !garages[to].trades?.[id])) {
      credits += record.goods.credits
      addCars(record.goods.cars)
      for (const car of Object.values(record.goods.cars)) for (const part of car.parts) add(parts, part, 1)
    }
  }
  return { credits, copies, parts }
}

const initial = totals()
let seed = 0xc011ec7
const random = limit => {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
  return (seed >>> 8) % limit
}
let transits = 0, returns = 0, deliveries = 0
for (let i = 0; i < 1200; i++) {
  const action = random(7)
  if (action === 0 || !exchanges.length) {
    const from = random(garages.length)
    const to = (from + 1 + random(garages.length - 1)) % garages.length
    const save = garages[from]
    const candidates = Object.keys(save.cars).filter(id => !save.lineup.includes(id) && !save.nightLineup.includes(id))
    const id = String(i)
    const offer = { cars: candidates.length && random(4) ? [candidates[random(candidates.length)]] : [], credits: random(51) }
    if (!openTrade(save, id, offer)) exchanges.push({ from, to, id })
  } else {
    const { from, to, id } = exchanges[random(exchanges.length)]
    const donor = garages[from], receiver = garages[to], record = donor.trades[id]
    if (action === 1 && !transitTrade(donor, id)) transits++
    if (action === 2 && !completeTrade(donor, id)) deliveries++
    if (action === 3) {
      if (!returnTrade(donor, id) && record.state === 'transit') returns++
    }
    if (action === 4 || action === 5) receiveTrade(receiver, record)
    if (action === 6) garages[from] = reload(donor)
  }
  assert.deepEqual(totals(), initial, `Conservation à l’opération ${i}`)
}
assert.ok(transits > 10 && deliveries > 5 && returns > 5)
for (const { from, to, id } of exchanges) {
  const donor = garages[from], receiver = garages[to], record = donor.trades[id]
  if (record.state === 'recue' && !receiver.trades?.[id]) assert.equal(receiveTrade(receiver, record), undefined)
  if (record.state === 'transit' || record.state === 'ouverte') assert.equal(returnTrade(donor, id), undefined)
}
assert.deepEqual(totals(), initial)
console.log('Échanges : validation, transit, réception, retours et conservation sur 1 200 opérations : OK')
