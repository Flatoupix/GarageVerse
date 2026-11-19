// Vérification hors réseau : node src/game/perfect-steps.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)

const { rivals } = require('./data.ts')
const { newSave, perfectSteps, readSave } = require('./save.ts')
const [{ id }, otherRival] = rivals
const save = newSave()
const win = Object.freeze({ wins: 1, losses: 0, perfect: false })
const perfect = Object.freeze({ ...win, perfect: true })
const cases = [
  [{}, [false, false, false]],
  [{ [id]: perfect }, [false, false, true]],
  [{ [id + ':1']: perfect, [id + ':2']: perfect }, [true, true, false]],
  [{ [id + ':1']: perfect, [id + ':2']: perfect, [id]: perfect }, [true, true, true]],
  [{ [id + ':1']: win, [id + ':2']: perfect, [otherRival.id]: perfect }, [false, true, false]],
]

for (const [record, expected] of cases) {
  const current = Object.freeze({ ...save, record: Object.freeze(record) })
  const before = JSON.stringify(current)
  assert.deepEqual(perfectSteps(current, id), expected)
  assert.equal(JSON.stringify(current), before)
}
const savedFinal = readSave(JSON.stringify({ ...save, record: { [id]: perfect } }))
assert.deepEqual(perfectSteps(savedFinal, id), [false, false, true])
console.log('Victoires parfaites par étape : OK')
