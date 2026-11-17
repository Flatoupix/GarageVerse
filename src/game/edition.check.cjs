// Vérification hors réseau : node src/game/edition.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { newSave, readSave, unlockEdition, unlockEditionCheck, editionPrice, editionDuplicates } = require('./save.ts')
const { stylesOf } = require('./data.ts')

assert.equal(editionDuplicates, 2)
const id = 'clio'
// Une carte propose Solarpunk et Abandonnée exactement quand ses deux images existent.
const path = require('node:path')
const cars = path.join(__dirname, '../assets/cars')
for (const v of require('../data/roster.json').vehicles) {
  const files = fs.existsSync(path.join(cars, `${v.id}-solarpunk.webp`)) && fs.existsSync(path.join(cars, `${v.id}-abandonnee.webp`))
  const styles = stylesOf(v.id)
  assert.equal(styles.includes('Solarpunk') && styles.includes('Abandonnée'), files, `éditions de ${v.id}`)
  // Édition Anime : japonaises hors cartes déjà illustrées en anime, et son image existe.
  const anime = v.origin === 'Japon' && v.look !== 'anime'
  assert.equal(styles.includes('Anime'), anime, `édition Anime de ${v.id}`)
  if (anime) assert.ok(fs.existsSync(path.join(cars, `${v.id}-anime.webp`)), `image Anime de ${v.id}`)
}

const save = newSave()
const price = editionPrice(id)
const car = save.cars[id]
car.copies = 1
save.credits = 0
// Ni crédits ni doublons : les deux raisons sont chiffrées.
assert.equal(unlockEditionCheck(save, id, 'Solarpunk'), `Il te manque ${price} crédits · Il te manque 2 doublons`)
// Assez de crédits mais un seul doublon.
save.credits = price
car.copies = 2
assert.equal(unlockEditionCheck(save, id, 'Solarpunk'), 'Il te manque 1 doublon')
assert.equal(unlockEdition(save, id, 'Solarpunk'), 'Il te manque 1 doublon')
assert.equal(save.credits, price)
assert.equal(car.copies, 2)
assert.ok(!car.editions.includes('Solarpunk'))
// Assez de doublons mais pas assez de crédits.
save.credits = price - 1
car.copies = 3
assert.equal(unlockEditionCheck(save, id, 'Solarpunk'), 'Il te manque 1 crédits')
// Tout est réuni : les crédits et deux doublons sont dépensés, il reste un exemplaire.
save.credits = price + 10
car.copies = 3
assert.equal(unlockEdition(save, id, 'Solarpunk'), undefined)
assert.equal(save.credits, 10)
assert.equal(car.copies, 1)
assert.ok(car.editions.includes('Solarpunk'))
assert.equal(car.shown, 'Solarpunk')
assert.equal(unlockEditionCheck(save, id, 'Solarpunk'), 'Style déjà débloqué')
assert.equal(unlockEditionCheck(save, id, 'Gouache'), 'Style indisponible pour cette voiture')

// Une partie qui avait déjà débloqué une édition la garde au rechargement.
const back = readSave(JSON.stringify(save))
assert.ok(back.cars[id].editions.includes('Solarpunk'))
assert.equal(back.cars[id].copies, 1)
console.log('Éditions : 2 doublons + crédits, raisons chiffrées, éditions gardées : OK')
