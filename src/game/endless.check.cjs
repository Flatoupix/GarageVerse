// Vérification hors réseau : node src/game/endless.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { newSave, readSave, startNight, settleNight, createNightRound, finishNight, nightLineupCheck, startDaily, startDuel, settleDuel, sellCheck } = require('./save.ts')
const { nightRival } = require('./endless.ts')
const { rivals } = require('./data.ts')
const { lineupCost, playRound, aiChoice } = require('./rules.ts')
for (const seed of ['nuit', 'autre']) {
  let previous = 0
  for (let round = 1; round <= 30; round++) {
    const rival = nightRival(seed, round)
    assert.deepEqual(rival, nightRival(seed, round))
    const cost = lineupCost(rival.lineup.map(c => c.id))
    assert.ok(cost >= previous)
    previous = cost
    assert.equal(rival.lineup.length, 3)
    assert.equal(new Set(rival.lineup.map(c => c.id)).size, 3)
    assert.equal(rival.circuit.sectors.length, 5)
    if (round > 1) assert.notDeepEqual(rival.circuit.conditions, nightRival(seed, round - 1).circuit.conditions)
  }
  // Au retour sur un même circuit, la météo change aussi.
  assert.notDeepEqual(nightRival(seed, 1).circuit.conditions, nightRival(seed, 1 + rivals.length).circuit.conditions)
  assert.equal(nightRival(seed, 30).lineup[0].stage, 3)
  assert.ok(nightRival(seed, 30).lineup.some(c => c.parts.length))
  assert.ok(Object.values(nightRival(seed, 30).lineup[0].upgrades).every(level => level === 2))
  assert.notDeepEqual(nightRival(seed, 29).lineup.map(car => car.id), nightRival(seed, 30).lineup.map(car => car.id))
}
// L’écurie préparée reste protégée même avant de commencer la nuit.
const prepared = newSave()
prepared.lineup = []
prepared.dailyLineup = []
assert.ok(sellCheck(prepared, prepared.nightLineup[0]))
let save = newSave()
assert.equal(nightLineupCheck(save), undefined)
const preview = nightRival('briefing', 1)
assert.equal(startNight(save, 'briefing'), undefined)
assert.equal(save.duel.rivalId, preview.id)
assert.deepEqual(save.duel.rival.lineup.map(car => car.id), preview.lineup.map(car => car.id))
assert.equal(save.duel.sectors.length, 5)
assert.equal(save.duel.rounds.length, 0)
const firstRace = save.duel
createNightRound(save)
assert.equal(save.duel, firstRace)
assert.ok(startDaily(save))
assert.ok(startDuel(save, 'lola', Math.random))
assert.ok(sellCheck(save, save.night.lineup[0]))
playRound(save.duel, aiChoice(save.duel, 'player', () => 0.5), () => 0.5)
const snapshot = JSON.stringify(save)
save = readSave(snapshot)
assert.equal(save.duel.rounds.length, 1)
assert.deepEqual(JSON.parse(JSON.stringify(save.duel)), JSON.parse(snapshot).duel)
// Forcer le verdict isole les transitions économiques du hasard des secteurs.
save.duel.winner = 'player'
const credits = save.credits
settleNight(save)
assert.equal(save.nightRecord, 1)
assert.equal(save.night.gains, 80)
assert.equal(save.credits, credits)
settleNight(save)
assert.equal(save.night.gains, 80)
save = readSave(JSON.stringify(save))
assert.equal(save.night.resting, true)
assert.equal(save.duel, null)
createNightRound(save)
assert.equal(save.night.round, 2)
assert.equal(save.duel.rounds.length, 0)
save.duel.winner = 'rival'
assert.deepEqual(settleNight(save), { wins: 1, credits: 80, newRecord: true })
assert.equal(save.credits, credits + 80)
finishNight(save)
assert.equal(save.credits, credits + 80)
assert.equal(save.night, null)
startNight(save)
assert.equal(finishNight(save).credits, 0) // abandon en première manche
startNight(save)
save.duel.winner = 'player'
settleNight(save)
assert.equal(finishNight(save).credits, 80) // retour volontaire
assert.equal(save.credits, credits + 160)
const old = newSave()
delete old.nightRecord; delete old.night; delete old.nightLineup
assert.equal(readSave(JSON.stringify(old)).nightRecord, 0)
assert.equal(readSave(null, JSON.stringify({ version: 1 })).night, null)
// Une course classique et ses récompenses restent disponibles après la nuit.
assert.equal(startDuel(save, rivals[0].id, () => 0.5), undefined)
save.duel.winner = 'player'
assert.ok(settleDuel(save).credits > 0)
assert.equal(save.duel, null)
assert.equal(startDuel(save, rivals[0].id, () => 0.5), undefined)
save.duel.winner = 'rival'
assert.ok(settleDuel(save))
console.log('Nuit : génération, progression, reprise, record, encaissement unique, abandon, migration et rival : OK')

const invalid = newSave()
invalid.nightLineup = invalid.nightLineup.slice(0, 2)
assert.ok(nightLineupCheck(invalid))
assert.ok(startNight(invalid))
const simulated = newSave()
startNight(simulated)
for (let sector = 0; sector < 5; sector++) playRound(simulated.duel, aiChoice(simulated.duel, 'player', () => 0.5), () => 0.5)
assert.equal(simulated.duel.rounds.length, 5)
assert.ok(simulated.duel.winner)
settleNight(simulated)
assert.ok(!simulated.night || simulated.night.resting)
const tie = newSave()
startNight(tie)
tie.duel.winner = 'tie'
assert.equal(settleNight(tie).credits, 0)
assert.equal(tie.night, null)
