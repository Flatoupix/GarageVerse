// Vérification hors réseau : node src/i18n/i18n.check.cjs
// Le texte français est la clé : chaque `t('…')` et `tp('…', '…', n)` du code doit avoir sa traduction anglaise, avec les mêmes {paramètres}.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)

const root = path.join(__dirname, '..', '..')
const zones = fs.readdirSync(path.join(__dirname, 'en')).filter(f => f.endsWith('.ts') && f !== 'index.ts')
const params = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',')

// 1. Une même phrase dans deux fichiers du dictionnaire a la même traduction.
const en = {}
for (const zone of zones) {
  const dict = Object.values(require(path.join(__dirname, 'en', zone)))[0]
  for (const [key, value] of Object.entries(dict)) {
    assert.ok(typeof value === 'string' && value.trim(), `${zone} : traduction vide pour « ${key} »`)
    assert.ok(!(key in en) || en[key] === value, `« ${key} » est traduit différemment dans deux fichiers (${zone})`)
    en[key] = value
  }
}

// 2. Mêmes {paramètres} des deux côtés, sinon l'anglais afficherait « {n} » tel quel.
for (const [key, value] of Object.entries(en)) assert.equal(params(value), params(key), `paramètres différents pour « ${key} »`)

// 3. Toute phrase passée à t() ou tp() dans le code a sa traduction. Les chaînes construites (`${…}`) sont interdites comme clés.
const files = []
const walk = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
  const p = path.join(dir, e.name)
  if (e.isDirectory()) { if (e.name !== 'i18n' && e.name !== 'assets') walk(p) } else if (/\.(vue|ts)$/.test(e.name)) files.push(p)
} }
walk(path.join(root, 'src'))
const literal = String.raw`(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|\`((?:\\.|[^\`\\])*)\`)`
const calls = [new RegExp(String.raw`(?<![\w.$])t\(\s*${literal}`, 'g'), new RegExp(String.raw`(?<![\w.$])tp\(\s*${literal}\s*,\s*${literal}`, 'g')]
const used = new Map()
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  for (const re of calls) for (const m of source.matchAll(re)) {
    const raw = [m[1] ?? m[2] ?? m[3], m[4] ?? m[5] ?? m[6]].filter(x => x !== undefined)
    for (const text of raw) {
      assert.ok(!/\$\{/.test(text), `${path.relative(root, file)} : clé construite « ${text} » : utiliser {paramètre}`)
      used.set(text.replace(/\\(['"`\\])/g, '$1'), path.relative(root, file))
    }
  }
}
const absent = [...used].filter(([key]) => !(key in en))
assert.equal(absent.length, 0, `${absent.length} phrase(s) sans traduction anglaise :\n` + absent.slice(0, 25).map(([k, f]) => `  ${f} : ${k}`).join('\n'))

// 4. Données : chaque texte d'affichage de roster.json et garage.json (et les libellés de game/data.ts) a son anglais.
// Les noms de voitures et de personnages, les identifiants et les champs techniques (art, anim, paint, scene…) ne sont pas traduits.
const roster = require(path.join(root, 'src', 'data', 'roster.json'))
const garage = require(path.join(root, 'src', 'data', 'garage.json'))
const shown = new Map()
const want = (text, where) => { if (typeof text === 'string' && text.trim() && !shown.has(text)) shown.set(text, where) }
for (const v of roster.vehicles) {
  for (const field of ['story', 'spec', 'origin', 'drive', 'engine', 'version']) want(v[field], `roster ${v.id}.${field}`)
  want(v.signature.name, `roster ${v.id}.signature.name`)
  want(v.signature.text, `roster ${v.id}.signature.text`)
  for (const tag of v.tags ?? []) want(tag, `roster ${v.id}.tags`)
  if (v.culture) { want(v.culture.work, `roster ${v.id}.culture.work`); for (const a of v.culture.aura ?? []) want(a, `roster ${v.id}.culture.aura`) }
}
for (const [id, name] of Object.entries(garage.families)) want(name, `garage families.${id}`)
for (const p of garage.parts) {
  want(p.name, `garage parts.${p.id}.name`); want(p.text, `garage parts.${p.id}.text`)
  for (const list of Object.values(p.requires ?? {})) for (const x of list) want(x, `garage parts.${p.id}.requires`)
}
for (const s of garage.progression.stages) want(s.text, `garage progression.stages.${s.stage}`)
for (const b of garage.boosters) { want(b.name, `garage boosters.${b.id}.name`); want(b.tagline, `garage boosters.${b.id}.tagline`); for (const x of b.favorTags ?? []) want(x, `garage boosters.${b.id}.favorTags`) }
for (const l of garage.leagues) want(l.name, `garage leagues.${l.id}`)
const rivalFields = r => {
  for (const field of ['title', 'bio', 'style', 'likes', 'intro', 'win', 'lose', 'perfect']) want(r[field], `garage rival ${r.id}.${field}`)
  if (r.circuit) want(r.circuit.name, `garage rival ${r.id}.circuit.name`)
}
garage.rivals.forEach(rivalFields)
for (const s of garage.series) { want(s.name, `garage series.${s.id}.name`); want(s.description, `garage series.${s.id}.description`) }
for (const s of garage.specials) {
  want(s.name, `garage specials.${s.id}.name`)
  for (const tier of s.tiers) { want(tier.name, `garage special ${tier.id}.name`); rivalFields(tier) }
}
// Libellés de game/data.ts affichés par les vues avec t().
const game = require(path.join(root, 'src', 'game', 'data.ts'))
for (const group of [game.statLabels, game.statShort, game.sectorLabels, game.conditionLabels, game.families]) for (const label of Object.values(group)) want(label, 'game/data.ts')
for (const v of game.vehicles) for (const style of game.stylesOf(v.id)) want(game.styleLabel(v, style), `game/data.ts édition ${v.id}`)
for (const r of game.rivals) for (const step of game.rivalSteps(r)) want(step.stepLabel, 'game/data.ts étapes')
const noData = [...shown].filter(([text]) => !(text in en))
assert.equal(noData.length, 0, `${noData.length} texte(s) de données sans traduction anglaise :\n` + noData.slice(0, 25).map(([k, f]) => `  ${f} : ${k}`).join('\n'))

console.log(`i18n · ${Object.keys(en).length} phrases traduites, ${used.size} utilisées dans le code, ${shown.size} textes de données, ${zones.length} fichiers`)
