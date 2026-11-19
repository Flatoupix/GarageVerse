import { audioContext, duckMusic, effectsOutput, playSample } from './audio'

export type Cue = 'tear' | 'flip' | 'drift' | 'collect' | 'legend' | 'revealLegend' | 'win' | 'lose' | 'nitro' | 'upgrade'
  | 'tap' | 'tick' | 'coin' | 'slam' | 'rare' | 'epic' | 'rev' | 'error' | 'whoosh' | 'debugCredits' | 'gearShift' | 'misfire'

function tone(ctx: AudioContext, at: number, freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.075, slideTo?: number, output = effectsOutput()) {
  const oscillator = ctx.createOscillator()
  const volume = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(freq, at)
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, at + duration)
  volume.gain.setValueAtTime(0.001, at)
  volume.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.022, duration / 3))
  volume.gain.exponentialRampToValueAtTime(0.001, at + duration)
  oscillator.connect(volume).connect(output)
  oscillator.start(at)
  oscillator.stop(at + duration)
}

function noise(ctx: AudioContext, at: number, duration: number, kind: BiquadFilterType, from: number, to: number, gain: number) {
  const length = Math.round(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2
  const source = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const volume = ctx.createGain()
  source.buffer = buffer
  filter.type = kind
  filter.frequency.setValueAtTime(from, at)
  filter.frequency.exponentialRampToValueAtTime(to, at + duration * 0.8)
  volume.gain.value = gain
  source.connect(filter).connect(volume).connect(effectsOutput())
  source.start(at)
}

function rareTone(ctx: AudioContext, at: number, output?: GainNode) {
  ;[440, 660, 880].forEach((n, i) => tone(ctx, at + i * 0.06, n, 0.28, 'triangle', 0.08, undefined, output))
}

export function playEditionCue() {
  try {
    const ctx = audioContext()
    const output = ctx.createGain()
    output.connect(effectsOutput())
    if (!playSample('rare', ctx, output)) rareTone(ctx, ctx.currentTime, output)
    return () => output.disconnect()
  } catch { /* Web Audio peut être indisponible. */ }
}

// Les effets synthétisés restent disponibles pendant le chargement ou en l’absence d’un fichier.
const cues: Record<Exclude<Cue, 'revealLegend'>, (c: AudioContext, t: number) => void> = {
  tear: (c, t) => noise(c, t, 0.22, 'bandpass', 2200, 650, 0.30),
  whoosh: (c, t) => noise(c, t, 0.26, 'bandpass', 500, 3200, 0.12),
  tap: (c, t) => tone(c, t, 880, 0.05, 'sine', 0.035, 620),
  tick: (c, t) => tone(c, t, 1400, 0.03, 'square', 0.012),
  // Son du raccourci des 1 000 crédits (fichier debugCredits.mp3) ; la pièce sert de secours pendant le chargement.
  debugCredits: (c, t) => { tone(c, t, 988, 0.08, 'square', 0.03); tone(c, t + 0.07, 1319, 0.22, 'square', 0.03) },
  coin: (c, t) => { tone(c, t, 988, 0.08, 'square', 0.03); tone(c, t + 0.07, 1319, 0.22, 'square', 0.03) },
  error: (c, t) => { tone(c, t, 170, 0.09, 'square', 0.04); tone(c, t + 0.1, 120, 0.14, 'square', 0.04) },
  gearShift: (c, t) => { noise(c, t, 0.07, 'bandpass', 1800, 600, 0.19); tone(c, t + 0.025, 130, 0.13, 'triangle', 0.11, 230) },
  misfire: (c, t) => { noise(c, t, 0.08, 'lowpass', 900, 250, 0.19); noise(c, t + 0.09, 0.10, 'lowpass', 650, 180, 0.13) },
  slam: (c, t) => { tone(c, t, 150, 0.28, 'sine', 0.32, 38); noise(c, t, 0.14, 'lowpass', 900, 120, 0.22) },
  flip: (c, t) => { noise(c, t, 0.12, 'bandpass', 900, 2600, 0.07); [440, 660].forEach((n, i) => tone(c, t + i * 0.035, n, 0.15)) },
  collect: (c, t) => [330, 440, 660].forEach((n, i) => tone(c, t + i * 0.09, n, 0.3)),
  upgrade: (c, t) => { [523, 659, 784, 1047].forEach((n, i) => tone(c, t + i * 0.07, n, 0.3, 'triangle')); noise(c, t, 0.3, 'highpass', 3000, 7000, 0.04) },
  rare: rareTone,
  epic: (c, t) => { tone(c, t, 98, 0.4, 'sine', 0.16, 49); [392, 523, 659, 1047].forEach((n, i) => tone(c, t + 0.05 + i * 0.07, n, 0.36, 'sawtooth', 0.05)) },
  legend: (c, t) => {
    tone(c, t, 82, 0.6, 'sine', 0.24, 36); noise(c, t, 0.4, 'lowpass', 1200, 100, 0.2)
    ;[262, 392, 523, 784].forEach((n, i) => tone(c, t + 0.08 + i * 0.09, n, 0.5, 'sawtooth', 0.06))
    ;[1568, 2093, 2637, 3136, 2637, 3136].forEach((n, i) => tone(c, t + 0.45 + i * 0.07, n, 0.25, 'sine', 0.03))
  },
  win: (c, t) => {
    [392, 494, 587, 784].forEach((n, i) => tone(c, t + i * 0.1, n, 0.34, 'sawtooth', 0.06))
    ;[784, 988, 1175].forEach(n => tone(c, t + 0.44, n, 0.7, 'triangle', 0.05))
  },
  lose: (c, t) => [330, 262, 196].forEach((n, i) => tone(c, t + i * 0.12, n, 0.34, 'triangle', 0.06)),
  drift: (c, t) => {
    tone(c, t, 82, 0.55, 'triangle', 0.075, 54); tone(c, t + 0.1, 123, 0.55, 'triangle'); tone(c, t + 0.2, 329, 0.55)
    noise(c, t + 0.15, 0.5, 'bandpass', 2600, 1200, 0.08)
  },
  nitro: (c, t) => { tone(c, t, 110, 0.5, 'sawtooth', 0.07, 880); tone(c, t + 0.05, 220, 0.45, 'triangle', 0.06, 1320); noise(c, t, 0.5, 'highpass', 800, 5000, 0.12) },
  rev: (c, t) => {
    tone(c, t, 62, 0.34, 'sawtooth', 0.09, 190); tone(c, t + 0.36, 80, 0.55, 'sawtooth', 0.1, 300)
    tone(c, t, 31, 0.34, 'square', 0.05, 95); tone(c, t + 0.36, 40, 0.55, 'square', 0.05, 150)
  },
}

export function playCue(cue: Cue) {
  try {
    const audio = audioContext()
    if (cue === 'debugCredits') duckMusic(2.3)
    else if (cue === 'revealLegend' || cue === 'legend' || cue === 'win' || cue === 'drift') duckMusic(0.9)
    else if (cue === 'tear' || cue === 'nitro') duckMusic(0.42)
    if (!playSample(cue, audio)) cues[cue === 'revealLegend' ? 'legend' : cue](audio, audio.currentTime)
  } catch {
    // The opening remains playable on browsers without Web Audio.
  }
}
