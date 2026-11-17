// Vérification hors réseau : node src/game/versus.check.cjs
// Moteur versus (ticket 002) : rejeu déterministe, cinq secteurs, chance, joueur absent, écuries et mises.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, resolveJsonModule: true },
}).outputText, filename)
const rules = require('./rules.ts')
const { dailyRng } = require('./daily.ts')
const { vehicles } = require('./data.ts')

const plain = id => ({ id, prep: { stage: 0, parts: [] } })
const host = ['clio', 'twingo', 'panda'].map(plain)
const guest = ['deuch', 'r4l', 'fiat500'].map(plain)
const stances = ['normal', 'attaque', 'gestion']
const lcg = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
const movesFor = n => { const pick = lcg(n); return Array.from({ length: 5 }, () => ({
  a: { car: Math.floor(pick() * 3), nitro: pick() < 0.3, stance: stances[Math.floor(pick() * 3)] },
  b: { car: Math.floor(pick() * 3), nitro: pick() < 0.3, stance: stances[Math.floor(pick() * 3)] },
})) }

// Même générateur que le défi du jour : valeurs relevées avec l'ancien dailyRng, avant qu'il devienne un alias de seededRng.
const reference = {
  '2026-11-17': [0.3388564717024565, 0.7706274562515318, 0.6458819191902876],
  'salle:abc': [0.7618670237716287, 0.6733673496637493, 0.25770409777760506],
  '1700000000:3': [0.16205311054363847, 0.26865023258142173, 0.46601019077934325],
  'é€': [0.5771744444500655, 0.044664418790489435, 0.008875164901837707],
}
for (const [key, values] of Object.entries(reference)) {
  const seeded = rules.seededRng(key), daily = dailyRng(key)
  for (const value of values) { assert.equal(seeded(), value, `seededRng(${key})`); assert.equal(daily(), value, `dailyRng(${key})`) }
}

// Rejeu : même graine, mêmes écuries, mêmes coups → course identique, jusqu'au 5e secteur.
const input = { seed: 'salle-test-1', a: host, b: guest, moves: movesFor(1) }
const first = rules.replayVersus(input), second = rules.replayVersus(structuredClone(input))
assert.equal(JSON.stringify(first), JSON.stringify(second))
assert.equal(first.rounds.length, 5)
assert.ok(first.winner)
assert.deepEqual(first.sectors, rules.versusCircuit('salle-test-1').sectors)

// Le serveur résout secteur par secteur : même résultat que le rejeu complet.
{
  const rng = rules.seededRng(input.seed)
  const live = rules.createRace(`versus:${input.seed}`, rules.versusCircuit(input.seed), host, guest, rng)
  for (const move of input.moves) rules.playVersusRound(live, move.a, move.b, rng)
  assert.equal(JSON.stringify(live), JSON.stringify(first))
  assert.throws(() => rules.playVersusRound(live, input.moves[0].a, input.moves[0].b, rng), /Course terminée/)
}

// Une graine différente change la course.
assert.notEqual(JSON.stringify(rules.replayVersus({ ...input, seed: 'salle-test-2' })), JSON.stringify(first))

// Sur un ensemble de graines, on observe des incidents et des secteurs parfaits, et des deux côtés des victoires.
let incidents = 0, perfects = 0
const winners = new Set()
for (let n = 1; n <= 200; n++) {
  const duel = rules.replayVersus({ seed: `graine-${n}`, a: host, b: guest, moves: movesFor(n) })
  winners.add(duel.winner)
  for (const round of duel.rounds) for (const play of [round.player, round.rival]) {
    if (play.luck === 'incident') incidents++
    if (play.luck === 'perfect') perfects++
  }
}
assert.ok(incidents > 0 && perfects > 0, 'incidents et secteurs parfaits')
assert.ok(winners.has('player') && winners.has('rival'), 'chaque camp peut gagner')

// Joueur absent : l'IA joue à sa place sur son propre flux. Remplacer l'absence par ce même coup donne la même course.
{
  const moves = movesFor(3)
  moves[1] = { a: moves[1].a, b: null }
  moves[3] = { a: null, b: null }
  const withAbsence = rules.replayVersus({ seed: 'absence', a: host, b: guest, moves })
  const rng = rules.seededRng('absence')
  const duel = rules.createRace('versus:absence', rules.versusCircuit('absence'), host, guest, rng)
  const explicit = moves.map(move => {
    const a = move.a ?? rules.autoChoice(duel, 'absence', 'player')
    const b = move.b ?? rules.autoChoice(duel, 'absence', 'rival')
    rules.playVersusRound(duel, a, b, rng)
    return { a, b }
  })
  assert.equal(JSON.stringify(duel), JSON.stringify(withAbsence))
  assert.equal(JSON.stringify(rules.replayVersus({ seed: 'absence', a: host, b: guest, moves: explicit })), JSON.stringify(withAbsence))
}

