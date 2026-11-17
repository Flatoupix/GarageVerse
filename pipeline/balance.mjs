#!/usr/bin/env node
// Compile pipeline/balance.ts avec l'esbuild fourni par Vite, puis lance la simulation.
//   node pipeline/balance.mjs            simulation locale → pipeline/balance-report.json
//   node pipeline/balance.mjs --review   puis revue game design par Antigravity → pipeline/balance-review.md
import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '.balance.bundle.mjs')
await build({ entryPoints: [join(here, 'balance.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error' })
const sim = spawnSync(process.execPath, [out], { stdio: 'inherit' })
if (sim.status !== 0) process.exit(sim.status ?? 1)

if (process.argv.includes('--review')) {
  // Les fichiers sont fournis dans le prompt : Antigravity n'a besoin d'aucun outil, et tout outil lui est refusé.
  const root = join(here, '..')
  const files = ['docs/meta.md', 'src/data/roster.json', 'src/data/garage.json', 'src/game/rules.ts', 'pipeline/balance-report.json']
  const context = files.map(f => `=== ${f} ===\n${readFileSync(join(root, f), 'utf8')}`).join('\n\n')
  const prompt = 'Tu es game designer systèmes pour GarageVerse, un jeu de cartes automobiles rétro synthwave. ' +
    'Les fichiers du projet sont fournis ci-dessous : règles (docs/meta.md), données, moteur de course et rapport de simulation. ' +
    'Identifie au plus 8 déséquilibres concrets (voitures trop fortes ou inutiles, pièces dominantes, rivaux mal calibrés, courbe de progression). ' +
    'Pour chacun, propose une modification chiffrée d’un champ JSON précis (id et champ). Réponds directement en Markdown français, sans utiliser d’outil.\n\n' + context
  const settings = { permissions: { deny: ['command(*)', 'unsandboxed(*)', 'write_file(*)', 'read_url(*)', 'execute_url(*)', 'download_url(*)'] } }
  const review = spawnSync('agy', ['--sandbox', '--mode', 'plan', '--disable-slash-commands', '--settings', JSON.stringify(settings),
    '--print-timeout', '900s', '-p', prompt], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  writeFileSync(join(here, 'balance-review.md'), review.stdout || review.stderr)
  console.log(`Revue Antigravity → pipeline/balance-review.md (${review.status === 0 && review.stdout ? 'ok' : 'échec'})`)
}
