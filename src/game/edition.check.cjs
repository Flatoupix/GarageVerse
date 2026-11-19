// Vérification hors réseau : node src/game/edition.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { collect, newSave, readSave, seriesProgress, showroomStyles, unlockEdition, unlockEditionCheck, editionPrice, editionDuplicates } = require('./save.ts')
const { defaultStyle, PIXEL, series, stylesOf, vehicles } = require('./data.ts')

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

function pullCar(save, id, style) {
  const pull = { kind: 'car', id, style, isNew: !save.cars[id] }
  save.opening = { booster: 'starter', pulls: [pull], revealed: 1, view: 'face', collected: false }
  const before = save.cars[id]?.editions.slice() ?? []
  collect(save)
  const expected = before.includes(style) ? before : [...before, style]
  assert.deepEqual(save.cars[id].editions, expected)
  return readSave(JSON.stringify(save))
}

// Un premier tirage alternatif garde sa seule édition après rechargement.
for (const style of ['Solarpunk', 'Abandonnée', 'Classic', 'Anime']) {
  const fresh = newSave()
  const { id } = vehicles.find(v => !v.anim && !fresh.cars[v.id] && stylesOf(v.id).includes(style))
  const beforeCount = Object.keys(fresh.cars).length
  const beforeSeries = series.map(entry => seriesProgress(fresh, entry))
  const after = pullCar(fresh, id, style)
  assert.equal(Object.keys(after.cars).length, beforeCount + 1)
  const expectedSeries = series.map((entry, index) => beforeSeries[index] + Number(entry.vehicles.includes(id)))
  assert.deepEqual(series.map(entry => seriesProgress(after, entry)), expectedSeries)
  assert.deepEqual(after.cars[id].editions, [style])
  assert.deepEqual(showroomStyles(id, after.cars[id]), [style])
  assert.ok(stylesOf(id).includes(PIXEL))
  assert.notEqual(unlockEditionCheck(after, id, PIXEL), 'Style déjà débloqué')
  assert.equal(after.cars[id].shown, style)
  assert.equal(after.cars[id].copies, 1)
  delete after.exactEditions
  assert.deepEqual(readSave(JSON.stringify(after)).cars[id], after.cars[id])

  // Un doublon de l'alternative ne débloque toujours pas le Pixel.
  const duplicate = pullCar(after, id, style)
  assert.deepEqual(duplicate.cars[id].editions, [style])
  assert.equal(duplicate.cars[id].copies, 2)
  const pixel = pullCar(duplicate, id, PIXEL)
  assert.deepEqual(pixel.cars[id].editions, [style, PIXEL])
  assert.deepEqual(showroomStyles(id, pixel.cars[id]), [style, PIXEL])
  assert.equal(pixel.cars[id].shown, style)
  assert.equal(pixel.cars[id].copies, 3)
  assert.equal(Object.keys(pixel.cars).length, beforeCount + 1)
  assert.deepEqual(series.map(entry => seriesProgress(pixel, entry)), expectedSeries)

  // Une sauvegarde v2 antérieure conserve ses deux éditions et son apparence.
  delete pixel.exactEditions
  assert.deepEqual(readSave(JSON.stringify(pixel)).cars[id], pixel.cars[id])
}

// Une voiture de départ garde son 16 bits et gagne uniquement l'édition tirée.
assert.deepEqual(showroomStyles(id, undefined), stylesOf(id))
const starter = pullCar(newSave(), id, 'Solarpunk')
assert.deepEqual(starter.cars[id].editions, [PIXEL, 'Solarpunk'])
assert.equal(starter.cars[id].copies, 2)

// Le défaut fixe d'une légendaire ne s'ajoute pas à un autre tirage.
const legend = vehicles.find(v => v.anim).id
for (const style of [defaultStyle(legend), PIXEL, 'Solarpunk']) {
  const after = pullCar(newSave(), legend, style)
  assert.deepEqual(after.cars[legend].editions, [style])
  assert.equal(after.cars[legend].shown, style)
  assert.equal(after.cars[legend].copies, 1)
}
console.log('Tirages : seules les éditions tirées sont ajoutées, même après rechargement : OK')

