// Vérification hors réseau : node src/game/pilot.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)

const { rivals, rivalById } = require('./data.ts')
const { playPilotRound, sectorPilot, switchToAutomatic } = require('./pilot.ts')
const { createDuel, playRound, seededRng } = require('./rules.ts')
const { newSave, prepOf, readSave, startDuel } = require('./save.ts')
const { playTimingRound } = require('./timing.ts')

const initial = newSave()
assert.equal(readSave(JSON.stringify(initial)).preferences.pilotMode, 'auto')
// Les bulles du premier geste survivent au rechargement, y compris en plein tutoriel.
assert.deepEqual(readSave(JSON.stringify({ ...initial, tutorial: { step: 7, status: 'active',
  seen: ['stance', 'manuel', 'virages', 'inconnue', 'manuel'] } })).tutorial,
{ step: 7, status: 'active', seen: ['stance', 'manuel', 'virages'] })
for (const seen of [undefined, null, 'manuel', {}]) {
  assert.deepEqual(readSave(JSON.stringify({ ...initial, tutorial: { step: 7, status: 'active', seen } })).tutorial,
    { step: 7, status: 'active', seen: [] })
}
assert.deepEqual(readSave(JSON.stringify({ ...initial, tutorial: { ...initial.tutorial, seen: ['nitro'] } })).tutorial.seen, ['nitro'])
const lineup = initial.lineup.map(id => ({ id, prep: prepOf(initial, id) }))
const luck = new Set()
for (const id of [...rivalById.keys()].slice(0, 9)) {
  for (let seed = 0; seed < 20; seed++) {
    const rng = seededRng(String(seed))
    const expected = createDuel(id, lineup, rng)
    const automaticRng = seededRng(String(seed))
    const automatic = createDuel(id, lineup, automaticRng)
    automatic.pilot = { mode: 'auto' }
    const draws = [], automaticDraws = []
    while (!expected.winner) {
      const index = expected.rounds.length
      const choice = { car: index % 3, nitro: index === 1, stance: 'normal' }
      const reference = playRound(expected, choice, () => {
        const draw = rng()
        draws.push(draw)
        return draw
      })
      const actual = playPilotRound(automatic, choice, () => {
        const draw = automaticRng()
        automaticDraws.push(draw)
        return draw
      }, () => assert.fail('Le pilotage automatique ne demande aucun geste'))
      assert.deepEqual(actual, reference)
      for (const play of [actual.player, actual.rival]) {
        if (play.luck) luck.add(play.luck)
        if (play.lines.some(line => line.label === 'Forme du jour')) luck.add('forme')
      }
    }
    assert.deepEqual(automaticDraws, draws)
    assert.equal(automatic.winner, expected.winner)
    assert.deepEqual(automatic.player, expected.player)
    assert.deepEqual(automatic.rival, expected.rival)
  }
}
assert.deepEqual(luck, new Set(['forme', 'perfect', 'incident']))

let save = newSave()
const rival = `${rivals[0].id}:1`
save.preferences.timingMode = true
save.preferences.turnMode = true
assert.equal(startDuel(save, rival, seededRng('auto')), undefined)
assert.equal(save.duel.pilot.mode, 'auto')
save.duel = null
save.preferences.pilotMode = 'manuel'
save.preferences.timingMode = false
assert.equal(startDuel(save, rival, seededRng('auto')), undefined)
assert.equal(save.duel.pilot.mode, 'auto')
save.duel = null
save.preferences.timingMode = true
assert.equal(startDuel(save, rival, seededRng('manuel')), undefined)
assert.deepEqual(save.duel.pilot, { mode: 'manuel', turn: true })
const choice = { car: 0, nitro: true, stance: 'normal' }
const rng = seededRng('secteur')
const manual = playPilotRound(save.duel, choice, rng,
  () => playTimingRound(save.duel, choice, { zone: 'perfect', modifier: 1 }, rng))
assert.equal(manual.player.luck, undefined)
assert.equal(manual.timing.modifier, 1)

const reload = () => readSave(JSON.stringify(save))
save = reload()
assert.equal(save.preferences.pilotMode, 'manuel')
assert.equal(sectorPilot(save.duel.pilot, 1), 'manuel')
save.duel.pilot = switchToAutomatic(save.duel.pilot, 1)
save = reload()
assert.equal(sectorPilot(save.duel.pilot, 0), 'manuel')
assert.equal(sectorPilot(save.duel.pilot, 1), 'auto')
assert.equal(sectorPilot(save.duel.pilot, 2), 'auto')
assert.equal(switchToAutomatic(save.duel.pilot, 2), save.duel.pilot)
assert.equal(save.duel.rounds.length, 1)
assert.deepEqual(save.duel.rounds[0], manual)
const expected = reload().duel
const automatic = playPilotRound(save.duel, choice, seededRng('bascule'))
assert.deepEqual(automatic, playRound(expected, choice, seededRng('bascule')))
save = reload()
assert.equal(save.duel.rounds.length, 2)
assert.equal(save.duel.player.points, expected.player.points)
assert.equal(save.duel.rival.points, expected.rival.points)
assert.equal(sectorPilot(save.duel.pilot, 2), 'auto')
