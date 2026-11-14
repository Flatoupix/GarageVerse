#!/usr/bin/env node
// Pipeline d'illustrations GarageVerse.
//   node pipeline/art.mjs [--kind cars,parts,rivals,packs,ui] [--only id1,id2] [--force] [--jobs 4] [--engine auto|codex|agy] [--dry-run]
//   node pipeline/art.mjs --review [--kind cars] [--only …]   (revue artistique par Antigravity)
//   node pipeline/art.mjs --redo                                (régénère ce que la revue a refusé)
// Codex (ou Antigravity en relais) génère chaque image, cwebp la recadre et la convertit dans src/assets/<kind>/<id>.webp.
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const roster = JSON.parse(await readFile(join(root, 'src/data/roster.json'), 'utf8'))
const garage = JSON.parse(await readFile(join(root, 'src/data/garage.json'), 'utf8'))
const logFile = join(root, 'pipeline/art-log.json')
const reviewFile = join(root, 'pipeline/art-review.json')
const log = existsSync(logFile) ? JSON.parse(await readFile(logFile, 'utf8')) : {}
const reviews = existsSync(reviewFile) ? JSON.parse(await readFile(reviewFile, 'utf8')) : {}

const args = process.argv.slice(2)
const flag = name => args.includes(`--${name}`)
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const kinds = (option('kind') ?? 'cars,parts,rivals,packs,ui').split(',')
const only = option('only')?.split(',')
const parallel = Number(option('jobs') ?? 4)

const NO_TEXT = 'Strictly no text, no letters, no numbers, no logos, no brand badges, no readable license plates, no watermark, no card frame or border.'
const STYLE = 'Style: premium 1980s synthwave / outrun poster illustration, clean crisp shapes, glossy reflections and chrome highlights, ' +
  'palette of hot magenta, electric cyan, deep violet and sunset orange, subtle film grain. Cohesive with a retro trading-card game.'
const SCENES = {
  sunset: 'a striped synthwave sunset over a glowing magenta and cyan perspective grid floor, palm tree silhouettes',
  city: 'a rain-wet neon city street at night, magenta and cyan glowing signs without readable text, reflections on the asphalt',
  highway: 'an endless desert highway at dusk with purple mountains, a giant striped sun and light trails',
  mountain: 'a twisting mountain pass at twilight, gravel and asphalt, violet peaks and a neon horizon line',
  track: 'a night race circuit with neon striped curbs, floodlights and motion light trails',
  retro: 'a chrome retro-futuristic landscape with laser grid floor, starfield and a glowing horizon',
}

function jobs() {
  const list = []
  if (kinds.includes('cars')) for (const v of roster.vehicles) {
    const subject = v.culture
      ? `the iconic screen-accurate vehicle "${v.name}" from ${v.culture.work} (${v.year}): ${v.paint}`
      : `a ${v.year} ${v.name} ${v.version}, faithful real-world body shape and proportions, ${v.paint} paint`
    list.push({ kind: 'cars', id: v.id, size: [640, 960], prompt:
      `Collectible car card illustration, portrait 2:3. Subject: ${subject}. Three-quarter front view, the whole car visible, ` +
      `centered in the lower two thirds, slight low camera angle, wheels on the ground unless it flies. Scene: ${SCENES[v.scene]}. ${STYLE} ${NO_TEXT}` })
  }
  if (kinds.includes('parts')) for (const p of garage.parts) list.push({ kind: 'parts', id: p.id, size: [512, 512], prompt:
    `Mechanic part card illustration, square 1:1. Subject: ${p.art}, single hero object, centered, studio product shot. ` +
    `Background: dark violet void with a glowing magenta and cyan perspective grid floor and neon rim light. ${STYLE} ${NO_TEXT}` })
  if (kinds.includes('rivals')) for (const r of garage.rivals) list.push({ kind: 'rivals', id: r.id, size: [512, 512], prompt:
    `Character portrait for a racing rival, square 1:1, head and shoulders. Subject: ${r.art}. Fictional person. ` +
    `Background: neon city bokeh and a synthwave sunset. ${STYLE} ${NO_TEXT}` })
  if (kinds.includes('packs')) {
    const looks = {
      neon: 'magenta and cyan sunset over a laser grid with a chrome sports car silhouette',
      night: 'midnight blue city skyline, rain and violet neon, a drifting car silhouette with light trails',
      overdrive: 'molten gold and hot pink speed lines, an hypercar silhouette breaking through a chrome grid',
    }
    for (const b of garage.boosters) list.push({ kind: 'packs', id: b.id, size: [600, 900], prompt:
      `Front artwork printed on a foil trading-card booster pack, portrait 2:3, fills the whole image edge to edge. ` +
      `Design: ${looks[b.id]}. Leave the top 25% calmer for a title overlay. ${STYLE} ${NO_TEXT}` })
  }
  if (kinds.includes('ui')) list.push({ kind: 'ui', id: 'hero', size: [900, 1350], prompt:
    `Mobile game home screen background, portrait 2:3. An open neon-lit garage at night facing a synthwave sunset, ` +
    `a sports car silhouette under a cover inside, a perspective grid driveway. Keep the top third mostly sky for a title. ${STYLE} ${NO_TEXT}` })
  return list.filter(j => !only || only.includes(j.id))
}

