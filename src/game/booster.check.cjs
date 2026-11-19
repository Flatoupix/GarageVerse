// Vérification hors réseau : node src/game/booster.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { newSave, readSave, buyBooster, buyBoosters, drawPulls, tear, collect, sealedHasLegend, batchStock, revealBatch } = require('./save.ts')
const { boosters, stylesOf, vehicleById, partById } = require('./data.ts')
const legendary = pulls => pulls.some(p => (p.kind === 'car' ? vehicleById : partById).get(p.id).rarity === 'Légendaire')
const rngFor = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
let sawLegend = false, sawNormal = false
for (const booster of boosters) for (let seed = 1; seed <= 100; seed++) {
  const save = newSave()
  save.tickets[booster.id] = seed % 2
  save.credits = 100000
  const expected = drawPulls(save, booster, rngFor(seed))
  assert.equal(buyBooster(save, booster.id, rngFor(seed)), undefined)
  assert.deepEqual(save.sealedPulls, expected)
  assert.equal(save.sealedPulls.length, 5)
  assert.ok(save.sealedPulls.filter(p => p.kind === 'part').length <= (booster.maxParts ?? 1))
  assert.equal(sealedHasLegend(save), legendary(expected))
  sawLegend ||= sealedHasLegend(save)
  sawNormal ||= !sealedHasLegend(save)
  const restored = readSave(JSON.stringify(save))
  assert.deepEqual(restored.sealedPulls, expected)
  assert.equal(sealedHasLegend(restored), legendary(expected))
  tear(restored, () => { throw new Error('Retirage interdit') })
  assert.deepEqual(restored.opening.pulls, expected)
  assert.equal(restored.sealed, null)
  assert.equal(restored.sealedPulls, null)
  assert.equal(sealedHasLegend(restored), false)
  const opened = restored.opening
  tear(restored, () => { throw new Error('Deuxième tirage interdit') })
  assert.equal(restored.opening, opened)
  assert.deepEqual(readSave(JSON.stringify(restored)).opening.pulls, expected)
  const before = { ...restored.parts }
  restored.opening.revealed = expected.length
  collect(restored)
  for (const [id] of partById) {
    assert.equal(restored.parts[id] ?? 0, (before[id] ?? 0) + expected.filter(p => p.kind === 'part' && p.id === id).length)
  }
  const collected = readSave(JSON.stringify(restored))
  const inventory = JSON.stringify({ cars: collected.cars, parts: collected.parts })
  collect(collected)
  assert.equal(JSON.stringify({ cars: collected.cars, parts: collected.parts }), inventory)
}
assert.ok(sawLegend && sawNormal)
const old = newSave()
old.sealed = 'neon'
delete old.sealedPulls
const restored = readSave(JSON.stringify(old))
assert.equal(sealedHasLegend(restored), false)
tear(restored, rngFor(2))
assert.equal(restored.opening.pulls.length, 5)

// Les sauvegardes antérieures aux lots gardent leur progression au chargement.
{
  const v2 = newSave()
  v2.tickets.neon = 6
  buyBooster(v2, 'neon', rngFor(7))
  delete v2.batch
  delete v2.batchSequence
  const restored = readSave(JSON.stringify(v2))
  assert.equal(restored.batch, undefined)
  assert.equal(restored.batchSequence, 0)
  assert.deepEqual(restored.tickets, v2.tickets)
  assert.deepEqual(restored.cars, v2.cars)
  assert.equal(restored.sealed, v2.sealed)
  assert.deepEqual(restored.sealedPulls, v2.sealedPulls)
}
{
  const v1 = JSON.stringify({ version: 1, openings: {
    neon: { collected: true, editions: ['venom-classic', 'venom-pixel'] },
  } })
  const restored = readSave(null, v1)
  assert.equal(restored.version, 2)
  assert.equal(restored.batch, undefined)
  assert.equal(restored.batchSequence, 0)
  assert.equal(restored.cars.venom.copies, 2)
  assert.deepEqual(restored.cars.venom.editions, ['Classic', 'Pixel Art'])
}
console.log('Boosters : scellé, cinq cartes, probabilités, reprise, légendaire et ancienne sauvegarde : OK')

for (const [index, booster] of boosters.entries()) {
  let total = 0
  const save = newSave()
  for (let seed = 1; seed <= 10000; seed++) {
    const pulls = drawPulls(save, booster, rngFor(seed))
    const pieces = pulls.filter(p => p.kind === 'part')
    assert.ok(pieces.length <= booster.maxParts)
    assert.equal(new Set(pieces.map(p => p.id)).size, pieces.length)
    total += pieces.length
    const { maxParts, ...legacy } = booster
    assert.ok(drawPulls(save, legacy, rngFor(seed)).filter(p => p.kind === 'part').length <= 1)
  }
  const mean = total / 10000
  assert.ok(Math.abs(mean - [0.6, 0.7, 0.85, 1.6, 5][index]) <= 0.1, `${booster.name} : ${mean}`)
  console.log(`${booster.name} : ${mean} pièce par sachet`)
}
// Lot historique à une pièce : aucune application des nouvelles probabilités.
const legacy = newSave()
legacy.sealed = 'neon'
const { maxParts, ...oldBooster } = boosters[0]
legacy.sealedPulls = drawPulls(legacy, oldBooster, rngFor(42))
const lot = JSON.parse(JSON.stringify(legacy.sealedPulls))
const historical = readSave(JSON.stringify(legacy))
tear(historical, () => { throw new Error('Retirage du lot historique') })
assert.deepEqual(historical.opening.pulls, lot)

