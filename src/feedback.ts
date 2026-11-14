type Cue = 'tear' | 'flip' | 'drift' | 'collect'

let audio: AudioContext | undefined

export function playCue(cue: Cue) {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume().catch(() => {})

    const now = audio.currentTime
    if (cue === 'tear') {
      const length = Math.round(audio.sampleRate * 0.22)
      const noise = audio.createBuffer(1, length, audio.sampleRate)
      const samples = noise.getChannelData(0)
      for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2
      const source = audio.createBufferSource()
      const filter = audio.createBiquadFilter()
      const volume = audio.createGain()
      source.buffer = noise
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(2200, now)
      filter.frequency.exponentialRampToValueAtTime(650, now + 0.18)
      volume.gain.value = 0.30
      source.connect(filter).connect(volume).connect(audio.destination)
      source.start()
      return
    }

    const notes = cue === 'drift' ? [82, 123, 329] : cue === 'collect' ? [330, 440, 660] : [440, 660]
    for (const [i, note] of notes.entries()) {
      const oscillator = audio.createOscillator()
      const volume = audio.createGain()
      const at = now + i * (cue === 'drift' ? 0.10 : 0.035)
      const duration = cue === 'drift' ? 0.55 : 0.15
      oscillator.type = cue === 'drift' && i < 2 ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(note, at)
      if (cue === 'drift' && i === 0) oscillator.frequency.exponentialRampToValueAtTime(54, at + duration)
      volume.gain.setValueAtTime(0.001, at)
      volume.gain.exponentialRampToValueAtTime(0.075, at + 0.022)
      volume.gain.exponentialRampToValueAtTime(0.001, at + duration)
      oscillator.connect(volume).connect(audio.destination)
      oscillator.start(at)
      oscillator.stop(at + duration)
    }
  } catch {
    // The opening remains playable on browsers without Web Audio.
  }
}