const { scrapCar, sellCar, undoEditionUnlock } = require('./save.ts')
const { inTransit, openTrade, returnTrade, transitTrade, TRADE_CREDIT_LIMIT } = require('./trade.ts')
const at = 1000

function garage(copies = 3) {
  const state = newSave()
  state.credits = TRADE_CREDIT_LIMIT
  state.cars[id].copies = copies
  state.lineup = []
  state.nightLineup = []
  state.cars.f40 = { ...structuredClone(state.cars[id]), copies: 3, editions: ['Solarpunk'], shown: 'Solarpunk' }
  return state
}

function bought(copies) {
  const state = garage(copies)
  assert.equal(unlockEdition(state, id, 'Solarpunk', at), undefined)
  return state
}

function refused(state, carId = id, now = at + 1) {
  const before = JSON.stringify(state)
  assert.equal(undoEditionUnlock(state, carId, now), undefined)
  assert.equal(JSON.stringify(state), before)
}

const restored = bought()
const receipt = restored.editionPurchase
assert.deepEqual(receipt, { id, style: 'Solarpunk', previous: PIXEL, credits: price, duplicates: 2, remaining: 1, at })
assert.equal(undoEditionUnlock(restored, id, at + 29_999), receipt)
assert.equal(restored.credits, TRADE_CREDIT_LIMIT)
assert.deepEqual(restored.cars[id], garage().cars[id])
refused(restored)
assert.equal(unlockEdition(restored, id, 'Solarpunk', at + 30_000), undefined)
assert.equal(restored.credits, TRADE_CREDIT_LIMIT - price)
assert.equal(restored.cars[id].copies, 1)

refused(bought(), id, at + 30_000)
refused(bought(), 'f40')
refused(readSave(JSON.stringify(bought())))
assert.equal(readSave(JSON.stringify({ ...bought(), editionPurchase: { credits: 100 } })).editionPurchase, undefined)
const depleted = bought(4)
depleted.cars[id].copies--
refused(depleted)

const capped = bought()
capped.credits++
refused(capped)

const sold = bought()
assert.equal(sellCar(sold, id), undefined)
refused(sold)

const recycled = bought(4)
assert.equal(scrapCar(recycled, id), undefined)
recycled.cars[id].copies++ // Un nouveau doublon ne réactive pas l’annulation.
refused(recycled)

const traded = bought()
const offer = { cars: [id], credits: 0 }
assert.equal(transitTrade(traded, 'transit', offer), undefined)
assert.ok(inTransit(traded, id))
refused(traded)
assert.equal(returnTrade(traded, 'transit'), undefined)
refused(traded)

const offered = bought()
assert.equal(openTrade(offered, 'offre', offer), undefined)
refused(offered)
assert.equal(returnTrade(offered, 'offre'), undefined)
refused(offered)

const alreadyOffered = garage()
assert.equal(openTrade(alreadyOffered, 'offre', offer), undefined)
assert.equal(unlockEdition(alreadyOffered, id, 'Solarpunk', at), undefined)
refused(alreadyOffered)

const twice = bought(5)
assert.equal(unlockEdition(twice, id, 'Abandonnée', at + 1), undefined)
assert.equal(twice.cars[id].copies, 1)
assert.ok(unlockEdition(twice, id, 'Solarpunk', at + 2))
assert.equal(undoEditionUnlock(twice, id, at + 2)?.style, 'Abandonnée')
assert.equal(twice.cars[id].shown, 'Solarpunk')
assert.equal(twice.cars[id].copies, 3)
refused(twice)

const another = bought()
assert.equal(unlockEdition(another, 'f40', 'Abandonnée', at + 1), undefined)
refused(another, id, at + 2)
console.log('Annulation d’édition : restitution, délai, plafonds et invalidations : OK')