// Achat groupé : prix × quantité, tickets ajoutés, premier sachet scellé, refus propres.
{
  const neon = boosters.find(b => b.id === 'neon')
  const save = newSave()
  save.tickets = {}
  save.credits = neon.price * 5
  assert.equal(buyBoosters(save, 'neon', 5, rngFor(7)), undefined)
  assert.equal(save.credits, 0)
  assert.equal(save.sealed, 'neon')
  assert.equal(save.tickets.neon, 4)
  assert.equal(buyBoosters(save, 'neon', 5), 'Termine d’abord le booster en cours')
  const poor = newSave()
  poor.credits = neon.price * 10 - 1
  assert.equal(buyBoosters(poor, 'neon', 10), 'Il manque 1 crédits')
  assert.equal(poor.credits, neon.price * 10 - 1)
  assert.equal(buyBoosters(poor, 'neon', 1), 'Quantité invalide')
  assert.equal(buyBoosters(poor, 'neon', 11), 'Quantité invalide')
  console.log('Achat groupé de boosters : OK')
}

// Un lot suit exactement les tirages et les attributions des ouvertures successives.
for (const booster of boosters) for (const count of [5, 10]) for (const source of ['achat', 'tickets', 'déchiré', 'stock']) {
  const initial = newSave()
  initial.credits = booster.price * count
  initial.tickets = source === 'achat' ? {} : { [booster.id]: count }
  const batchSave = structuredClone(initial)
  const singleSave = structuredClone(initial)
  const batchRng = rngFor(42), singleRng = rngFor(42)
  for (const [state, rng] of [[batchSave, batchRng], [singleSave, singleRng]]) {
    if (source === 'achat') assert.equal(buyBoosters(state, booster.id, count, rng), undefined)
    else if (source !== 'stock') assert.equal(buyBooster(state, booster.id, rng), undefined)
    if (source === 'déchiré') tear(state, rng)
  }
  const first = structuredClone(batchSave.sealedPulls ?? batchSave.opening?.pulls)
  const credits = batchSave.credits
  assert.equal(batchStock(batchSave, booster.id), count)
  const batch = revealBatch(batchSave, booster.id, count, 1, batchRng)
  assert.equal(batch.packs.length, count)
  assert.equal(batch.packs.flat().length, count * 5)
  if (first) assert.deepEqual(batch.packs[0], first)
  for (const pack of batch.packs) {
    if (!singleSave.sealed && (!singleSave.opening || singleSave.opening.collected)) {
      assert.equal(buyBooster(singleSave, booster.id, singleRng), undefined)
    }
    tear(singleSave, singleRng)
    assert.deepEqual(pack, singleSave.opening.pulls)
    assert.ok(pack.filter(pull => pull.kind === 'part').length <= booster.maxParts)
    singleSave.opening.revealed = 5
    collect(singleSave)
  }
  assert.deepEqual(batchSave.cars, singleSave.cars)
  assert.deepEqual(batchSave.parts, singleSave.parts)
  assert.deepEqual(batchSave.tickets, singleSave.tickets)
  assert.equal(batchSave.tickets[booster.id], 0)
  assert.equal(batchSave.credits, credits)
  const restored = readSave(JSON.stringify(batchSave))
  assert.deepEqual(restored.batch, batch)
  assert.deepEqual(restored.cars, batchSave.cars)
  assert.deepEqual(restored.parts, batchSave.parts)
  assert.deepEqual(restored.tickets, batchSave.tickets)
  assert.equal(restored.credits, credits)
  for (const state of [batchSave, restored]) {
    const before = JSON.stringify(state)
    assert.equal(revealBatch(state, booster.id, count, 1, () => assert.fail('Retirage du lot')), undefined)
    collect(state)
    assert.equal(JSON.stringify(state), before)
  }
  restored.batch = undefined
  restored.tickets[booster.id] = count
  assert.equal(revealBatch(restored, booster.id, count, 1), undefined)
  assert.ok(revealBatch(restored, booster.id, count, 2, batchRng))
}

{
  const save = newSave()
  save.tickets = { neon: 4 }
  assert.equal(batchStock(save, 'neon'), 4)
  assert.equal(revealBatch(save, 'neon', 5, 1, () => assert.fail('Stock insuffisant')), undefined)
  save.tickets.neon = 5
  buyBooster(save, 'neon', rngFor(52))
  const [ownedId, owned] = Object.entries(save.cars).find(([id]) => stylesOf(id).length > 1)
  const shown = owned.shown
  const other = stylesOf(ownedId).find(style => style !== shown)
  const fresh = [...vehicleById.keys()].find(id => !save.cars[id])
  save.sealedPulls.splice(0, 3,
    { kind: 'car', id: ownedId, style: other, isNew: true },
    { kind: 'car', id: fresh, style: stylesOf(fresh)[0], isNew: false },
    { kind: 'car', id: fresh, style: stylesOf(fresh)[0], isNew: true })
  const batch = revealBatch(save, 'neon', 5, 1, rngFor(53))
  assert.deepEqual(batch.packs[0].slice(0, 3).map(pull => pull.isNew), [false, true, false])
  assert.equal(save.cars[ownedId].shown, shown)
  assert.ok(save.cars[ownedId].editions.includes(other))
  const freshPulls = batch.packs.flat().filter(pull => pull.kind === 'car' && pull.id === fresh)
  assert.equal(freshPulls.filter(pull => pull.isNew).length, 1)
  assert.equal(save.cars[fresh].copies, freshPulls.length)
}
console.log('Ouverture groupée : 25/50 cartes, équivalence, éditions, tickets, reprise et idempotence : OK')
