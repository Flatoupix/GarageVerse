// Vérification hors réseau : node src/game/turn.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)

const { advanceTurns, judgeTurn, summarizeTurns, turnModifiers, turnSequence } = require('./turn.ts')
const { playTimingRound, playTurnRound } = require('./timing.ts')
const { seededRng } = require('./rules.ts')
const { newSave, readSave, startNight } = require('./save.ts')

const sequence = turnSequence('demo', 0, 'demo')
assert.deepEqual(sequence, turnSequence('demo', 0, 'demo'))
assert.deepEqual(sequence.notes.map(note => note.direction), ['gauche', 'droite', 'gauche'])
const { settings } = sequence
for (const [circuit, index, rival] of [['autre', 0, 'demo'], ['demo', 1, 'demo'], ['demo', 0, 'autre']]) {
  const changed = turnSequence(circuit, index, rival)
  assert.notDeepEqual(changed.notes, sequence.notes)
  assert.notDeepEqual(changed.notes.map(note => note.at), sequence.notes.map(note => note.at))
}
const harder = turnSequence('demo', 0, 'autre').settings
assert.notEqual(harder.lead, settings.lead)
assert.notEqual(harder.good, settings.good)

const extended = turnSequence('demo', 0, 'demo', { count: 8, spacing: 10, acceptance: 500 })
assert.equal(extended.notes.length, 8)
assert.ok(extended.notes.every((note, index, notes) => index === 0
  || note.at - notes[index - 1].at > 2 * extended.settings.acceptance))
assert.ok(sequence.notes[0].at <= settings.lead)

const { perfect, good, acceptance } = settings
for (const [side, other] of [['gauche', 'droite'], ['droite', 'gauche']]) {
  const note = { direction: side, at: 2500 }
  const judge = (offset, input = side) => judgeTurn(note, input, note.at + offset, settings)
  assert.deepEqual(
    [-acceptance - 1, -acceptance, -good - 1, -good, -perfect - 1, -perfect, 0,
      perfect, perfect + 1, good, good + 1, acceptance, acceptance + 1].map(offset => judge(offset)?.outcome),
    [undefined, 'tot', 'tot', 'bien', 'bien', 'parfait', 'parfait',
      'parfait', 'bien', 'bien', 'tard', 'tard', 'rate'],
  )
  assert.equal(judge(-acceptance, other).outcome, 'mauvais')
  assert.equal(judge(acceptance, other).outcome, 'mauvais')
  assert.equal(judge(acceptance, null), null)
  assert.equal(judge(acceptance + 1, null).outcome, 'rate')
  const custom = { ...settings, modifiers: { ...turnModifiers, parfait: 5 }, max: 4 }
  const tuned = judgeTurn(note, side, note.at, custom)
  assert.equal(tuned.modifier, 5)
  assert.equal(summarizeTurns([tuned], custom).modifier, 4)
}
const firstNote = sequence.notes[0]
const first = advanceTurns(sequence, [], firstNote.direction, firstNote.at)
assert.deepEqual(summarizeTurns(first, settings), { parfait: 1, bien: 0, rate: 0, modifier: 2 })
assert.equal(advanceTurns(sequence, first, sequence.notes[1].direction, firstNote.at + 1), first)
const second = advanceTurns(sequence, first, sequence.notes[1].direction, sequence.notes[1].at)
assert.equal(second.length, 2)
assert.equal(first.length, 1)
const skipped = advanceTurns(sequence, [], sequence.notes[1].direction, sequence.notes[1].at)
assert.deepEqual(skipped.map(judgment => judgment.outcome), ['rate', 'parfait'])

const allPerfect = extended.notes.map(note => judgeTurn(note, note.direction, note.at, extended.settings))
const allMissed = extended.notes.map(note => judgeTurn(note, null, note.at + extended.settings.acceptance + 1, extended.settings))
assert.deepEqual(summarizeTurns(allPerfect, extended.settings), { parfait: 8, bien: 0, rate: 0, modifier: 2 })
assert.deepEqual(summarizeTurns(allMissed, extended.settings), { parfait: 0, bien: 0, rate: 8, modifier: -2 })

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
assert.equal(comparison.rounds.length, index)
assert.equal(comparison.timingChoice, undefined)
const reference = playTimingRound(comparison, choice, { zone: 'green', modifier: 0 }, seededRng('secteur'))
const judgments = sequence.notes.map((note, i) => judgeTurn(note, i === 2 ? null : note.direction,
  note.at + [0, good, acceptance + 1][i], settings))
const direction = summarizeTurns(judgments, settings)
assert.deepEqual(direction, { parfait: 1, bien: 1, rate: 1, modifier: 2 })
const round = playTurnRound(duel, choice, direction, seededRng('secteur'))
assert.deepEqual(round.rival, reference.rival)
assert.equal(round.player.score, reference.player.score + direction.modifier)
assert.equal(round.player.score, round.player.lines.reduce((sum, line) => sum + line.value, 0))
assert.deepEqual(round.player.lines.at(-1), { label: 'Direction', value: direction.modifier })
assert.equal(duel.rounds.length, index + 1)
assert.deepEqual(readSave(JSON.stringify(save)).duel.rounds.at(-1).direction, round.direction)
round.direction = { outcome: 'bien', modifier: 1 }
assert.deepEqual(readSave(JSON.stringify(save)).duel.rounds.at(-1).direction, round.direction)
console.log('Virages : vérifications OK')
