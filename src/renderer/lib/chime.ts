/** A soft three-note chime, synthesised so no audio file is needed. */
export function playChime(): void {
  const context = new AudioContext()
  const notes = [
    { frequency: 659.25, at: 0 },
    { frequency: 880, at: 0.18 },
    { frequency: 1318.5, at: 0.36 }
  ]

  for (const { frequency, at } of notes) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime + at
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.4)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 1.5)
  }

  setTimeout(() => context.close(), 2500)
}
