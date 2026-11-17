// Vérification hors réseau : node src/game/booster.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { newSave, readSave, collect } = require('./save.ts')
const { recycle, undoRecycle } = require('./recycle.ts')
const save = newSave()
const id = Object.keys(save.cars)[0]
save.cars[id].copies = 4
save.cars[id].favorite = true
save.cars[id].stage = 2
const before = JSON.stringify(save)
const receipt = recycle(save, id, 1000)
assert.ok(receipt)
assert.equal(save.cars[id].copies, 3)
assert.equal(undoRecycle(save, receipt, 'autre', 1001), 'Annulation expirée')
assert.equal(undoRecycle(save, receipt, id, 7000), 'Annulation expirée')
assert.equal(undoRecycle(save, receipt, id, 6999), undefined)
assert.equal(JSON.stringify(save), before)
assert.equal(undoRecycle(save, receipt, id, 6999), 'Annulation expirée')
const first = recycle(save, id, 1000)
const second = recycle(save, id, 1001)
const spent = save.credits
save.credits = 0
assert.match(undoRecycle(save, second, id, 1002), /^Il te manque \d+ crédits pour annuler$/)
assert.equal(save.credits, 0)
assert.equal(second.used, false)
save.credits = spent
assert.equal(undoRecycle(save, second, id, 1002), undefined)
assert.equal(save.cars[id].copies, 3)
assert.ok(!JSON.stringify(save).includes('expires'))
assert.equal(save.preferences.touchHelp, false)
const old = JSON.parse(before)
delete old.seenCars
delete old.preferences.touchHelp
const restored = readSave(JSON.stringify(old))
assert.equal(restored.preferences.touchHelp, true)
assert.deepEqual(restored.seenCars, Object.keys(restored.cars))
assert.equal(readSave(null, JSON.stringify({ version: 1 })).preferences.touchHelp, true)
const { vehicles } = require('./data.ts')
const fresh = vehicles.find(v => !save.cars[v.id] && !v.craft)
save.opening = { booster: 'neon', revealed: 1, collected: false, view: 'face', pulls: [{ kind: 'car', id: fresh.id, style: 'Classic', isNew: true }] }
collect(save)
assert.ok(save.cars[fresh.id])
assert.ok(!save.seenCars.includes(fresh.id))
assert.ok(!readSave(JSON.stringify(save)).seenCars.includes(fresh.id))
console.log('Recyclage, annulation et compatibilité des sauvegardes : OK')
