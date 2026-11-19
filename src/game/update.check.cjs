// Vérification hors réseau : node src/game/update.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { deployedEntryName, differentEntry, entryScriptName, shouldOfferUpdate } = require('./update.ts')

const current = 'index-AbC_1234.js'
const next = 'index-DeF-5678.js'
assert.equal(entryScriptName(`./assets/${current}`), current)
assert.equal(deployedEntryName(`<script crossorigin src='./assets/${next}' type="module"></script>`), next)
assert.equal(deployedEntryName(`<script type=module src=./assets/${next}></script>`), next)
assert.equal(deployedEntryName(`<!-- <script type="module" src="./assets/${next}"></script> -->`), null)
assert.equal(deployedEntryName('<main>Erreur</main>'), null)
assert.equal(deployedEntryName('<script type="module" src="/src/main.ts"></script>'), null)
assert.equal(differentEntry(current, current), null)
assert.equal(differentEntry(current, next), next)
assert.equal(differentEntry(current, null), null)
assert.equal(differentEntry('', next), null)
assert.equal(differentEntry('main.ts', next), null)
assert.equal(differentEntry(current, 'index.js'), null)

const offered = differentEntry(current, next)
assert.equal(shouldOfferUpdate(offered, null), true)
const dismissed = offered
assert.equal(shouldOfferUpdate(offered, dismissed), false)
assert.equal(shouldOfferUpdate(differentEntry(current, 'index-new_9012.js'), dismissed), true)
assert.equal(shouldOfferUpdate(null, dismissed), false)
console.log('Mise à jour : empreinte du script et masquage par version : OK')
