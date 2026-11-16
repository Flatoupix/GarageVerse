// Vérification hors réseau : node src/game/releases.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename)
const { compareVersions, inline, parseChangelog, releasesToShow } = require('./releases.ts')

// Le vrai CHANGELOG : la version jouée a ses notes, chaque entrée a une date et au moins une puce.
const root = path.join(__dirname, '..', '..')
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const releases = parseChangelog(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'))
assert.ok(releases.some(r => r.version === version), `CHANGELOG.md sans entrée pour ${version}`)
for (const r of releases) {
  assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/, `date de ${r.version}`)
  assert.ok(r.sections.some(s => s.items.length), `aucune note pour ${r.version}`)
}
assert.equal(new Set(releases.map(r => r.version)).size, releases.length, 'version en double')

// Analyse : entrée non publiée ignorée, rubriques et puces, gras et italique en segments.
const sample = [
  '# Notes', 'Intro **ignorée**.', '## [Non publié]', '### Ajouté', '- Pas encore sortie.',
  '## [0.2.1] — 2026-11-20', '### Corrigé', '- **Course.** Le bouton *Engager* reste visible.', '- Rien de `grave`.',
  '## [0.2.0] — 2026-11-18', '- Sans rubrique.',
  '## [0.1.0] — 2026-11-10', '### Ajouté', '- Premier garage.',
].join('\n')
const parsed = parseChangelog(sample)
assert.deepEqual(parsed.map(r => r.version), ['0.2.1', '0.2.0', '0.1.0'])
assert.deepEqual(parsed[0].sections.map(s => s.title), ['Corrigé'])
assert.deepEqual(parsed[0].sections[0].items[0], [
  { text: 'Course.', bold: true }, { text: ' Le bouton ' }, { text: 'Engager', italic: true }, { text: ' reste visible.' },
])
assert.deepEqual(parsed[0].sections[0].items[1], [{ text: 'Rien de ' }, { text: 'grave' }, { text: '.' }])
assert.equal(parsed[1].sections[0].title, 'Nouveautés')
assert.deepEqual(inline('<img src=x onerror=alert(1)>'), [{ text: '<img src=x onerror=alert(1)>' }])

// Choix des notes à l'ouverture.
assert.ok(compareVersions('0.10.0', '0.9.9') > 0)
assert.equal(compareVersions('1.0.0', '1.0.0'), 0)
const versions = list => list.map(r => r.version)
assert.deepEqual(versions(releasesToShow(parsed, '0.2.1', '0.1.0')), ['0.2.1', '0.2.0'], 'mise à jour : versions manquées')
assert.deepEqual(versions(releasesToShow(parsed, '0.2.1', '0.2.1')), [], 'version déjà vue')
assert.deepEqual(versions(releasesToShow(parsed, '0.2.1', null)), ['0.2.1'], 'joueur d’avant la fonction : version jouée seule')
assert.deepEqual(versions(releasesToShow(parsed, '0.2.0', '0.1.0')), ['0.2.0'], 'notes plus récentes que la version jouée exclues')
assert.deepEqual(versions(releasesToShow(parsed, '0.2.1', '0.0.1', 2)), ['0.2.1', '0.2.0'], 'limite')
assert.deepEqual(versions(releasesToShow(parsed, '0.2.1', '0.3.0')), [], 'retour à une version antérieure')

console.log(`Notes de version : ${releases.length} versions lues, ${version} présente, analyse et sélection : OK`)
