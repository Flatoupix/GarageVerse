import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decide, parsePatchPaths } from './cycle.ts'
import { mkdtemp, writeFile, chmod, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_CHAINS, invoke, orderChain, profileFor, reportFrom, validateChains } from './agents.ts'
import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { integratePatch, land, startPoint, trunkRef } from './integration.ts'
import { execute, redact } from './process.ts'

test('un patch est limité aux chemins autorisés', () => {
  assert.deepEqual(parsePatchPaths('2\t1\tsrc/App.vue\0', ['src/']), ['src/App.vue'])
  assert.deepEqual(parsePatchPaths('2\t1\tsupabase/functions/_shared/friends.ts\0', ['supabase/']), ['supabase/functions/_shared/friends.ts'])
  for (const path of ['../src/App.vue', 'src/../package.json', 'src/.secret', 'package.json']) {
    assert.throws(() => parsePatchPaths(`2\t1\t${path}\0`, ['src/']))
  }
  assert.throws(() => parsePatchPaths('-\t-\tsrc/binary\0', ['src/']))
  assert.throws(() => parsePatchPaths('2\t1\t\0src/a.vue\0src/b.vue\0', ['src/']))
})

test('une revue passe seulement avec les trois validations', () => {
  const report = { status: 'pass', summary: 'Revue complète', criteria: [], findings: [], evidence: [] } as const
  const state = {
    stage: 'review', correction: 0, config: { limits: { corrections: 3 } },
    tests: { build: 'pass', browser: 'pass', detail: 'preuve' }, reports: { ux: report, review: report },
  } as unknown as Parameters<typeof decide>[0]
  assert.equal(decide(state), 'finish')
  assert.equal(decide({ ...state, reports: { review: state.reports.review } }), 'implement')
  assert.equal(decide({ ...state, tests: { build: 'pass', browser: 'fail', detail: 'échec' }, correction: 3 }), 'limit')
})

test('les rapports et journaux filtrent les jetons courants', () => {
  const token = 'ghp_aaaaaaaaaaaaaaaaaaaaaaaaaaa'
  assert.ok(!redact('Authorization: Bearer ' + token).includes(token))
  assert.ok(!redact('const API_KEY = "s3cr3t-valeur-longue"').includes('s3cr3t'))
  assert.ok(!redact('password=Zx81kq9fT2mLp0aWq').includes('Zx81kq9fT2mLp0aWq'))
  for (const code of ['autoRefreshToken: VERSUS_OPEN || !!save.versus?.active', 'async function playerOf(token: string)', 'token: session.access_token'])
    assert.equal(redact(code), code)
  const report = { status: 'pass', summary: token, criteria: ['critère'], findings: [], evidence: [], patch: '' }
  assert.equal(reportFrom(report, 'plan').summary, '[masqué]')
  assert.throws(() => reportFrom({ ...report, criteria: [] }, 'plan'))
})

test('un processus enfant est interrompu au délai ou sur demande', async () => {
  const cwd = import.meta.dirname
  const running = ['-e', 'setInterval(() => {}, 1000)']
  const elapsed = await execute(process.execPath, running, { cwd, timeout: 100 })
  assert.equal(elapsed.problem, 'délai dépassé')
  const controller = new AbortController()
  const result = execute(process.execPath, running, { cwd, timeout: 2000, signal: controller.signal })
  controller.abort()
  assert.equal((await result).problem, 'arrêt demandé')
})

test('les chaînes de modèles refusent un moteur ou un modèle inattendu', () => {
  validateChains(undefined)
  validateChains(DEFAULT_CHAINS)
  assert.throws(() => validateChains({ plan: [{ engine: 'codex' }] }))
  assert.throws(() => validateChains({ review: [] }))
  assert.throws(() => validateChains({ review: [{ engine: 'claude', model: '--dangerous flag' }] }))
  assert.throws(() => validateChains({ inconnue: [{ engine: 'claude' }] } as never))
})

test('un modèle à court de quota passe la main au suivant de la chaîne', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'chain-'))
  const calls = join(dir, 'calls.log')
  const report = { status: 'pass', summary: 'Plan prêt', criteria: ['critère'], findings: [], evidence: [], patch: '' }
  const fake = join(dir, 'claude')
  // Opus répond « usage limit », Sonnet rend un rapport : les deux appels doivent porter leur --model.
  await writeFile(fake, `#!/bin/sh\necho "$*" | cut -c1-80 >> '${calls}'\ncase "$*" in\n  *claude-opus-5-5*) echo 'Claude usage limit reached' >&2; exit 1;;\nesac\nprintf '%s' '${JSON.stringify({ structured_output: report, usage: { input_tokens: 3, output_tokens: 4 } })}'\n`)
  await chmod(fake, 0o755)
  const binaries = { claude: fake, codex: fake, agy: fake }
  const reply = await invoke('plan', binaries, 'prompt', dir, { cwd: dir, timeout: 10_000 }, 1, 'evidence.ts', DEFAULT_CHAINS.plan)
  assert.equal(reply.report?.status, 'pass')
  assert.equal(reply.switched, 'claude · claude-sonnet-5-5')
  assert.match(reply.report!.evidence.join(' '), /Modèle de relais \(plan\)/)
  const log = (await readFile(calls, 'utf8')).trim().split('\n')
  assert.equal(log.length, 2)
  assert.match(log[0], /--model claude-opus-5-5/)
  assert.match(log[1], /--model claude-sonnet-5-5/)
  const none = await invoke('plan', { ...binaries, claude: join(dir, 'absent') }, 'prompt', dir, { cwd: dir, timeout: 10_000 }, 1, 'evidence.ts', DEFAULT_CHAINS.plan)
  assert.equal(none.report, undefined)
  assert.ok(none.problem)
})

