import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decide, parsePatchPaths } from './cycle.ts'
import { reportFrom } from './agents.ts'
import { execute, redact } from './process.ts'

test('un patch est limité aux chemins autorisés', () => {
  assert.deepEqual(parsePatchPaths('2\t1\tsrc/App.vue\0', ['src/']), ['src/App.vue'])
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
