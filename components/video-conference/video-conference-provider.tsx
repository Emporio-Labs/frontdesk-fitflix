'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { VideoConferenceModal, type VideoConferenceMode } from './video-conference-modal'

/**
 * Keeps the hosted ZEGOCLOUD room alive for as long as the host wants it.
 *
 * The call used to be rendered by whichever page opened it, which meant any
 * navigation away from that page unmounted the modal and tore the room down
 * mid-class. Mounting it here — once, from the root layout — decouples the
 * call's lifetime from the route: the host can minimize it and then work
 * anywhere in Frontdesk while audio and video keep running. Only an explicit
 * leave, a logout (which hard-navigates) or a page reload ends it.
 *
 * Pages open a call through `startCall` and otherwise render nothing.
 */

export type StartCallOptions = {
  /**
   * Whatever the backend's `resolveSessionAccess` can resolve: a
   * ScheduledSession id (group classes — the per-occurrence id, never a class
   * template id), a UnifiedBooking id (trainer 1-on-1), or a
   * NutritionistBooking id. One token endpoint serves all three.
   */
  sessionId: string
  roomID: string
  sessionTitle: string
  mode?: VideoConferenceMode
  /** Join with camera and mic off — the consultation default. */
  joinMuted?: boolean
  /** Run after the call ends, however it ends. Typically a list refetch. */
  onEnded?: () => void
}

type CallOptions = Omit<StartCallOptions, 'onEnded'>

type VideoConferenceValue = {
  startCall: (options: StartCallOptions) => void
  endCall: () => void
  /** The session currently being hosted, or null when no call is up. */
  activeSessionId: string | null
}

type CallState = CallOptions & { isOpen: boolean }

const IDLE: CallState = {
  isOpen: false,
  sessionId: '',
  roomID: '',
  sessionTitle: '',
  mode: 'VideoConference',
  joinMuted: false,
}

const VideoConferenceContext = createContext<VideoConferenceValue | null>(null)

export function VideoConferenceProvider({ children }: { children: React.ReactNode }) {
  const [call, setCall] = useState<CallState>(IDLE)
  // Held in a ref, not in state: the opening page re-renders constantly (query
  // refetches, filter changes) and a callback captured in state would go stale.
  const onEndedRef = useRef<(() => void) | null>(null)

  const startCall = useCallback((options: StartCallOptions) => {
    const { onEnded, ...rest } = options
    setCall((prev) => {
      // Never swap a live room out from under the host — the members in it
      // would be dropped with no warning. Make them leave deliberately.
      if (prev.isOpen && prev.sessionId !== rest.sessionId) {
        toast.error('Leave the current session before hosting another.')
        return prev
      }
      onEndedRef.current = onEnded ?? null
      return {
        ...rest,
        mode: rest.mode ?? 'VideoConference',
        joinMuted: rest.joinMuted ?? false,
        isOpen: true,
      }
    })
  }, [])

  const endCall = useCallback(() => {
    setCall(IDLE)
    const onEnded = onEndedRef.current
    onEndedRef.current = null
    onEnded?.()
  }, [])

  const value = useMemo<VideoConferenceValue>(
    () => ({
      startCall,
      endCall,
      activeSessionId: call.isOpen ? call.sessionId : null,
    }),
    [startCall, endCall, call.isOpen, call.sessionId],
  )

  return (
    <VideoConferenceContext.Provider value={value}>
      {children}
      <VideoConferenceModal
        open={call.isOpen}
        onOpenChange={(open) => {
          if (!open) endCall()
        }}
        sessionId={call.sessionId}
        roomID={call.roomID}
        sessionTitle={call.sessionTitle}
        mode={call.mode}
        joinMuted={call.joinMuted}
      />
    </VideoConferenceContext.Provider>
  )
}

export function useVideoConference(): VideoConferenceValue {
  const ctx = useContext(VideoConferenceContext)
  if (!ctx) {
    throw new Error('useVideoConference must be used within a VideoConferenceProvider')
  }
  return ctx
}
