// Vérification hors réseau : node src/game/legend.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { newSave, readSave } = require('./save.ts')
const { defaultStyle, formerStyle, PIXEL, vehicles } = require('./data.ts')

const legends = vehicles.filter(v => v.anim)
assert.equal(legends.length, 14)
for (const v of legends) assert.equal(defaultStyle(v.id), formerStyle(v.id), `${v.id} montre son image fixe`)
const plain = vehicles.find(v => !v.anim)
assert.equal(defaultStyle(plain.id), PIXEL)

const car = editions => ({ copies: 1, stage: 0, parts: [], editions, shown: editions[0], favorite: false, upgrades: { acc: 0, vit: 0, man: 0, end: 0 } })

// Une légendaire restée sur l'ancien défaut pixel prend sa nouvelle image.
const legend = legends[0].id
const old = JSON.parse(JSON.stringify(newSave()))
old.cars[legend] = car([PIXEL])
const migrated = readSave(JSON.stringify(old))
assert.equal(migrated.cars[legend].shown, defaultStyle(legend))
assert.ok(migrated.cars[legend].editions.includes(PIXEL), 'le pixel reste une édition possédée')

// Une carte ordinaire ne change pas.
const ordinary = JSON.parse(JSON.stringify(newSave()))
ordinary.cars[plain.id] = car([PIXEL])
assert.equal(readSave(JSON.stringify(ordinary)).cars[plain.id].shown, PIXEL)

// Une légendaire qui possède déjà son image fixe et affiche le pixel par choix garde le pixel.
const chosen = JSON.parse(JSON.stringify(newSave()))
chosen.cars[legend] = car([PIXEL, defaultStyle(legend)])
chosen.cars[legend].shown = PIXEL
assert.equal(readSave(JSON.stringify(chosen)).cars[legend].shown, PIXEL)
console.log('Légendaires : image fixe par défaut, migration et choix du joueur : OK')