test('le profil de la tâche réordonne les modèles sans changer l’ordre des moteurs', () => {
  const small = { brief: 'Court', requirements: ['a'], paths: ['src/a.vue'] }
  assert.equal(profileFor(small), 'light')
  assert.equal(profileFor({ ...small, requirements: ['a', 'b', 'c'] }), 'standard')
  assert.equal(profileFor({ ...small, paths: ['supabase/x.sql'] }), 'heavy')
  assert.equal(profileFor({ ...small, profile: 'standard' }), 'standard')
  assert.equal(profileFor({ ...small, profile: 'light' }, 1), 'heavy')
  const names = (profile: Parameters<typeof orderChain>[1]) => orderChain(DEFAULT_CHAINS.implement, profile).map(link => link.model ?? link.engine)
  assert.deepEqual(names('standard'), ['codex', 'claude-opus-5-5', 'claude-sonnet-5-5'])
  assert.deepEqual(names('light'), ['codex', 'claude-sonnet-5-5', 'claude-opus-5-5'])
  assert.deepEqual(orderChain(DEFAULT_CHAINS.review, 'light').map(link => link.model), ['claude-sonnet-5-5', 'claude-opus-5-5'])
  assert.equal(orderChain(DEFAULT_CHAINS.ux, 'light')[0].engine, 'agy')
  assert.equal(orderChain(DEFAULT_CHAINS.ux, 'light')[0].model, 'gemini-3.8-flash-high')
  assert.equal(orderChain(DEFAULT_CHAINS.ux, 'heavy').at(-1)?.model, 'claude-sonnet-5-5')
})

test('l’intégration empile les cycles sur un tronc caché sans toucher au dépôt de travail', async () => {
  const root = await mkdtemp(join(tmpdir(), 'trunk-'))
  const repo = join(root, 'repo')
  const sh = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], { cwd, encoding: 'utf8' }).trim()
  execFileSync('git', ['init', '-q', '-b', 'dev', repo])
  writeFileSync(join(repo, 'a.txt'), 'a\n'); sh(repo, 'add', '.'); sh(repo, 'commit', '-q', '-m', 'base')
  // Deux patchs successifs, fabriqués sur une branche jetable puis remise à zéro.
  const patchFor = (name: string, file: string, content: string) => {
    sh(repo, 'switch', '-q', '-c', 'jetable'); writeFileSync(join(repo, file), content); sh(repo, 'add', '.'); sh(repo, 'commit', '-q', '-m', name)
    const out = join(root, name + '.patch'); writeFileSync(out, sh(repo, 'format-patch', '-1', '--stdout') + '\n')
    sh(repo, 'switch', '-q', 'dev'); sh(repo, 'branch', '-q', '-D', 'jetable'); return out
  }
  const first = patchFor('un', 'b.txt', 'b\n'), second = patchFor('deux', 'c.txt', 'c\n')
  const devBefore = sh(repo, 'rev-parse', 'dev')
  assert.equal(await startPoint(repo, 'dev'), 'refs/heads/dev')
  await integratePatch(repo, 'dev', first, root)
  assert.equal(await startPoint(repo, 'dev'), trunkRef('dev'))
  await integratePatch(repo, 'dev', second, root)
  assert.equal(sh(repo, 'log', '--format=%s', `dev..${trunkRef('dev')}`), 'deux\nun')
  // Rien n'a bougé dans le dépôt de travail : branche, fichiers, copies de travail supplémentaires.
  assert.equal(sh(repo, 'rev-parse', 'dev'), devBefore)
  assert.ok(!existsSync(join(repo, 'b.txt')) && !existsSync(join(repo, 'c.txt')))
  assert.equal(sh(repo, 'status', '--porcelain'), '')
  assert.equal(sh(repo, 'worktree', 'list').split('\n').length, 1)
  // La branche avance de son côté : la reprise se fait commit par commit, puis le tronc disparaît.
  writeFileSync(join(repo, 'd.txt'), 'd\n'); sh(repo, 'add', '.'); sh(repo, 'commit', '-q', '-m', 'ailleurs')
  assert.deepEqual((await land(repo, 'dev')).map(line => line.slice(8)), ['un', 'deux'])
  assert.equal(sh(repo, 'log', '--format=%s', '-3'), 'deux\nun\nailleurs')
  assert.equal(await startPoint(repo, 'dev'), 'refs/heads/dev')
  await assert.rejects(land(repo, 'dev'), /Aucun cycle/)
  // Avance rapide quand la branche n'a pas bougé ; un patch qui ne s'applique plus est refusé sans laisser de trace.
  const third = patchFor('trois', 'e.txt', 'e\n')
  await integratePatch(repo, 'dev', third, root)
  assert.deepEqual((await land(repo, 'dev')).map(line => line.slice(8)), ['trois'])
  writeFileSync(join(repo, 'e.txt'), 'autre\n'); sh(repo, 'add', '.'); sh(repo, 'commit', '-q', '-m', 'conflit')
  await assert.rejects(integratePatch(repo, 'dev', third, root), /ne s’applique plus/)
  assert.equal(sh(repo, 'worktree', 'list').split('\n').length, 1)
  // Le patch refusé n'a pas créé de tronc.
  assert.throws(() => execFileSync('git', ['show-ref', '--verify', '--quiet', trunkRef('dev')], { cwd: repo }))
})
