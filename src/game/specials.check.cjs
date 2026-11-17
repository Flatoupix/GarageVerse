// Vérification hors réseau : node src/game/specials.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { specials, rivals, vehicleById, partById } = require('./data.ts')
const { compatibility, potential, prepUsed, statsOf, createDuel, lineupCost } = require('./rules.ts')
const { newSave, readSave, unlockedSpecials, specialsOpen, startDuel, settleDuel } = require('./save.ts')
const save = newSave()
assert.equal(specials.length, 4)
assert.deepEqual(unlockedSpecials(save), [])
assert.equal(startDuel(save, specials[0].tiers[0].id, () => .5), 'Palier verrouillé')
const neon = rivals.filter(r => r.league === 'neon')
for (const r of neon.slice(1)) save.record[r.id] = { wins: 1, losses: 0, perfect: false }
assert.equal(specialsOpen(save), false)
save.record[neon[0].id] = { wins: 1, losses: 0, perfect: false }
assert.equal(specialsOpen(readSave(JSON.stringify(save))), true)
assert.equal(unlockedSpecials(save).length, 4)
assert.deepEqual(readSave(JSON.stringify(newSave())).record, {})
const ids = new Set(rivals.map(r => r.id))
for (const special of specials) {
  assert.equal(special.tiers.length, 5)
  let strength = 0
  for (const [i, r] of special.tiers.entries()) {
    assert.ok(!ids.has(r.id)); ids.add(r.id)
    assert.equal(r.cap, [12,15,18,21,24][i])
    assert.equal(r.reward, [50,100,160,250,400][i])
    assert.equal(r.replay, r.reward / 5)
    assert.equal(r.lineup.length, 3)
    assert.equal(new Set(r.lineup.map(e => e.id)).size, 3)
    assert.ok(lineupCost(r.lineup.map(e => e.id)) <= r.cap)
    assert.equal(r.circuit.sectors.length, 5)
    assert.ok([3,4].includes(r.circuit.sectors.filter(s => s === special.sector).length))
    let power = 0
    for (const e of r.lineup) {
      const v = vehicleById.get(e.id)
      assert.ok(v)
      assert.ok(e.stage >= 0 && e.stage <= 3)
      assert.ok(prepUsed(e) <= potential(v, e.stage))
      for (const id of e.parts) assert.equal(compatibility(partById.get(id), v), undefined)
      power += Object.values(statsOf(v,e)).reduce((a,b) => a+b,0)
    }
    assert.ok(power > strength, `${r.id}: ${power} <= ${strength}`); strength = power
    assert.ok(unlockedSpecials(save).includes(r.id))
    if (i < 4) assert.ok(!unlockedSpecials(save).includes(special.tiers[i+1].id))
    const race = (winner, perfect = false) => {
      save.duel = createDuel(r.id, save.lineup.map(id => ({ id, prep: { stage: 0, parts: [] } })), () => .5)
      save.duel.winner = winner
      save.duel.player.points = perfect ? 5 : 3
      return settleDuel(save)
    }
    assert.equal(race('rival').credits, 0)
    assert.equal(race('tie').credits, 0)
    const tickets = save.tickets.overdrive ?? 0
    assert.equal(race('player').credits, r.reward)
    assert.equal(save.tickets.overdrive ?? 0, tickets + (i === 4 ? 1 : 0))
    assert.equal(race('player', true).credits, r.replay)
    assert.equal(save.tickets.overdrive ?? 0, tickets + (i === 4 ? 1 : 0))
    const loaded = readSave(JSON.stringify(save))
    assert.equal(loaded.record[r.id].wins, 2)
    Object.assign(save, loaded)
    assert.equal(race('player').credits, r.replay)
    assert.equal(save.tickets.overdrive ?? 0, tickets + (i === 4 ? 1 : 0))
  }
}
const fresh = newSave()
const r = specials[0].tiers[0]
fresh.duel = createDuel(r.id, fresh.lineup.map(id => ({ id, prep: { stage: 0, parts: [] } })), () => .5)
fresh.duel.winner = 'player'; fresh.duel.player.points = 5
assert.equal(settleDuel(fresh).credits, r.reward * 2)
console.log('Spéciales : données, progression, gains et sauvegardes OK')
