// Journal de mise et reçu récupérable après rechargement.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { newSave, readSave } = require('./save.ts')
const { reserve, settle } = require('./versus-wallet.ts')

const old = newSave()
delete old.versus
const save = readSave(JSON.stringify(old))
assert.equal(save.versus, null)
save.versus = { id: 'player', nickname: 'Pilote', friend_code: 'ABC123', active: null }
const request = { id: 'room', cap: 9, stake: 50, credits: save.credits, lineup: [] }
reserve(save, request)
assert.throws(() => reserve(save, request))
const resumed = readSave(JSON.stringify(save))
assert.equal(resumed.credits, old.credits - 50)
assert.deepEqual(resumed.versus.active.request, request)
settle(resumed, 'other', 90)
assert.equal(resumed.credits, old.credits - 50)
settle(resumed, 'room', 90)
const claimed = readSave(JSON.stringify(resumed))
settle(claimed, 'room', 90)
assert.equal(claimed.credits, old.credits + 40)
assert.equal(claimed.versus.active.payout, 90)
console.log('Mise Versus : ancienne sauvegarde, engagement repris, reçu appliqué une seule fois : OK')
