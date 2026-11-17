// Vérification hors réseau : node src/game/duel-golden.check.cjs
// Empreinte de 400 duels contre l'IA (graines et choix fixes), relevée le 17 novembre 2026 avant le moteur versus.
// Toute modification du moteur qui change une seule course contre l'IA fait échouer ce test.
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, resolveJsonModule: true },
}).outputText, filename)
const rules = require('./rules.ts')
const data = require('./data.ts')

const lcg = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
const ids = data.vehicles.map(v => v.id)
const rivalIds = [...data.rivalById.keys()]
const stances = ['normal', 'attaque', 'gestion']
const out = []
for (let n = 1; n <= 400; n++) {
  const pick = lcg(n * 7919)
  const lineup = []
  while (lineup.length < 3) { const id = ids[Math.floor(pick() * ids.length)]; if (!lineup.includes(id)) lineup.push(id) }
  const rng = lcg(n)
  const duel = rules.createDuel(rivalIds[n % rivalIds.length], lineup.map(id => ({ id, prep: { stage: n % 4, parts: [] } })), rng)
  while (!duel.winner && duel.rounds.length < duel.sectors.length) {
    rules.playRound(duel, { car: Math.floor(pick() * 3), nitro: pick() < 0.3, stance: stances[Math.floor(pick() * 3)] }, rng)
  }
  out.push(JSON.stringify({ c: duel.conditions, r: duel.rounds, w: duel.winner, p: duel.player.points, q: duel.rival.points }))
}
const text = out.join('\n')
assert.equal(crypto.createHash('sha256').update(text).digest('hex').slice(0, 16), 'a3873fff9c5f116f', 'les duels contre l’IA ont changé')
assert.ok(text.includes('"incident"') && text.includes('"perfect"'), 'l’échantillon doit couvrir incidents et secteurs parfaits')
console.log('Empreinte des duels contre l’IA (400 courses) : OK')
