/**
 * Browser Audio Chime Engine for FX-35 & FX-36 Urgent Alerts
 * Uses Web Audio API — zero external mp3 files required, cross-browser reliable.
 */

export type SoundType = 'chime' | 'siren' | 'pulse' | 'bell'

let audioCtx: AudioContext | null = null
let chimeIntervalId: any = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Plays a specific sound pattern synthesized in real time (FX-36.1)
 */
export function playSound(type: SoundType = 'chime') {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    if (type === 'siren') {
      // Urgent oscillating siren (trainer missing / emergency)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(700, now)
      osc.frequency.linearRampToValueAtTime(1000, now + 0.25)
      osc.frequency.linearRampToValueAtTime(700, now + 0.5)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.6)
    } else if (type === 'pulse') {
      // Rapid triple pulse beep
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.12
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(800, t)
        gain.gain.setValueAtTime(0.2, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.08)
      }
    } else if (type === 'bell') {
      // Resonant single bell tone
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(659.25, now) // E5
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.9)
    } else {
      // Default: two-tone harmonic chime
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, now)
      gain1.gain.setValueAtTime(0.2, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.35)

      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(880, now + 0.15)
      gain2.gain.setValueAtTime(0.25, now + 0.15)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.15)
      osc2.stop(now + 0.6)
    }
  } catch (err) {
    console.warn('[AudioChime] Unable to play sound', err)
  }
}

export function playAlertChime() {
  playSound('chime')
}

/**
 * Starts periodic chimes while open alerts exist (repeats every 8 seconds)
 */
export function startContinuousAlertNoise(soundType: SoundType = 'chime') {
  if (chimeIntervalId) return
  playSound(soundType)
  chimeIntervalId = setInterval(() => {
    playSound(soundType)
  }, 8000)
}

/**
 * Stops alert sound immediately upon acknowledgment (FX-35.4)
 */
export function stopContinuousAlertNoise() {
  if (chimeIntervalId) {
    clearInterval(chimeIntervalId)
    chimeIntervalId = null
  }
}
