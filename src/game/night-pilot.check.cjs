// Vérification hors réseau : node src/game/night-pilot.check.cjs
// T-035 : choix Automatique / Manuel dans la Nuit sans fin, bascule en cours de manche, intermanche et migration.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)

const { newSave, readSave, setNightPilot, settleNight, startNight, finishNight, startDuel } = require('./save.ts')
const { pilotSummary, playPilotRound, sectorPilot, switchToAutomatic } = require('./pilot.ts')
const { playRound, seededRng } = require('./rules.ts')
const { playTimingRound } = require('./timing.ts')
const { rivals } = require('./data.ts')

const reload = save => readSave(JSON.stringify(save))
const choice = { car: 0, nitro: false, stance: 'normal' }
const manualRound = (save, rng) => playPilotRound(save.duel, choice, rng,
  () => playTimingRound(save.duel, choice, { zone: 'perfect', modifier: 1 }, rng))

// 1. Mode timing activé : la nuit est automatique par défaut, sans aucun geste.
let save = newSave()
save.preferences.timingMode = true
save.preferences.turnMode = true
assert.equal(startNight(save, 'auto'), undefined)
assert.equal(save.night.pilotMode, 'auto')
assert.deepEqual(save.duel.pilot, { mode: 'auto' })
while (!save.duel.winner) {
  const index = save.duel.rounds.length
  playPilotRound(save.duel, { car: index % 3, nitro: false, stance: 'normal' }, seededRng(`a${index}`),
    () => assert.fail('La nuit automatique ne demande aucun geste'))
}
assert.equal(pilotSummary(save.duel.rounds), 'auto')

// 2. Mode timing désactivé : un choix « manuel » mémorisé n'impose rien, la nuit reste jouable en automatique.
save = newSave()
setNightPilot(save, 'manuel')
assert.equal(save.preferences.nightPilotMode, 'manuel')
assert.equal(startNight(save, 'off'), undefined)
assert.equal(save.night.pilotMode, 'manuel')
assert.deepEqual(save.duel.pilot, { mode: 'auto' })
assert.equal(sectorPilot(save.duel.pilot, 0), 'auto')

// 3. Manuel choisi avant de lancer la nuit, puis bascule vers l'automatique en pleine manche.
save = newSave()
save.preferences.timingMode = true
save.preferences.turnMode = true
setNightPilot(save, 'manuel')
assert.equal(startNight(save, 'bascule'), undefined)
assert.deepEqual(save.duel.pilot, { mode: 'manuel', turn: true })
const first = manualRound(save, seededRng('geste'))
assert.equal(first.timing.modifier, 1)
assert.equal(first.player.luck, undefined)
save = reload(save)
assert.deepEqual(save.duel.pilot, { mode: 'manuel', turn: true })
assert.equal(sectorPilot(save.duel.pilot, 1), 'manuel')
const before = { seed: save.night.seed, round: save.night.round, wins: save.night.wins, gains: save.night.gains,
  lineup: [...save.night.lineup], record: save.nightRecord, credits: save.credits, nitro: save.duel.player.nitro,
  used: JSON.stringify(save.duel.player.lineup), rounds: JSON.stringify(save.duel.rounds) }
save.duel.pilot = switchToAutomatic(save.duel.pilot, save.duel.rounds.length)
// La bascule ne touche ni la série ni les secteurs déjà joués.
assert.deepEqual({ seed: save.night.seed, round: save.night.round, wins: save.night.wins, gains: save.night.gains,
  lineup: save.night.lineup, record: save.nightRecord, credits: save.credits, nitro: save.duel.player.nitro,
  used: JSON.stringify(save.duel.player.lineup), rounds: JSON.stringify(save.duel.rounds) }, before)
assert.equal(save.night.pilotMode, 'manuel')
save = reload(save)
assert.equal(save.duel.pilot.automaticFrom, 1)
assert.equal(sectorPilot(save.duel.pilot, 0), 'manuel')
assert.equal(sectorPilot(save.duel.pilot, 1), 'auto')
// Les secteurs restants se jouent comme un tirage automatique, sans rejouer le premier.
const expected = reload(save).duel
assert.deepEqual(playPilotRound(save.duel, choice, seededRng('suite')), playRound(expected, choice, seededRng('suite')))
assert.equal(save.duel.rounds.length, 2)
assert.deepEqual(JSON.parse(JSON.stringify(save.duel.rounds[0])), JSON.parse(before.rounds)[0])
assert.equal(pilotSummary(save.duel.rounds), 'mixed')

