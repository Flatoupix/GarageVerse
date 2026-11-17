import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = process.argv[2]
if (!source) {
  console.error('Usage : node pipeline/audio.mjs <dossier des MP3 exportés depuis Suno> [nom…]')
  process.exit(1)
}

const assets = [
  { name: 'garage', id: '87e33393-a8b4-4249-b70c-36340794e38f', start: 6.385, end: 26.706, music: true },
  { name: 'race', id: '6436b626-0a18-4cee-b9f7-3160dd3b39c1', start: 9.298, end: 24.159, music: true },
  { name: 'tear', id: '83574643-77cd-4f38-a282-d3cba62d0950', start: 0.60, end: 0.95, gain: 4 },
  { name: 'revealLegend', id: '438f2340-2c55-4ba8-8b23-65ac9c820657', start: 0, end: 1.2 },
  { name: 'nitro', id: '2da40987-35f2-4733-a4c9-2de4779bb963', start: 0.105, end: 1.305 },
  { name: 'drift', id: '5c6ed88c-7934-4444-8a73-7023c98ce3b1', start: 0.110, end: 0.960, gain: -4 },
  // Bruitages de l'interface et des récompenses (MCP Suno, outil sounds_create, 16 novembre). « upgrade » reste synthétisé.
  { name: 'flip', id: '9d472305-abe6-4e76-b5a8-a31e47068886', start: 0.33, end: 0.8, fade: 0.12, gain: -4 },
  { name: 'collect', id: '7655d248-6e3e-4d7c-a59b-653a17b2e269', start: 0.0, end: 0.85, fade: 0.15 },
  { name: 'legend', id: 'e18f5dab-c208-4ed3-b9de-31f62b9e6d4d', start: 0.05, end: 1.6, fade: 0.3 },
  { name: 'win', id: '58649995-12e8-48ca-8dd4-b367dafc2065', start: 0.0, end: 2.0, fade: 0.35 },
  { name: 'lose', id: '75cd12b8-5463-4095-bbed-16a329b241a2', start: 0.0, end: 2.7, fade: 0.3, gain: -2 },
  { name: 'slam', id: '2d0df94f-55e7-4f88-ae35-1f66b87c4a89', start: 0.15, end: 0.9, fade: 0.2, gain: -2 },
  { name: 'rare', id: 'ee58c0c0-7235-4ae0-b55e-c7576c096ccc', start: 0.05, end: 1.2, fade: 0.3 },
  { name: 'epic', id: '96ce59e8-0711-4168-a302-5f8f226880c6', start: 0.55, end: 1.9, fade: 0.3 },
  { name: 'rev', id: '4fb64998-e519-4da5-a9de-274dbd1da04d', start: 0.0, end: 1.8, fade: 0.3 },
  { name: 'whoosh', id: '4733e593-f8e4-4130-9327-5fa0bffab932', start: 0.2, end: 0.8, fade: 0.15, gain: -6 },
  { name: 'error', id: '1992c527-efe7-4831-a0b9-17085ad354d0', start: 0.04, end: 0.55, fade: 0.05 },
  { name: 'coin', id: '3fbe2017-c5bc-46a9-bb31-336d768beb3c', start: 0.0, end: 0.35, fade: 0.06, gain: -6 },
]

// Noms facultatifs après le dossier : ne monter que ces fichiers.
const only = process.argv.slice(3)
const selected = only.length ? assets.filter(a => only.includes(a.name)) : assets
const inputDir = resolve(source)
const target = fileURLToPath(new URL('../src/assets/audio/', import.meta.url))
const staging = mkdtempSync(join(dirname(resolve(target)), '.audio-'))

try {
  for (const { name, id, start, end, music, gain = 0, fade: tail } of selected) {
    const input = join(inputDir, `${id}.mp3`)
    const length = Number(execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', input,
    ], { encoding: 'utf8' }))
    if (!Number.isFinite(length) || length < end) throw new Error(`Prise trop courte : ${input}`)

    const duration = end - start
    const fade = music ? 0.003 : tail ?? 0.045
    const filters = `volume=${gain}dB,afade=t=in:d=0.003,afade=t=out:st=${(duration - fade).toFixed(3)}:d=${fade}`
    execFileSync('ffmpeg', [
      '-nostdin', '-v', 'error', '-ss', String(start), '-i', input, '-t', duration.toFixed(3),
      '-vn', '-map_metadata', '-1', '-af', filters, '-ac', music ? '2' : '1', '-ar', '44100',
      '-c:a', 'libmp3lame', '-b:a', music ? '128k' : '80k', join(staging, `${name}.mp3`),
    ])
  }
  mkdirSync(target, { recursive: true })
  for (const { name } of selected) renameSync(join(staging, `${name}.mp3`), join(target, `${name}.mp3`))
  console.log(`${selected.length} fichiers montés dans ${target}`)
} finally {
  rmSync(staging, { recursive: true, force: true })
}
