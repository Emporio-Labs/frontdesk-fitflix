/**
 * Browser Audio Chime Engine for FX-35 Urgent Alerts
 * Uses Web Audio API — zero external mp3 files required, cross-browser reliable.
 */

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
 * Plays a double chime (harmonic two-tone notification beep)
 */
export function playAlertChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Tone 1: 587.33 Hz (D5)
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

    // Tone 2: 880 Hz (A5)
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
  } catch (err) {
    console.warn('[AudioChime] Unable to play sound', err)
  }
}

/**
 * Starts periodic chimes while open alerts exist (repeats every 8 seconds)
 */
export function startContinuousAlertNoise() {
  if (chimeIntervalId) return
  playAlertChime()
  chimeIntervalId = setInterval(() => {
    playAlertChime()
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