// Écuries versus.
const ok = rules.checkVersusLineup
assert.equal(ok(host, 9), undefined)
assert.match(ok(host, 10), /Plafond inconnu/)
assert.match(ok(host.slice(0, 2), 9), /trois voitures/)
assert.match(ok([plain('clio'), plain('clio'), plain('panda')], 9), /différentes/)
assert.match(ok([plain('clio'), plain('twingo'), plain('nexiste-pas')], 9), /Voiture inconnue/)
const expensive = vehicles.filter(v => v.cost === 7).slice(0, 3).map(v => plain(v.id))
assert.match(ok(expensive, 15), /dépasse le plafond/)
assert.equal(ok(expensive, 22), undefined)
const maxed = { acc: 2, vit: 2, man: 2, end: 2 }
assert.match(ok([{ id: 'clio', prep: { stage: 4, parts: [] } }, plain('twingo'), plain('panda')], 9), /stage invalide/)
assert.match(ok([{ id: 'clio', prep: { stage: 0, parts: [], upgrades: { acc: 3 } } }, plain('twingo'), plain('panda')], 9), /atelier invalide/)
assert.match(ok([{ id: 'clio', prep: { stage: 0, parts: ['pneus-route'] } }, plain('twingo'), plain('panda')], 9), /niveau 2 requis/)
assert.equal(ok([{ id: 'clio', prep: { stage: 0, parts: ['pneus-route'], upgrades: { man: 2 } } }, plain('twingo'), plain('panda')], 9), undefined)
assert.match(ok([{ id: 'clio', prep: { stage: 0, parts: ['pneus-route', 'pneus-route'], upgrades: { man: 2 } } }, plain('twingo'), plain('panda')], 9), /deux fois/)
assert.match(ok([{ id: 'clio', prep: { stage: 0, parts: ['pneus-route', 'pneus-pluie'], upgrades: { man: 2 } } }, plain('twingo'), plain('panda')], 9), /même famille/)
assert.match(ok([{ id: 'clio', prep: { stage: 0, parts: ['pas-une-piece'] } }, plain('twingo'), plain('panda')], 9), /pièce inconnue/)
// Pièce incompatible : une pièce réservée à certaines voitures, montée sur une voiture qui ne l'accepte pas.
{
  const { parts } = require('./data.ts')
  let found
  for (const part of parts.filter(p => p.requires)) for (const v of vehicles) if (rules.compatibility(part, v)) { found = { part, v }; break }
  assert.ok(found, 'une pièce incompatible existe')
  const key = rules.upgradeForFamily(found.part.family)
  const others = ['clio', 'twingo', 'panda', 'deuch'].filter(id => id !== found.v.id).slice(0, 2).map(plain)
  assert.match(ok([{ id: found.v.id, prep: { stage: 0, parts: [found.part.id], upgrades: { [key]: 2 } } }, ...others], 22) ?? '', /Réservé|Incompatible/)
}
// Potentiel : trop de pièces chères sur une voiture coûteuse.
{
  const car = vehicles.find(v => v.cost >= 9 && !v.anim) ?? vehicles.find(v => v.cost >= 9)
  const { parts } = require('./data.ts')
  const fitting = [], used = new Set()
  for (const part of [...parts].sort((x, y) => y.cost - x.cost)) {
    if (used.has(part.family) || rules.compatibility(part, car)) continue
    fitting.push(part.id); used.add(part.family)
  }
  const problem = ok([{ id: car.id, prep: { stage: 0, parts: fitting, upgrades: maxed } }, plain('clio'), plain('twingo')], 22)
  assert.match(problem ?? '', /potentiel/)
}
// 3e emplacement : refusé hors voiture au maximum, accepté au Stage 3 avec les 4 ateliers au niveau 2.
assert.match(ok([{ id: 'clio', prep: { stage: 2, parts: [], upgrades: maxed, extraSlot: 'vit' } }, plain('twingo'), plain('panda')], 9), /3ᵉ emplacement/)
assert.match(ok([{ id: 'clio', prep: { stage: 3, parts: [], upgrades: maxed, extraSlot: 'man' } }, plain('twingo'), plain('panda')], 9), /impossible/)
assert.equal(ok([{ id: 'clio', prep: { stage: 3, parts: ['admission', 'k9k'], upgrades: maxed, extraSlot: 'vit' } }, plain('twingo'), plain('panda')], 9), undefined)
assert.match(ok([{ id: 'clio', prep: { stage: 3, parts: ['admission', 'k9k'], upgrades: maxed } }, plain('twingo'), plain('panda')], 9), /même famille/)

// Mises.
assert.equal(rules.stakeCheck(0, 0), undefined)
assert.equal(rules.stakeCheck(50, 200), undefined)
assert.match(rules.stakeCheck(100, 200), /au plus 50/)
assert.equal(rules.stakeCheck(500, 2000), undefined)
assert.match(rules.stakeCheck(75, 10000), /Mise inconnue/)

console.log('Moteur versus : rejeu, secteurs, chance, absences, écuries et mises : OK')