function run(command, commandArgs, options = {}) {
  return new Promise(resolvePromise => {
    const child = spawn(command, commandArgs, { ...options, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = '', stderr = ''
    child.stdout.on('data', d => { stdout += d })
    child.stderr.on('data', d => { stderr += d })
    child.on('error', error => resolvePromise({ code: -1, stdout, stderr: String(error) }))
    child.on('close', code => resolvePromise({ code, stdout, stderr }))
    if (options.input) child.stdin.end(options.input); else child.stdin.end()
  })
}

const target = job => join(root, 'src/assets', job.kind, `${job.id}.webp`)

// Moteurs d'image : Codex enregistre ./out.png dans un dossier isolé ; Antigravity dépose l'image dans son
// dossier « brain », retrouvée grâce au nom imposé. En mode auto, une limite d'usage Codex bascule sur agy.
let engine = option('engine') ?? 'auto'
const exhausted = new Set()
const agyBrain = join(homedir(), '.gemini/antigravity-cli/brain')

async function withCodex(job, prompt, work) {
  const instruction = 'Use your built-in image generation tool to create exactly one image from the brief below, ' +
    'then save that image as ./out.png in the current working directory. Do not create any other file and do not edit code. ' +
    `Reply only with "done".\n\nBrief: ${prompt}`
  const result = await run('codex', ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '--ephemeral', '-C', work, '-'],
    { cwd: work, input: instruction })
  const tokens = Number((result.stdout + result.stderr).match(/tokens used\s*\n?\s*([\d\s ]+)/)?.[1]?.replace(/\D/g, '')) || undefined
  const limited = /usage limit|rate limit/i.test(result.stderr + result.stdout)
  return { file: existsSync(join(work, 'out.png')) ? join(work, 'out.png') : undefined, tokens, limited,
    detail: result.stderr.split('\n').filter(Boolean).slice(-2).join(' | ') }
}

async function findAgyImage(name, since) {
  const found = []
  for (const conversation of await readdir(agyBrain).catch(() => [])) {
    for (const file of await readdir(join(agyBrain, conversation)).catch(() => [])) {
      if (!file.startsWith(name) || !/\.(png|jpe?g|webp)$/i.test(file)) continue
      const path = join(agyBrain, conversation, file)
      if ((await stat(path)).mtimeMs >= since) found.push(path)
    }
  }
  return found.sort().at(-1)
}

async function withAgy(job, prompt, started) {
  const name = `gv_${job.kind}_${job.id.replace(/\W/g, '_')}`
  const ratio = job.size[0] === job.size[1] ? 'square 1:1' : 'portrait 2:3'
  const instruction = `Use your image generation tool to create exactly one ${ratio} image named "${name}" from the brief below. ` +
    `Wait until the image is generated, do not create or edit any other file, then reply only with "done".\n\nBrief: ${prompt}`
  const result = await run('agy', ['--sandbox', '--mode', 'accept-edits', '--disable-slash-commands', '--print-timeout', '420s', '-p', instruction],
    { cwd: tmpdir() })
  for (let wait = 0; wait < 36; wait++) {
    const file = await findAgyImage(name, started)
    if (file) return { file }
    await new Promise(r => setTimeout(r, 5000))
  }
  const detail = (result.stderr || result.stdout).split('\n').filter(Boolean).slice(-2).join(' | ') || 'image introuvable'
  return { detail, limited: /RESOURCE_EXHAUSTED|quota|429/i.test(detail) }
}

async function size(file) {
  const out = await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file])
  return [Number(out.stdout.match(/pixelWidth: (\d+)/)?.[1]), Number(out.stdout.match(/pixelHeight: (\d+)/)?.[1])]
}

// Recadre au centre au ratio cible, puis redimensionne en WebP.
async function convert(file, job) {
  const [w, h] = await size(file)
  const [tw, th] = job.size
  let cw = w, ch = Math.round(w * th / tw)
  if (ch > h) { ch = h; cw = Math.round(h * tw / th) }
  const out = target(job)
  await mkdir(dirname(out), { recursive: true })
  return run('cwebp', ['-quiet', '-q', '82', '-crop', String(Math.floor((w - cw) / 2)), String(Math.floor((h - ch) / 2)), String(cw), String(ch),
    '-resize', String(tw), String(th), file, '-o', out])
}

