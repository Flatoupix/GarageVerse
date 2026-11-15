const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { boundZoom, toggleZoom } = require('./zoom.ts')
assert.deepEqual(boundZoom(0, 200, -300, 200, 300), { scale: 1, x: 0, y: 0 })
for (const [width, height] of [[200, 300], [280, 420], [100, 150]]) {
  assert.deepEqual(boundZoom(5, 9999, -9999, width, height), { scale: 3, x: width, y: -height })
  assert.deepEqual(boundZoom(2, width, height, width, height), { scale: 2, x: width / 2, y: height / 2 })
  assert.deepEqual(boundZoom(2.5, 10, -10, width, height), { scale: 2.5, x: 10, y: -10 })
}
assert.equal(toggleZoom(1), 2.5)
assert.equal(toggleZoom(toggleZoom(1)), 1)
assert.equal(boundZoom(2.5 * 2, 0, 0, 200, 300).scale, 3)
assert.deepEqual(boundZoom(3, 100, 100, 0, 0), { scale: 3, x: 0, y: 0 })
console.log('Zoom : contrôles réussis')
const { newSave, readSave } = require('./save.ts')
const save = newSave()
assert.equal(save.preferences.garageSort, undefined)
assert.equal(save.preferences.garageRarity, undefined)
save.preferences.garageSort = 'copies'
save.preferences.garageRarity = 'Épique'
const restored = readSave(JSON.stringify(save))
assert.equal(restored.preferences.garageSort, 'copies')
assert.equal(restored.preferences.garageRarity, 'Épique')
save.preferences.garageSort = 'invalide'
save.preferences.garageRarity = 'invalide'
const invalid = readSave(JSON.stringify(save))
assert.equal(invalid.preferences.garageSort, undefined)
assert.equal(invalid.preferences.garageRarity, undefined)
