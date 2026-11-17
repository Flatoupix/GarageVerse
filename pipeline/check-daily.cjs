// Vérification locale sans réseau : node pipeline/check-daily.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename)
}
const { dailyChallenge, constraintCheck, constraintCap, validDailyLineup, localDate } = require('../src/game/daily.ts')
const { newSave, prepareDaily, startDaily, claimDailyBooster, readSave } = require('../src/game/save.ts')
const { progression, vehicles } = require('../src/game/data.ts')
const types = new Set()
for (let day = 1; day <= 365; day++) {
  const date = localDate(new Date(2026, 0, day))
  const challenge = dailyChallenge(date)
  assert.deepEqual(challenge, dailyChallenge(date))
  assert.equal(challenge.weather.length, 5)
  assert.ok(validDailyLineup(progression.start.vehicles, challenge.constraint))
  assert.ok(constraintCap(challenge.constraint) <= 9)
  if (challenge.constraint.type === 'cost') assert.ok(challenge.constraint.cap < 9)
  types.add(challenge.constraint.type)
}
assert.equal(types.size, 3)
const expensive = vehicles.filter(v => v.cost > 3).slice(0, 3)
for (const rule of [{ type: 'category', value: expensive[0].tags[0] }, { type: 'rarity', value: expensive[0].rarity }, { type: 'cost', cap: 7 }]) {
  assert.match(constraintCheck(expensive.map(v => v.id), rule), /^Coût /)
}
const save = newSave()
const original = [...save.lineup]
prepareDaily(save)
assert.deepEqual(save.lineup, original)
assert.equal(startDaily(save), undefined)
assert.deepEqual(save.duel.conditions, dailyChallenge().weather)
assert.equal(save.duel.rounds.length, 0)
const before = save.tickets.neon
claimDailyBooster(save)
claimDailyBooster(save)
assert.equal(save.tickets.neon, before + 1)
assert.equal(readSave(JSON.stringify(save)).daily.booster, true)
console.log('365 dates : déterminisme, trois contraintes, plafonds, garage initial ; écurie indépendante, météo et booster : OK')