async function generate(job) {
  const fix = reviews[`${job.kind}/${job.id}`]
  const prompt = job.prompt + (fix && !fix.ok && fix.fix ? ` Important correction from art review: ${fix.fix}` : '')
  const work = await mkdtemp(join(tmpdir(), `gv-${job.id}-`))
  const started = Date.now()
  let used = engine === 'agy' ? 'agy' : 'codex'
  let made = used === 'codex' ? await withCodex(job, prompt, work) : await withAgy(job, prompt, started)
  if (!made.file && made.limited) exhausted.add(used)
  if (!made.file && used === 'codex' && made.limited && engine === 'auto' && !exhausted.has('agy')) {
    if (engine !== 'agy') console.log('· Limite d’usage Codex atteinte : bascule sur Antigravity pour la suite.')
    engine = 'agy'
    used = 'agy'
    made = await withAgy(job, prompt, started)
    if (!made.file && made.limited) exhausted.add('agy')
  }
  let status = 'failed', detail = made.detail
  if (made.file) {
    const webp = await convert(made.file, job)
    status = webp.code === 0 ? 'ok' : 'convert-failed'
    if (webp.code !== 0) detail = webp.stderr
  }
  await rm(work, { recursive: true, force: true })
  log[`${job.kind}/${job.id}`] = { status, engine: used, seconds: Math.round((Date.now() - started) / 1000), tokens: made.tokens,
    prompt: createHash('sha1').update(prompt).digest('hex').slice(0, 10), at: new Date().toISOString(), ...(status === 'ok' ? {} : { detail }) }
  await writeFile(logFile, JSON.stringify(log, null, 2))
  console.log(`${status === 'ok' ? '✓' : '✗'} ${job.kind}/${job.id} [${used}] ${log[`${job.kind}/${job.id}`].seconds}s${status === 'ok' ? '' : ` ${detail}`}`)
}

async function review(list) {
  const present = list.filter(job => existsSync(target(job)))
  for (let i = 0; i < present.length; i += 8) {
    const batch = present.slice(i, i + 8)
    const lines = batch.map(job => {
      const v = roster.vehicles.find(x => x.id === job.id)
      const expected = job.kind === 'cars' ? `${v.year} ${v.name} ${v.version}${v.culture ? ` (${v.culture.work})` : ''}, ${v.paint}`
        : job.kind === 'parts' ? garage.parts.find(p => p.id === job.id).art : job.id
      return `- key "${job.kind}/${job.id}", file ${target(job)}: expected ${expected}`
    }).join('\n')
    const prompt = 'You are the art director of a retro synthwave car trading-card game. Open and look at each image file listed below. ' +
      'For each one judge: (1) is the subject recognisably the expected vehicle or object (body shape, proportions, key design cues)? ' +
      '(2) is it free of readable text, logos and watermarks? (3) does it fit a cohesive synthwave palette and read well as a small card? ' +
      'Answer ONLY with a JSON object mapping each key to {"ok": boolean, "score": 1-10, "issue": "short French note", "fix": "short English instruction for regenerating, empty if ok"}. ' +
      `Mark ok=false only for a wrong or badly deformed subject, visible text/logo, or clearly off-style image.\n${lines}`
    const settings = { permissions: { deny: ['command(*)', 'unsandboxed(*)', 'write_file(*)', 'read_url(*)', 'execute_url(*)', 'download_url(*)'] } }
    const result = await run('agy', ['--sandbox', '--mode', 'plan', '--disable-slash-commands', '--settings', JSON.stringify(settings),
      '--add-dir', join(root, 'src/assets'), '--print-timeout', '600s', '-p', prompt], { cwd: root })
    const json = result.stdout.match(/\{[\s\S]*\}/)?.[0]
    try {
      Object.assign(reviews, JSON.parse(json))
      await writeFile(reviewFile, JSON.stringify(reviews, null, 2))
      for (const job of batch) {
        const r = reviews[`${job.kind}/${job.id}`]
        console.log(`${r?.ok ? '✓' : '✗'} ${job.kind}/${job.id} ${r?.score ?? '?'}/10 ${r?.issue ?? 'pas de verdict'}`)
      }
    } catch {
      console.log(`✗ revue illisible pour ${batch.map(j => j.id).join(', ')}: ${result.stderr.slice(-300) || result.stdout.slice(-300)}`)
    }
  }
}

let list = jobs()
if (flag('review')) {
  await review(list)
} else {
  if (flag('redo')) list = list.filter(job => reviews[`${job.kind}/${job.id}`]?.ok === false)
  else if (!flag('force')) list = list.filter(job => !existsSync(target(job)))
  console.log(`${list.length} image(s) à générer (moteur ${engine}), ${parallel} en parallèle.`)
  if (flag('dry-run')) { for (const job of list) console.log(`· ${job.kind}/${job.id}`); process.exit(0) }
  const queue = [...list]
  await Promise.all(Array.from({ length: Math.min(parallel, queue.length) }, async () => {
    while (queue.length) {
      const stuck = engine === 'auto' || engine === 'agy' ? exhausted.has('agy') && exhausted.has('codex') : exhausted.has(engine)
      if (stuck) { console.log('· Quotas épuisés : arrêt. Relance la même commande plus tard pour reprendre.'); queue.length = 0; break }
      await generate(queue.shift())
    }
  }))
  const failed = list.filter(job => log[`${job.kind}/${job.id}`]?.status !== 'ok')
  console.log(`Terminé : ${list.length - failed.length} ok, ${failed.length} en échec.`)
  if (failed.length) process.exitCode = 1
}
