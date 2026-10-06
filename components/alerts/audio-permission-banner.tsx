'use client'

import { useEffect, useState } from 'react'
import { IconVolume, IconVolumeOff, IconX } from '@tabler/icons-react'
import {
  isAudioContextUnlocked,
  subscribeAudioUnlock,
  unlockAudioContext,
} from '@/lib/audio-chime'

/**
 * FX-38.3: Browser Autoplay Audio Permission Banner
 * Browsers block Web Audio until the user interacts with the page.
 * Prompts staff to click once after signing in and shows a visible banner until they do.
 */
export function AudioPermissionBanner() {
  const [isUnlocked, setIsUnlocked] = useState(true)

  useEffect(() => {
    // Check initial state and subscribe
    setIsUnlocked(isAudioContextUnlocked())
    const unsubscribe = subscribeAudioUnlock((unlocked) => {
      setIsUnlocked(unlocked)
    })
    return () => unsubscribe()
  }, [])

  if (isUnlocked) return null

  return (
    <div
      role="alert"
      onClick={() => unlockAudioContext()}
      className="sticky top-0 z-50 flex cursor-pointer items-center justify-between gap-3 border-b border-amber-300 bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-amber-600"
    >
      <div className="flex items-center gap-2">
        <IconVolumeOff className="h-4 w-4 shrink-0 animate-bounce text-amber-100" />
        <span>
          Operational audio alerts are currently paused by your browser. Click anywhere on this screen to enable audible sirens and chimes.
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          unlockAudioContext()
        }}
        className="flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-white/30"
      >
        <IconVolume className="h-3.5 w-3.5" />
        <span>Enable Sound</span>
      </button>
    </div>
  )
}
