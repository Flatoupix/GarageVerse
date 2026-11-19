// Vérification hors réseau : node src/game/timing.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)

const { classifyTiming, playTimingRound, shiftsPerSector, soloTimingWindow, summarizeShifts, timingBounds, timingModifiers, timingWindow,
  TIMING_MIN_GREEN_START, TIMING_MIN_RISE_MS, TIMING_RETURN_MS } = require('./timing.ts')
const { aiChoice, evaluate, playVersusRound, seededRng, STAT_CAP } = require('./rules.ts')
const { rivals } = require('./data.ts')
const { newSave, readSave, startDuel, startNight } = require('./save.ts')

const window = timingWindow('ligne', 'course', 0, 5, 1, 0, 0)
const bounds = timingBounds(window)
const epsilon = 1e-8
const transitions = [
  ['red', 'orange', 'orange'], ['orange', 'green', 'green'], ['green', 'perfect', 'perfect'],
  ['perfect', 'perfect', 'green'], ['green', 'green', 'orange'], ['orange', 'orange', 'red'],
]
bounds.forEach((bound, index) => {
  assert.deepEqual([-epsilon, 0, epsilon].map(delta => classifyTiming(bound + delta, window).zone), transitions[index])
})
for (const position of [-1, 0, 1, 2]) assert.deepEqual(classifyTiming(position, window), { zone: 'red', modifier: -2 })
assert.deepEqual(classifyTiming(window.center, window), { zone: 'perfect', modifier: 1 })
assert.equal(classifyTiming(window.center, window, { red: -4, orange: -3, green: 2, perfect: 5 }).modifier, 5)
assert.equal(classifyTiming(bounds[0], window).modifier, -1)
assert.equal(classifyTiming(bounds[1], window).modifier, 0)
assert.deepEqual(timingWindow('ligne', 'course', 0, 5, 1, 0, 0), window)
assert.notEqual(timingWindow('ligne', 'autre', 0, 5, 1, 0, 0).center, window.center)
assert.notEqual(timingWindow('ligne', 'course', 1, 5, 1, 0, 0).center, window.center)
const profiles = ['depart', 'virage', 'ligne', 'endurance']
assert.equal(new Set(profiles.map(sector => timingWindow(sector, 'course', 0, 0, 0, 0, 0).duration)).size, profiles.length)
for (const sector of profiles) {
  for (let index = 0; index < 30; index++) {
    const base = timingWindow(sector, 'course', index, 0, 0, 0, 0)
    const max = timingWindow(sector, 'course', index, STAT_CAP, 3, 3, 0)
    const boss = timingWindow(sector, 'course', index, STAT_CAP, 3, 3, 1)
    assert.equal(max.green, base.green * 1.35)
    assert.equal(max.orange, base.orange * 1.35)
    assert.deepEqual(timingWindow(sector, 'course', index, 100, 100, 100, 0), max)
    for (const prep of [[STAT_CAP, 0, 0], [0, 3, 0], [0, 0, 3]]) {
      assert.ok(timingWindow(sector, 'course', index, ...prep, 0).green > base.green)
    }
    assert.ok(boss.green < max.green && boss.duration < max.duration)
    assert.ok(timingBounds(max).every(bound => bound > 0 && bound < 1))
  }
}

assert.deepEqual(shiftsPerSector, { depart: 2, ligne: 3, endurance: 2, virage: 2 })
assert.ok(TIMING_RETURN_MS > 0 && TIMING_RETURN_MS < 300)
const windowFor = (sector, shift, difficulty = 0) => timingWindow(sector, 'course', 0, 5, 1, 0, difficulty, shift)
for (const sector of profiles) {
  const windows = Array.from({ length: shiftsPerSector[sector] }, (_, shift) => windowFor(sector, shift))
  assert.equal(new Set(windows.map(({ center }) => center)).size, windows.length)
  windows.forEach((window, shift) => {
    assert.deepEqual(windowFor(sector, shift), window)
    assert.ok(window.duration >= 900 && window.duration <= 1200)
    assert.ok(windowFor(sector, shift, 1).duration >= TIMING_MIN_RISE_MS)
    assert.ok(timingBounds(window)[1] >= TIMING_MIN_GREEN_START)
  })
}
assert.ok(windowFor('ligne', 2).green < windowFor('ligne', 1).green)
assert.ok(windowFor('ligne', 2).green < windowFor('ligne', 0).green)
for (const shift of [0, 1]) {
  assert.ok(windowFor('endurance', shift).green > windowFor('depart', shift).green)
  assert.ok(windowFor('endurance', shift).green > windowFor('ligne', shift).green)
}
const raceRng = seededRng('course')
const referenceRng = seededRng('course')
assert.equal(raceRng(), referenceRng())
const nextWindow = windowFor('ligne', 1)
assert.equal(classifyTiming(1, windowFor('ligne', 0)).zone, 'red')
assert.deepEqual(windowFor('ligne', 1), nextWindow)
assert.equal(raceRng(), referenceRng())

