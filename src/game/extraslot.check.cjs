// Vérification hors réseau : node src/game/extraslot.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { newSave, readSave, extraSlotCheck, unlockExtraSlot, install, installCheck } = require('./save.ts')
const { EXTRA_SLOT_PRICE } = require('./rules.ts')

// Une voiture maxée : Stage 3 et les quatre ateliers au niveau 2.
function maxedSave() {
  const save = newSave()
  save.cars.f40 ??= { copies: 1, stage: 0, parts: [], editions: ['Pixel 16 bits'], shown: 'Pixel 16 bits', favorite: false, upgrades: { acc: 0, vit: 0, man: 0, end: 0 } }
  const car = save.cars.f40
  car.stage = 3
  car.upgrades = { acc: 2, vit: 2, man: 2, end: 2 }
  car.parts = []
  for (const id of ['nitro', 'underglow', 'admission', 'stage1', 'allegement', 'aileron', 'pneus-route', 'pneus-semi']) save.parts[id] = 1
  save.credits = 5000
  return save
}

let save = maxedSave()
// Pas de 3ᵉ pièce en Pneus et suspension.
assert.equal(extraSlotCheck(save, 'f40', 'man'), 'Pas de 3ᵉ pièce sur cet atelier')
// Avant achat, une 2ᵉ pièce Spécial remplace la première.
assert.equal(install(save, 'f40', 'nitro'), undefined)
assert.equal(install(save, 'f40', 'underglow'), undefined)
assert.deepEqual(save.cars.f40.parts, ['underglow'])
// Après achat sur Transmission et nitro, nitro et néons tiennent ensemble.
assert.equal(unlockExtraSlot(save, 'f40', 'acc'), undefined)
assert.equal(save.credits, 5000 - EXTRA_SLOT_PRICE)
assert.equal(install(save, 'f40', 'nitro'), undefined)
assert.deepEqual([...save.cars.f40.parts].sort(), ['nitro', 'underglow'])
// Le 3ᵉ emplacement ne vaut que pour sa famille : deux pneus restent impossibles.
assert.equal(install(save, 'f40', 'pneus-route'), undefined)
assert.equal(install(save, 'f40', 'pneus-semi'), undefined)
assert.deepEqual(save.cars.f40.parts.filter(p => p.startsWith('pneus')), ['pneus-semi'])
// Déplacer l'emplacement demande d'abord de retirer la 2ᵉ pièce Spécial.
assert.equal(extraSlotCheck(save, 'f40', 'vit'), 'Retire d’abord la 3ᵉ pièce de Transmission et nitro')
// Le rechargement garde les deux pièces Spécial et n'en accepte pas deux ailleurs.
let back = readSave(JSON.stringify(save))
assert.deepEqual([...back.cars.f40.parts].sort(), ['nitro', 'pneus-semi', 'underglow'])
save.cars.f40.parts.push('pneus-route')
back = readSave(JSON.stringify(save))
assert.deepEqual(back.cars.f40.parts.filter(p => p.startsWith('pneus')), ['pneus-semi'])

// Un emplacement acheté sur Pneus et suspension avant la règle est remboursé une fois.
save = maxedSave()
save.cars.f40.extraSlot = 'man'
save.cars.f40.parts = ['pneus-route', 'pneus-semi']
const credits = save.credits
back = readSave(JSON.stringify(save))
assert.equal(back.cars.f40.extraSlot, undefined)
assert.equal(back.credits, credits + EXTRA_SLOT_PRICE)
assert.deepEqual(back.cars.f40.parts, ['pneus-route'])
assert.equal(readSave(JSON.stringify(back)).credits, back.credits)
// La 2ᵉ pièce Gestion moteur a aussi besoin de potentiel.
save = maxedSave()
unlockExtraSlot(save, 'f40', 'vit')
install(save, 'f40', 'admission')
assert.ok([undefined, 'Potentiel de préparation insuffisant'].includes(installCheck(save, 'f40', 'stage1')))
console.log('3ᵉ emplacement : Spécial, Gestion moteur et Châssis seulement, pas de doubles pneus, remboursement : OK')
