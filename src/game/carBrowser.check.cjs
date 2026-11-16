const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { newSave, readSave } = require('./save.ts')
const { vehicles, rarities } = require('./data.ts')
const { statsOf } = require('./rules.ts')
const { prepOf } = require('./save.ts')
const { browserSort, filterCars, normalize, overBudget } = require('./carBrowser.ts')
const save = newSave()
const old = readSave(JSON.stringify(save))
assert.equal(browserSort(old.preferences, 'browse'), 'number')
assert.equal(browserSort(old.preferences, 'pick'), 'circuit')
// A single preference object feeds both consumers, including after persistence.
for (const sort of ['number', 'rarity', 'power', 'stage', 'cost', 'cost-desc', 'acc', 'vit', 'man', 'end', 'copies', 'year', 'name']) {
  save.preferences.garageSort = sort
  const restored = readSave(JSON.stringify(save))
  assert.equal(browserSort(restored.preferences, 'browse'), sort)
  assert.equal(browserSort(restored.preferences, 'pick'), sort)
}
save.preferences.garageSort = 'circuit'
save.preferences.garageRarity = 'Épique'
save.preferences.garageCols = 3
const restored = readSave(JSON.stringify(save))
assert.equal(browserSort(restored.preferences, 'pick'), 'circuit')
assert.equal(browserSort(restored.preferences, 'browse'), 'number')
assert.equal(restored.preferences.garageSort, 'circuit')
assert.equal(restored.preferences.garageRarity, 'Épique')
assert.equal(restored.preferences.garageCols, 3)
save.preferences.garageSort = 'invalide'
assert.equal(browserSort(readSave(JSON.stringify(save)).preferences, 'pick'), 'circuit')
// Give every car to the fixture so every criterion has meaningful comparisons.
const sample = Object.values(save.cars)[0]
assert.ok(sample)
for (const [index, v] of vehicles.entries()) save.cars[v.id] = { ...structuredClone(sample), favorite: index % 3 === 0, copies: index % 5 + 1 }
const base = { view: 'owned', rarity: '', category: '', query: '' }
const list = (overrides = {}, sort = 'number', lineup = save.lineup, averages = {}) => filterCars(save, { ...base, ...overrides }, sort, lineup, averages)
assert.equal(list().length, vehicles.length)
assert.ok(list({ view: 'favorites' }).every(v => save.cars[v.id].favorite))
assert.equal(list({ view: 'favorites' }).length, vehicles.filter(v => save.cars[v.id].favorite).length)
const selection = vehicles.slice(0, 3).map(v => v.id)
assert.deepEqual(new Set(list({ view: 'lineup' }, 'number', selection).map(v => v.id)), new Set(selection))
for (const rarity of rarities) assert.deepEqual(new Set(list({ rarity }).map(v => v.id)), new Set(vehicles.filter(v => v.rarity === rarity).map(v => v.id)))
const category = vehicles[0].tags[0]
assert.ok(category)
assert.deepEqual(new Set(list({ category }).map(v => v.id)), new Set(vehicles.filter(v => v.tags.includes(category) || v.culture?.aura.includes(category)).map(v => v.id)))
assert.ok(list({ query: String(vehicles[0].year) }).every(v => normalize(`${v.name} ${v.version} ${v.year}`).includes(String(vehicles[0].year))))
assert.equal(normalize('ÉCURIE'), 'ecurie')
assert.equal(list({ query: 'aucune-voiture-xyz' }).length, 0)
assert.ok(list({ rarity: vehicles[0].rarity, category, query: vehicles[0].name }).some(v => v.id === vehicles[0].id))
const metrics = {
  cost: v => v.cost, 'cost-desc': v => -v.cost, rarity: v => -rarities.indexOf(v.rarity),
  copies: v => -save.cars[v.id].copies, year: v => -v.year,
  power: v => -Object.values(statsOf(v, prepOf(save, v.id))).reduce((sum, value) => sum + value, 0),
  stage: v => { const p = prepOf(save, v.id); return -(p.stage * 100 + Object.values(p.upgrades ?? {}).reduce((sum, level) => sum + level, 0) * 10 + p.parts.length) },
}
for (const stat of ['acc', 'vit', 'man', 'end']) metrics[stat] = v => -statsOf(v, prepOf(save, v.id))[stat]
for (const [sort, metric] of Object.entries(metrics)) {
  const result = list({}, sort)
  for (let i = 1; i < result.length; i++) assert.ok(metric(result[i - 1]) <= metric(result[i]), sort)
}
const names = list({}, 'name')
for (let i = 1; i < names.length; i++) assert.ok(names[i - 1].name.localeCompare(names[i].name, 'fr') <= 0)
const averages = Object.fromEntries(vehicles.map((v, i) => [v.id, i]))
assert.equal(list({}, 'circuit', selection, averages)[0].id, vehicles.at(-1).id)
assert.equal(overBudget(selection[0], 10, selection, 9, 9), 0)
assert.equal(overBudget('absente', 3, selection, 8, 9), 2)
assert.equal(overBudget('absente', 1, selection, 8, 9), 0)
assert.equal(overBudget('absente', 1, [], 0, 9), 0)
delete save.cars[vehicles[0].id]
assert.ok(!list().some(v => v.id === vehicles[0].id))
assert.ok(list({ view: 'collection' }).some(v => v.id === vehicles[0].id))
console.log('CarBrowser : filtres, tris, plafond, préférences partagées et anciennes sauvegardes vérifiés')