// 4. Intermanche : la manche mixte est bilan « Manuel puis automatique », la série garde « Manuel » pour la suite et reste modifiable.
save.duel.winner = 'player'
settleNight(save)
assert.equal(save.night.resting, true)
assert.equal(save.night.lastPilot, 'mixed')
assert.equal(save.night.pilotMode, 'manuel')
assert.equal(save.night.wins, 1)
const gains = save.night.gains
setNightPilot(save, 'auto')
save = reload(save)
assert.equal(save.night.pilotMode, 'auto')
assert.equal(save.night.lastPilot, 'mixed')
assert.equal(save.night.gains, gains)
assert.equal(save.duel, null)
// La manche suivante démarre via le rechargement (night non en pause) ou via le bouton : même mode figé.
save.night.resting = false
save = reload(save)
assert.equal(save.night.round, 2)
assert.deepEqual(save.duel.pilot, { mode: 'auto' })
// Changer la préférence pendant une manche engagée ne la bascule pas.
setNightPilot(save, 'manuel')
assert.equal(save.night.pilotMode, 'auto')
assert.deepEqual(save.duel.pilot, { mode: 'auto' })
save.duel.winner = 'player'
settleNight(save)
setNightPilot(save, 'manuel')
assert.equal(save.night.pilotMode, 'manuel')
save.night.resting = false
save = reload(save)
assert.equal(save.night.round, 3)
assert.deepEqual(save.duel.pilot, { mode: 'manuel', turn: true })
// Désactiver le timing entre deux manches : la manche suivante reste automatique et jouable.
save.duel.winner = 'player'
settleNight(save)
save.preferences.timingMode = false
save.night.resting = false
save = reload(save)
assert.deepEqual(save.duel.pilot, { mode: 'auto' })

// 5. Défaite : le bilan de la nuit donne le mode de la dernière manche, les gains sont versés une seule fois.
save = newSave()
save.preferences.timingMode = true
setNightPilot(save, 'manuel')
startNight(save, 'defaite')
manualRound(save, seededRng('x'))
save.duel.winner = 'rival'
const credits = save.credits
assert.deepEqual(settleNight(save), { wins: 0, credits: 0, newRecord: false, pilot: 'manuel' })
assert.equal(save.credits, credits)
assert.equal(save.night, null)
startNight(save, 'abandon')
assert.equal(finishNight(save).pilot, undefined) // abandon avant le premier secteur

// 6. Migration : une nuit et sa manche sans pilotage enregistré restent chargées, en automatique explicite.
const old = newSave()
old.preferences.timingMode = true
startNight(old, 'ancienne')
playRound(old.duel, choice, seededRng('ancien'))
delete old.night.pilotMode
delete old.duel.pilot
delete old.preferences.nightPilotMode
const migrated = reload(old)
assert.equal(migrated.night.pilotMode, 'auto')
assert.deepEqual(migrated.duel.pilot, { mode: 'auto' })
assert.equal(migrated.duel.rounds.length, 1)
assert.deepEqual(JSON.parse(JSON.stringify(migrated.duel.rounds)), JSON.parse(JSON.stringify(old.duel.rounds)))
// Une ancienne manche qui attendait déjà un passage de vitesse reprend en manuel.
old.duel.timingChoice = choice
assert.equal(reload(old).duel.pilot.mode, 'manuel')
assert.equal(reload(old).duel.timingChoice, undefined)
// Une nuit en pause sans choix enregistré repart aussi en automatique.
const resting = newSave()
startNight(resting, 'pause')
resting.duel.winner = 'player'
settleNight(resting)
delete resting.night.pilotMode
assert.equal(reload(resting).night.pilotMode, 'auto')
assert.equal(reload(resting).duel, null)
// Une valeur inconnue retombe sur l'automatique.
resting.night.pilotMode = 'turbo'
resting.night.lastPilot = 'turbo'
assert.equal(reload(resting).night.pilotMode, 'auto')
assert.equal(reload(resting).night.lastPilot, undefined)

// 7. Les courses de rivaux gardent leur propre préférence, indépendante de celle de la nuit.
const rival = newSave()
rival.preferences.timingMode = true
setNightPilot(rival, 'manuel')
assert.equal(startDuel(rival, `${rivals[0].id}:1`, seededRng('r')), undefined)
assert.deepEqual(rival.duel.pilot, { mode: 'auto' })

console.log('Nuit sans fin : pilotage auto par défaut, manuel, bascule, intermanche, bilan et migration : OK')
