// Vérification hors réseau : node src/game/personnages.check.cjs
const assert = require('node:assert/strict')
const { rivals, specials } = require('../data/garage.json')
const fields = ['bio', 'style', 'likes', 'intro', 'win', 'lose', 'perfect']
assert.equal(rivals.length, 6)
for (const rival of rivals) {
  for (const field of fields) {
    assert.ok(typeof rival[field] === 'string' && rival[field].trim(), `${rival.id} : ${field} manquant`)
  }
}
for (const field of ['intro', 'style', 'likes']) {
  assert.equal(new Set(rivals.map(r => r[field])).size, rivals.length, `${field} doit être distinct pour chaque rival`)
}
for (const special of specials) {
  for (const tier of special.tiers) {
    for (const field of fields) assert.ok(!Object.hasOwn(tier, field), `${tier.id} : ${field} interdit en spéciale`)
  }
}
console.log('Personnalités des six rivaux et exclusions des spéciales : OK')
