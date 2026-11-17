// Vérification hors réseau : node src/game/cardback.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
// Les images sont des modules Vite : ici elles valent simplement leur chemin.
require.extensions['.webp'] = (module, filename) => { module.exports = filename }
const { newSave, readSave, cardBackIds } = require('./save.ts')
const { cardBacks, cardBackOf, defaultCardBack } = require('./cardback.ts')

assert.deepEqual([...cardBackIds], ['a', 'b', 'c', 'd'])
assert.equal(cardBacks.length, 4)
assert.deepEqual(cardBacks.map(b => b.id), [...cardBackIds])
assert.equal(defaultCardBack, 'c')
assert.equal(cardBackOf(undefined).id, 'c')
assert.equal(cardBackOf('b').id, 'b')
assert.equal(cardBackOf('z').id, 'c')

// Une partie neuve et une ancienne partie n'ont pas de dos choisi : l'Autoroute s'applique.
const fresh = newSave()
assert.equal(fresh.preferences.cardBack, undefined)
const old = readSave(JSON.stringify(fresh))
assert.equal(old.preferences.cardBack, undefined)
assert.equal(cardBackOf(old.preferences.cardBack).id, 'c')

// Un dos choisi est gardé au rechargement, une valeur inconnue est ignorée.
for (const id of cardBackIds) {
  const save = JSON.parse(JSON.stringify(fresh))
  save.preferences.cardBack = id
  assert.equal(readSave(JSON.stringify(save)).preferences.cardBack, id)
}
const bad = JSON.parse(JSON.stringify(fresh))
bad.preferences.cardBack = 'zzz'
assert.equal(readSave(JSON.stringify(bad)).preferences.cardBack, undefined)
console.log('Dos des cartes : quatre au choix, défaut Autoroute, choix gardé : OK')
