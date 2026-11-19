type Track = 'garage' | 'race'
// Bruitages en fichier ; « upgrade », « tap » et « tick » restent synthétisés (src/feedback.ts).
type Sample = 'tear' | 'revealLegend' | 'nitro' | 'drift' | 'debugCredits'
  | 'flip' | 'collect' | 'legend' | 'win' | 'lose' | 'slam' | 'rare' | 'epic' | 'rev' | 'whoosh' | 'error' | 'coin'
type Asset = Track | Sample

const files = import.meta.glob<string>('./assets/audio/*.mp3', { eager: true, query: '?url', import: 'default' })
const samples: Sample[] = ['tear', 'revealLegend', 'nitro', 'drift', 'debugCredits',
  'flip', 'collect', 'legend', 'win', 'lose', 'slam', 'rare', 'epic', 'rev', 'whoosh', 'error', 'coin']
const musicLevel = 0.24
const transitionSeconds = 0.22
const buffers = new Map<Asset, AudioBuffer>()
const downloads = new Map<Asset, Promise<AudioBuffer | undefined>>()

function urlOf(asset: Asset) { return files[`./assets/audio/${asset}.mp3`] }
export const audioAssets = new Set(Object.values(files))
const audioBytes = new Map<string, Promise<ArrayBuffer>>()

export function preloadAudio(url: string, signal?: AbortSignal) {
  let pending = audioBytes.get(url)
  if (!pending) {
    pending = fetch(url, { signal })
      .then(response => {
        if (!response.ok) throw new Error(`Audio HTTP ${response.status}`)
        return response.arrayBuffer()
      })
      .catch(error => { audioBytes.delete(url); throw error })
    audioBytes.set(url, pending)
  }
  return pending
}

export const hasMusic = Boolean(urlOf('garage') || urlOf('race'))

let audio: AudioContext | undefined
let musicBus: GainNode | undefined
let effectsBus: GainNode | undefined
let effectsEnabled = true
let unlocked = false
let wanted: Track | undefined
let active: { track: Track; source: AudioBufferSourceNode; gain: GainNode } | undefined

export function audioContext() {
  if (!audio) {
    audio = new AudioContext()
    musicBus = audio.createGain()
    musicBus.gain.value = musicLevel
    musicBus.connect(audio.destination)
    effectsBus = audio.createGain()
    effectsBus.gain.value = Number(effectsEnabled)
    effectsBus.connect(audio.destination)
  }
  return audio
}

export function effectsOutput() { return effectsBus! }

export function enableEffects(enabled: boolean) {
  effectsEnabled = enabled
  if (effectsBus && audio) effectsBus.gain.setTargetAtTime(Number(enabled), audio.currentTime, 0.012)
}

function load(asset: Asset) {
  const url = urlOf(asset)
  if (!url) return
  let pending = downloads.get(asset)
  if (!pending) {
    const ctx = audioContext()
    pending = preloadAudio(url).catch(error => {
      if (error instanceof DOMException && error.name === 'AbortError') return preloadAudio(url)
      throw error
    })
      .then(bytes => {
        audioBytes.delete(url)
        return ctx.decodeAudioData(bytes)
      })
      .then(buffer => { buffers.set(asset, buffer); return buffer })
      .catch(() => { downloads.delete(asset); return undefined })
    downloads.set(asset, pending)
  }
  return pending
}

export function unlockAudio() {
  try {
    const ctx = audioContext()
    const ready = () => {
      if (unlocked) return
      unlocked = true
      for (const sample of samples) load(sample)
      void syncMusic()
    }
    if (ctx.state === 'running') ready()
    else void ctx.resume().then(ready, () => {})
  } catch { /* Web Audio peut être indisponible. */ }
}

export function playSample(cue: string, ctx: AudioContext) {
  const sample = samples.find(name => name === cue)
  const buffer = sample && buffers.get(sample)
  if (!buffer) return false
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(effectsOutput())
  source.start()
  return true
}

export function duckMusic(seconds: number) {
  if (!audio || !musicBus) return
  const at = audio.currentTime
  const gain = musicBus.gain
  gain.cancelScheduledValues(at)
  gain.setTargetAtTime(0.09, at, 0.015)
  gain.setTargetAtTime(musicLevel, at + seconds, 0.15)
}

export function setMusicTrack(track?: Track) {
  wanted = track
  void syncMusic()
}

export function refreshMusicVisibility() { void syncMusic() }

async function syncMusic() {
  if (!unlocked) return
  const track = document.hidden ? undefined : wanted
  if (active?.track === track) return
  const ctx = audioContext()
  if (active) {
    active.gain.gain.cancelScheduledValues(ctx.currentTime)
    active.gain.gain.setTargetAtTime(0, ctx.currentTime, transitionSeconds / 4)
    active.source.stop(ctx.currentTime + transitionSeconds)
    active = undefined
  }
  if (!track) return

  const buffer = await load(track)
  if (!buffer || wanted !== track || document.hidden || (active as { track: Track } | undefined)?.track === track) return
  const source = ctx.createBufferSource()
  const gain = ctx.createGain()
  source.buffer = buffer
  source.loop = true
  source.connect(gain).connect(musicBus!)
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(1, ctx.currentTime + transitionSeconds)
  source.start()
  active = { track, source, gain }
}
