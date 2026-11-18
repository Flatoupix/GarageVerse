// Vérification hors réseau : node src/game/turn.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)

const { classifyTurn, expectedTurn, resolveTurn } = require('./turn.ts')
const { rivals } = require('./data.ts')
const { playTimingRound, playTurnRound } = require('./timing.ts')
const { seededRng } = require('./rules.ts')
const { newSave, readSave, startNight } = require('./save.ts')

const window = { start: 1250, end: 1750 }
for (const [side, other] of [['gauche', 'droite'], ['droite', 'gauche']]) {
  assert.deepEqual([1249, 1250, 1251, 1749, 1750, 1751].map(time => classifyTurn(side, side, time, window)),
    ['tot', 'bien', 'bien', 'bien', 'bien', 'tard'])
  assert.equal(classifyTurn(side, other, 1249, window), 'mauvais')
  assert.equal(classifyTurn(side, other, 1750, window), 'mauvais')
  assert.equal(classifyTurn(side, null, 1750, window), null)
  assert.equal(classifyTurn(side, null, 1751, window), 'tard')
  const first = resolveTurn(null, side, side, 1250, window)
  assert.deepEqual(first, { outcome: 'bien', modifier: 1 })
  assert.equal(resolveTurn(first, side, other, 1751, window), first)
  assert.equal(resolveTurn(null, side, side, 1249, window).modifier, 0)
  assert.equal(resolveTurn(null, side, other, 1250, window).modifier, -1)
  assert.equal(resolveTurn(null, side, null, 1751, window).modifier, -1)
  assert.equal(resolveTurn(null, side, side, 1250, window, { bien: 3, tot: 0, mauvais: -2, tard: -2 }).modifier, 3)
}

const directions = new Set()
for (const { circuit } of rivals) {
  circuit.sectors.forEach((sector, index) => {
    if (sector !== 'virage') return
    const direction = expectedTurn(circuit.name, index)
    assert.equal(direction, expectedTurn(circuit.name, index))
    directions.add(direction)
  })
}
assert.deepEqual(directions, new Set(['gauche', 'droite']))

const save = newSave('t027')
assert.equal(save.preferences.turnMode, false)
delete save.preferences.turnMode
assert.equal(readSave(JSON.stringify(save)).preferences.turnMode, false)
save.preferences.turnMode = true
assert.equal(readSave(JSON.stringify(save)).preferences.turnMode, true)

startNight(save, 't027')
const duel = save.duel
const index = duel.sectors.indexOf('virage')
assert.ok(index >= 0)
const choice = { car: 0, nitro: false, stance: 'normal' }
for (let i = 0; i < index; i++) playTimingRound(duel, choice, { zone: 'green', modifier: 0 }, seededRng(String(i)))
const comparison = readSave(JSON.stringify(save)).duel
const reference = playTimingRound(comparison, choice, { zone: 'green', modifier: 0 }, seededRng('secteur'))
const round = playTurnRound(duel, choice, { outcome: 'bien', modifier: 1 }, seededRng('secteur'))
assert.deepEqual(round.rival, reference.rival)
assert.equal(round.player.score, reference.player.score + 1)
assert.equal(round.player.score, round.player.lines.reduce((sum, line) => sum + line.value, 0))
assert.deepEqual(round.player.lines.at(-1), { label: 'Direction', value: 1 })
assert.equal(duel.rounds.length, index + 1)
assert.deepEqual(readSave(JSON.stringify(save)).duel.rounds.at(-1).direction, round.direction)
console.log('Virages : vérifications OK')
