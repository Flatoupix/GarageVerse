import { readdir, readFile, stat, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { zipSync } from 'fflate'

const root = path.resolve('dist-itch')
const output = path.resolve('artifacts/garageverse-itch.zip')
const maxFiles = 1000
const maxExtractedBytes = 500 * 1024 * 1024
const maxSingleFileBytes = 200 * 1024 * 1024
const maxPathLength = 240

async function walk(directory, parent = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relative = path.posix.join(parent, entry.name)
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(absolute, relative))
    else if (entry.isFile()) files.push({ relative, absolute })
  }
  return files
}

function assertLocalReference(reference, fromFile, fileSet) {
  if (!reference || /^(?:[a-z]+:|\/\/|#|data:)/i.test(reference)) return
  const clean = decodeURIComponent(reference.split(/[?#]/, 1)[0])
  if (clean.startsWith('/')) throw new Error(`Chemin absolu incompatible avec itch.io : ${fromFile} → ${reference}`)
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), clean))
  if (!fileSet.has(resolved)) throw new Error(`Ressource absente du ZIP : ${fromFile} → ${reference} (${resolved})`)
}

const entries = await walk(root)
const fileSet = new Set(entries.map(entry => entry.relative))
if (!fileSet.has('index.html')) throw new Error('dist-itch/index.html est absent : itch.io en a besoin à la racine du ZIP.')

// Vite lists every imported chunk, image, font and audio file here. Checking this
// catches assets omitted by an incorrect publicDir/base configuration.
const manifestPath = '.vite/manifest.json'
if (!fileSet.has(manifestPath)) throw new Error('Manifeste Vite introuvable dans dist-itch/.vite/manifest.json.')
const manifest = JSON.parse(await readFile(path.join(root, manifestPath), 'utf8'))
for (const [source, item] of Object.entries(manifest)) {
  for (const file of [item.file, ...(item.css ?? []), ...(item.assets ?? [])]) {
    if (file && !fileSet.has(file)) throw new Error(`Fichier référencé par Vite absent : ${source} → ${file}`)
  }
}

for (const { relative, absolute } of entries) {
  const content = await readFile(absolute)
  const source = content.toString('utf8')
  if (relative.endsWith('.html')) {
    for (const match of source.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) assertLocalReference(match[1], relative, fileSet)
  }
  if (relative.endsWith('.css')) {
    for (const match of source.matchAll(/url\(["']?([^"')]+)["']?\)/g)) assertLocalReference(match[1].trim(), relative, fileSet)
    for (const match of source.matchAll(/@import\s+["']([^"']+)["']/g)) assertLocalReference(match[1], relative, fileSet)
  }
  if (relative.endsWith('.js')) {
    for (const match of source.matchAll(/new URL\(["']([^"']+)["'],\s*import\.meta\.url\)/g)) assertLocalReference(match[1], relative, fileSet)
  }
}

const packaged = entries.filter(entry => entry.relative !== manifestPath && entry.relative !== 'sw.js')
if (packaged.length > maxFiles) throw new Error(`Le package contient ${packaged.length} fichiers (limite itch.io : ${maxFiles}).`)
let extractedBytes = 0
const zipFiles = {}
for (const entry of packaged) {
  const info = await stat(entry.absolute)
  if (entry.relative.length > maxPathLength) throw new Error(`Chemin trop long pour itch.io (${entry.relative.length} caractères) : ${entry.relative}`)
  if (info.size > maxSingleFileBytes) throw new Error(`Fichier trop volumineux pour itch.io : ${entry.relative} (${info.size} octets).`)
  extractedBytes += info.size
  zipFiles[entry.relative] = new Uint8Array(await readFile(entry.absolute))
}
if (extractedBytes > maxExtractedBytes) throw new Error(`Le package décompressé pèse ${formatBytes(extractedBytes)} (limite itch.io : 500 Mio).`)

const archive = zipSync(zipFiles, { level: 6 })
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, archive)
console.log(`Package itch.io prêt : ${output}`)
console.log(`${packaged.length} fichiers · ${formatBytes(extractedBytes)} décompressés · ${formatBytes(archive.byteLength)} compressés`)

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} Mio`
}