const result = zone => ({ zone, modifier: timingModifiers[zone] })
const aggregate = (...zones) => summarizeShifts(zones.map(result)).modifier
assert.equal(aggregate('red', 'orange'), -1)
assert.equal(aggregate('green', 'orange'), 0)
assert.equal(aggregate('perfect', 'green'), 0)
assert.equal(aggregate('perfect', 'perfect', 'green'), 1)
assert.equal(aggregate('red', 'red', 'orange'), -2)
const zones = Object.keys(timingModifiers)
for (const first of zones) for (const second of zones) for (const third of zones) {
  const modifier = aggregate(first, second, third)
  assert.ok(Number.isInteger(modifier) && modifier >= -2 && modifier <= 1)
  assert.ok(!Object.is(modifier, -0))
}

let save = newSave()
delete save.preferences.timingMode
assert.equal(readSave(JSON.stringify(save)).preferences.timingMode, false)
save.preferences.timingMode = true
assert.equal(startNight(save, 'timing'), undefined)
const choice = { car: 0, nitro: true, stance: 'normal' }
save.duel.timingChoice = choice
const before = soloTimingWindow(save.duel, save.duel.player.lineup[0])
save = readSave(JSON.stringify(save))
assert.equal(save.duel.timingChoice, undefined)
assert.deepEqual(soloTimingWindow(save.duel, save.duel.player.lineup[0]), before)
assert.equal(save.preferences.timingMode, true)

const outcome = classifyTiming(before.center, before)
const rng = seededRng('rival')
const opponent = aiChoice(save.duel, 'rival', rng)
const reference = evaluate(save.duel, 'player', choice.car, choice.nitro, opponent.car, choice.stance)
const normal = readSave(JSON.stringify(save)).duel
// Le moteur partagé donne le même résultat rival avec la même suite de tirages.
let draws = 0
const expected = playVersusRound(normal, choice, opponent, () => draws++ < 2 ? 0.5 : rng())
const round = playTimingRound(save.duel, choice, outcome, seededRng('rival'))
assert.equal(round.player.score, reference.score + 1)
assert.deepEqual(round.player.lines.slice(0, -1), reference.lines)
assert.equal(round.player.luck, undefined)
assert.deepEqual(round.rival, expected.rival)
assert.equal(save.duel.player.nitro, normal.player.nitro)
assert.deepEqual(save.duel.rival.used, normal.rival.used)
delete save.duel.timingChoice
save.duel.timingReview = true
save = readSave(JSON.stringify(save))
assert.equal(save.duel.rounds.length, 1)
assert.deepEqual(save.duel.rounds[0].timing, outcome)
assert.equal(save.duel.timingReview, true)
assert.equal(save.duel.timingChoice, undefined)

assert.equal(save.duel.rounds[0].shifts, undefined)
const shifts = [result('perfect'), result('red')]
const sequenceRound = playTimingRound(save.duel, choice, shifts, seededRng('rival'))
assert.equal(sequenceRound.player.lines.at(-1).value, 0)
assert.deepEqual(readSave(JSON.stringify(save)).duel.rounds.at(-1).shifts, shifts)

const legacy = newSave()
assert.equal(startDuel(legacy, `${rivals[0].id}:1`, seededRng('reprise')), undefined)
delete legacy.duel.pilot
legacy.duel.timingChoice = choice
const resumed = readSave(JSON.stringify(legacy)).duel
assert.equal(resumed.timingChoice, undefined)
assert.deepEqual(resumed.pilot, { mode: 'manuel', turn: false })
assert.equal(resumed.rounds.length, 0)

const pending = { index: 0, choice, rivalChoice: opponent, turn: false }
resumed.manualSector = pending
legacy.duel = resumed
assert.deepEqual(readSave(JSON.stringify(legacy)).duel.manualSector, pending)

resumed.manualSector = { ...pending, index: 1 }
assert.equal(readSave(JSON.stringify(legacy)).duel.manualSector, undefined)

resumed.manualSector = { ...pending, rivalChoice: { ...opponent, car: -1 } }
assert.equal(readSave(JSON.stringify(legacy)).duel.manualSector, undefined)
