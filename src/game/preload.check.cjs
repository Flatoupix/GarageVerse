// Vérification hors réseau : node src/game/preload.check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { createPreloader, decodeImage } = require('./preload.ts')

const tick = () => new Promise(resolve => setImmediate(resolve))
function fakeLoader() {
  const started = []
  const active = new Map()
  let peak = 0
  const loader = (url, signal, lowPriority) => new Promise((resolve, reject) => {
    signal.throwIfAborted()
    assert.ok(!active.has(url))
    started.push({ url, lowPriority })
    const finish = (failed = false) => {
      active.delete(url)
      signal.removeEventListener('abort', abort)
      if (failed) reject(new Error(url))
      else resolve()
    }
    const abort = () => finish(true)
    signal.addEventListener('abort', abort, { once: true })
    active.set(url, finish)
    peak = Math.max(peak, active.size)
  })
  return { loader, started, active, get peak() { return peak } }
}

async function check() {
  const fake = fakeLoader()
  const queue = createPreloader(fake.loader)
  const progress = []
  const urls = Array.from({ length: 9 }, (_, i) => String(i))
  const batch = queue.preload([...urls, '1', undefined], 'essential', state => progress.push(state))
  const shared = queue.preload(['1'])
  await tick()
  assert.equal(fake.active.size, 6)
  while (fake.active.size) {
    for (const [url, finish] of fake.active) finish(url === '8')
    await tick()
  }
  assert.equal(fake.peak, 6)
  assert.equal(fake.started.length, 9)
  assert.deepEqual(await batch.done, { loaded: 9, total: 9, errors: 1 })
  assert.deepEqual(await shared.done, { loaded: 1, total: 1, errors: 0 })
  assert.deepEqual(progress.map(state => state.loaded), Array.from({ length: 10 }, (_, i) => i))
  assert.ok(progress.every(state => state.total === 9))
  await queue.preload(['1', '1']).done
  assert.equal(fake.started.length, 9)

  const limited = fakeLoader()
  const single = createPreloader(limited.loader, 1)
  const immediate = single.preload(['jamais'])
  immediate.cancel()
  const cancelled = single.preload(['a', 'b'])
  await tick()
  cancelled.cancel()
  assert.deepEqual(await cancelled.done, { loaded: 0, total: 2, errors: 0 })
  await tick()
  assert.deepEqual(limited.started.map(job => job.url), ['a'])
  assert.equal(limited.active.size, 0)

  const idle = fakeLoader()
  const priority = createPreloader(idle.loader)
  const background = priority.preload(['fond-1', 'fond-2', 'fond-3'], 'background')
  await tick()
  assert.equal(idle.started.length, 0)
  priority.pauseBackground(false)
  await tick()
  assert.deepEqual([...idle.active.keys()], ['fond-1', 'fond-2'])
  priority.pauseBackground(true)
  await tick()
  assert.equal(idle.active.size, 0)
  priority.pauseBackground(false)
  await tick()
  const target = priority.preload(['fond-3', 'cible'])
  await tick()
  assert.deepEqual([...idle.active.keys()], ['fond-3', 'cible'])
  assert.equal(idle.started.find(job => job.url === 'fond-3').lowPriority, false)
  priority.pauseBackground(true)
  for (const finish of idle.active.values()) finish()
  await target.done
  await tick()
  assert.equal(idle.active.size, 0)
  priority.pauseBackground(false)
  await tick()
  assert.deepEqual([...idle.active.keys()], ['fond-1', 'fond-2'])
  for (const finish of idle.active.values()) finish()
  assert.deepEqual(await background.done, { loaded: 3, total: 3, errors: 0 })

  let decoded
  global.Image = class {
    async decode() { decoded = this.src }
  }
  await decodeImage('image.webp', new AbortController().signal, false)
  assert.equal(decoded, 'image.webp')
}

check().then(() => console.log('Préchargement vérifié.'), error => { console.error(error); process.exitCode = 1 })
