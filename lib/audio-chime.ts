/**
 * Browser Audio Chime Engine for FX-35, FX-36 & FX-38 Urgent Alerts
 * Uses Web Audio API — zero external mp3 files required, cross-browser reliable.
 */

export type SoundType = 'chime' | 'siren' | 'pulse' | 'bell'

let audioCtx: AudioContext | null = null
let chimeIntervalId: any = null
let isUnlocked = false
const unlockListeners: Array<(unlocked: boolean) => void> = []

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  return audioCtx
}

/**
 * Checks if browser audio autoplay is unlocked (FX-38.3)
 */
export function isAudioContextUnlocked(): boolean {
  if (typeof window === 'undefined') return true
  const ctx = getAudioContext()
  if (!ctx) return false
  return ctx.state === 'running'
}

/**
 * Subscribes to changes in audio unlock state (for the FX-38.3 sound-is-off banner)
 */
export function subscribeAudioUnlock(callback: (unlocked: boolean) => void) {
  unlockListeners.push(callback)
  callback(isAudioContextUnlocked())
  return () => {
    const idx = unlockListeners.indexOf(callback)
    if (idx !== -1) unlockListeners.splice(idx, 1)
  }
}

function notifyUnlockListeners(unlocked: boolean) {
  isUnlocked = unlocked
  unlockListeners.forEach((cb) => {
    try {
      cb(unlocked)
    } catch {}
  })
}

/**
 * Resumes audio context on user interaction (FX-38.3)
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext()
  if (!ctx) return false
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {}
  }
  const running = ctx.state === 'running'
  notifyUnlockListeners(running)
  return running
}

// Global user interaction listener to auto-unlock audio on first click or tap
if (typeof window !== 'undefined') {
  const autoUnlockHandler = () => {
    unlockAudioContext().then((unlocked) => {
      if (unlocked) {
        window.removeEventListener('click', autoUnlockHandler)
        window.removeEventListener('keydown', autoUnlockHandler)
        window.removeEventListener('touchstart', autoUnlockHandler)
      }
    })
  }

  window.addEventListener('click', autoUnlockHandler, { passive: true })
  window.addEventListener('keydown', autoUnlockHandler, { passive: true })
  window.addEventListener('touchstart', autoUnlockHandler, { passive: true })
}

/**
 * Synthesizes and plays a specific sound pattern in real time (FX-36.1, FX-38.1, FX-38.2)
 */
export function playSound(type: SoundType = 'chime') {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    if (type === 'siren') {
      // Urgent oscillating siren (critical alarms)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(700, now)
      osc.frequency.linearRampToValueAtTime(1050, now + 0.25)
      osc.frequency.linearRampToValueAtTime(700, now + 0.5)
      gain.gain.setValueAtTime(0.25, now)
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

/**
 * FX-38.2: Warnings play a single chime and can be dismissed; info alerts are silent.
 */
export function playSingleWarningChime(soundType: SoundType = 'chime') {
  playSound(soundType)
}

/**
 * FX-38.1: Critical alerts play a repeating sound every 6 seconds until acknowledged.
 */
export function startContinuousAlertNoise(soundType: SoundType = 'siren') {
  if (chimeIntervalId) return
  playSound(soundType)
  chimeIntervalId = setInterval(() => {
    playSound(soundType)
  }, 6000)
}

/**
 * Stops alert repeating sound immediately upon acknowledgment (FX-35.4, FX-38.4)
 */
export function stopContinuousAlertNoise() {
  if (chimeIntervalId) {
    clearInterval(chimeIntervalId)
    chimeIntervalId = null
  }
}
