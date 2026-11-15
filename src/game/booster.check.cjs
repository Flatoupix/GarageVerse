// Vérification hors réseau : node src/game/booster.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { newSave, readSave, buyBooster, drawPulls, tear, sealedHasLegend } = require('./save.ts')
const { boosters, vehicleById, partById } = require('./data.ts')
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
  assert.ok(save.sealedPulls.filter(p => p.kind === 'part').length <= 1)
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
}
assert.ok(sawLegend && sawNormal)
const old = newSave()
old.sealed = 'neon'
delete old.sealedPulls
const restored = readSave(JSON.stringify(old))
assert.equal(sealedHasLegend(restored), false)
tear(restored, rngFor(2))
assert.equal(restored.opening.pulls.length, 5)
console.log('Boosters : scellé, cinq cartes, probabilités, reprise, légendaire et ancienne sauvegarde : OK')
