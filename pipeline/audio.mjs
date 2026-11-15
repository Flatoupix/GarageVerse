import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = process.argv[2]
if (!source) {
  console.error('Usage : node pipeline/audio.mjs <dossier des MP3 exportés depuis Suno>')
  process.exit(1)
}

const assets = [
  { name: 'garage', id: '87e33393-a8b4-4249-b70c-36340794e38f', start: 6.385, end: 26.706, music: true },
  { name: 'race', id: '6436b626-0a18-4cee-b9f7-3160dd3b39c1', start: 9.298, end: 24.159, music: true },
  { name: 'tear', id: '83574643-77cd-4f38-a282-d3cba62d0950', start: 0.60, end: 0.95, gain: 4 },
  { name: 'revealLegend', id: '438f2340-2c55-4ba8-8b23-65ac9c820657', start: 0, end: 1.2 },
  { name: 'nitro', id: '2da40987-35f2-4733-a4c9-2de4779bb963', start: 0.105, end: 1.305 },
  { name: 'drift', id: '5c6ed88c-7934-4444-8a73-7023c98ce3b1', start: 0.110, end: 0.960, gain: -4 },
]

const inputDir = resolve(source)
const target = fileURLToPath(new URL('../src/assets/audio/', import.meta.url))
const staging = mkdtempSync(join(dirname(resolve(target)), '.audio-'))

try {
  for (const { name, id, start, end, music, gain = 0 } of assets) {
    const input = join(inputDir, `${id}.mp3`)
    const length = Number(execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', input,
    ], { encoding: 'utf8' }))
    if (!Number.isFinite(length) || length < end) throw new Error(`Prise trop courte : ${input}`)

    const duration = end - start
    const fade = music ? 0.003 : 0.045
    const filters = `volume=${gain}dB,afade=t=in:d=0.003,afade=t=out:st=${(duration - fade).toFixed(3)}:d=${fade}`
    execFileSync('ffmpeg', [
      '-nostdin', '-v', 'error', '-ss', String(start), '-i', input, '-t', duration.toFixed(3),
      '-vn', '-map_metadata', '-1', '-af', filters, '-ac', music ? '2' : '1', '-ar', '44100',
      '-c:a', 'libmp3lame', '-b:a', music ? '128k' : '80k', join(staging, `${name}.mp3`),
    ])
  }
  mkdirSync(target, { recursive: true })
  for (const { name } of assets) renameSync(join(staging, `${name}.mp3`), join(target, `${name}.mp3`))
  console.log(`${assets.length} fichiers montés dans ${target}`)
} finally {
  rmSync(staging, { recursive: true, force: true })
}
