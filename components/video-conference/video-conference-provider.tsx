'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { VideoConferenceModal } from './video-conference-modal'

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
  /** ScheduledSession id — the per-occurrence id, never a class template id. */
  sessionId: string
  roomID: string
  sessionTitle: string
  mode?: 'VideoConference' | 'LiveStreaming'
}

type VideoConferenceValue = {
  startCall: (options: StartCallOptions) => void
  endCall: () => void
  /** The session currently being hosted, or null when no call is up. */
  activeSessionId: string | null
}

type CallState = StartCallOptions & { isOpen: boolean }

const IDLE: CallState = {
  isOpen: false,
  sessionId: '',
  roomID: '',
  sessionTitle: '',
  mode: 'VideoConference',
}

const VideoConferenceContext = createContext<VideoConferenceValue | null>(null)

export function VideoConferenceProvider({ children }: { children: React.ReactNode }) {
  const [call, setCall] = useState<CallState>(IDLE)

  const startCall = useCallback((options: StartCallOptions) => {
    setCall((prev) => {
      // Never swap a live room out from under the host — the members in it
      // would be dropped with no warning. Make them leave deliberately.
      if (prev.isOpen && prev.sessionId !== options.sessionId) {
        toast.error('Leave the current session before hosting another.')
        return prev
      }
      return { ...options, mode: options.mode ?? 'VideoConference', isOpen: true }
    })
  }, [])

  const endCall = useCallback(() => setCall(IDLE), [])

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
