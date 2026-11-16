// Vérification hors réseau : node src/game/debug.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { debugTap } = require('./debug.ts')
let state = { count: 0, lastTap: null }
for (let i = 0; i < 13; i++) {
  const result = debugTap(state, i * 100)
  assert.equal(result.triggered, false)
  state = result.state
}
assert.equal(state.count, 13)
const reward = debugTap(state, 1300)
assert.equal(reward.triggered, true)
assert.equal(reward.state.count, 0)
const restart = debugTap(reward.state, 1400)
assert.equal(restart.triggered, false)
assert.equal(restart.state.count, 1)
assert.equal(debugTap(state, 2701).state.count, 1)
assert.equal(debugTap(state, 2700).triggered, true)
assert.equal(debugTap(state, 100).state.count, 1)
console.log('Raccourci de debug : OK')
