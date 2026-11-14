export type Cue = 'tear' | 'flip' | 'drift' | 'collect' | 'legend' | 'win' | 'lose' | 'nitro' | 'upgrade'

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

    const notes = {
      drift: [82, 123, 329], collect: [330, 440, 660], flip: [440, 660], legend: [262, 392, 523, 784],
      win: [392, 494, 587, 784], lose: [330, 262, 196], nitro: [110, 220, 440], upgrade: [523, 659, 784],
    }[cue]
    const sweep = cue === 'drift' || cue === 'nitro'
    for (const [i, note] of notes.entries()) {
      const oscillator = audio.createOscillator()
      const volume = audio.createGain()
      const at = now + i * (sweep ? 0.10 : cue === 'flip' ? 0.035 : 0.09)
      const duration = sweep ? 0.55 : cue === 'flip' ? 0.15 : 0.3
      oscillator.type = sweep && i < 2 ? 'triangle' : cue === 'legend' || cue === 'win' ? 'sawtooth' : 'sine'
      oscillator.frequency.setValueAtTime(note, at)
      if (sweep && i === 0) oscillator.frequency.exponentialRampToValueAtTime(cue === 'nitro' ? 880 : 54, at + duration)
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
