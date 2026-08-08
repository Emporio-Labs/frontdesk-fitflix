'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconVideo, IconX, IconMaximize, IconMinus } from '@tabler/icons-react'
import { liveSessionService } from '@/lib/services/live-session.service'

interface VideoConferenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // The ScheduledSession id — required to mint a room-bound, host-scoped
  // token from the backend. `roomID` below is kept only as a display
  // fallback/label; the room actually joined comes from the token response.
  sessionId: string
  roomID: string
  sessionTitle: string
  mode?: 'VideoConference' | 'LiveStreaming'
}

export function VideoConferenceModal({
  open,
  onOpenChange,
  sessionId,
  roomID,
  sessionTitle,
  mode = 'VideoConference',
}: VideoConferenceModalProps) {
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null)
  const zegoRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [staffDisplay, setStaffDisplay] = useState<string>('Admin Host')

  useEffect(() => {
    if (!open) {
      setIsMinimized(false)
      return
    }

    if (!sessionId || !containerElement) return

    let mounted = true

    const initVideoCall = async () => {
      try {
        setLoading(true)
        setError(null)

        const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt')

        // Room-bound, host-scoped token, minted by the backend against this
        // session's join window — replaces the old flow of guessing a staff
        // id/name from localStorage and minting an unbound token client-side.
        const access = await liveSessionService.getToken(sessionId)
        if (!mounted) return

        setStaffDisplay(access.userName)

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          access.appID,
          access.token,
          access.roomId,
          access.userId,
          access.userName,
        )

        const zp = ZegoUIKitPrebuilt.create(kitToken)
        zegoRef.current = zp

        const isLiveStream = mode === 'LiveStreaming'

        zp.joinRoom({
          container: containerElement,
          scenario: isLiveStream
            ? {
                mode: ZegoUIKitPrebuilt.LiveStreaming,
                // The SDK reads the role from scenario.config.role; both
                // fields are required for LiveStreaming, and a missing
                // liveStreamingMode fails setConfig() validation.
                config: {
                  role: ZegoUIKitPrebuilt.Host,
                  liveStreamingMode: ZegoUIKitPrebuilt.LiveStreamingMode.InteractiveLiveStreaming,
                },
              }
            : { mode: ZegoUIKitPrebuilt.VideoConference },
          showPreJoinView: false,
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: !isLiveStream,
          showUserList: true,
          showLayoutButton: true,
          // setConfig() hard-rejects showNonVideoUser === true under
          // LiveStreaming (it forces the value to false itself anyway).
          showNonVideoUser: !isLiveStream,
          onJoinRoom: () => {
            if (mounted) setLoading(false)
          },
          onLeaveRoom: () => {
            // Session ended
          },
          // A single token is capped at 2h server-side; a host running past
          // the scheduled end time needs a fresh one re-minted against the
          // still-open host window rather than getting disconnected.
          onTokenWillExpire: async () => {
            try {
              const renewed = await liveSessionService.getToken(sessionId)
              const renewedKitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
                renewed.appID,
                renewed.token,
                renewed.roomId,
                renewed.userId,
                renewed.userName,
              )
              // The bundled .d.ts claims renewToken() takes no arguments; the
              // real runtime call takes the new kit token string.
              ;(zp as any).renewToken(renewedKitToken)
            } catch {
              // Best-effort — if the class has genuinely ended, the token
              // simply expires and Zego disconnects the room as normal.
            }
          },
        } as any)

        if (mounted) setLoading(false)
      } catch (err: any) {
        console.error('ZEGOCLOUD Video Conference init error:', err)
        if (mounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Failed to connect to ZEGOCLOUD Video Conference suite.',
          )
          setLoading(false)
        }
      }
    }

    const timer = setTimeout(() => {
      initVideoCall()
    }, 100)

    return () => {
      mounted = false
      clearTimeout(timer)
      if (zegoRef.current) {
        try {
          zegoRef.current.destroy()
        } catch {
          /* ignore */
        }
        zegoRef.current = null
      }
    }
  }, [open, sessionId, containerElement, mode, sessionTitle])

  const handleLeaveCall = () => {
    setIsMinimized(false)
    if (zegoRef.current) {
      try {
        zegoRef.current.destroy()
      } catch {
        /* ignore */
      }
      zegoRef.current = null
    }
    onOpenChange(false)
  }

  if (!open) return null

  // Minimized Widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-2xl flex items-center gap-4 text-white animate-in fade-in slide-in-from-bottom-5">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <p className="text-xs font-semibold text-gray-200">{sessionTitle || 'Live Video Session'}</p>
            <p className="text-[10px] text-gray-400">Hosting as {staffDisplay}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 border-l border-gray-800 pl-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-gray-300 hover:text-white px-2"
            onClick={() => setIsMinimized(false)}
          >
            <IconMaximize className="w-3.5 h-3.5 mr-1" /> Expand
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs bg-red-600/80 hover:bg-red-600 text-white px-2"
            onClick={handleLeaveCall}
          >
            <IconX className="w-3.5 h-3.5 mr-1" /> Leave
          </Button>
        </div>
      </div>
    )
  }

  // Full Modal Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col bg-gray-950 border-gray-800 [&>button:last-child]:hidden [&>button.absolute]:hidden">
        <DialogHeader className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400">
              <IconVideo className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-white text-base font-semibold flex items-center gap-2">
                {sessionTitle || 'Group Class Video Conference'}
                <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-500/40 text-xs">
                  {mode === 'LiveStreaming' ? 'LIVE STREAM' : 'VIDEO CONFERENCE'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400">
                Hosting as: <span className="font-medium text-gray-200">{staffDisplay}</span>
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-gray-400 hover:text-white"
              onClick={() => setIsMinimized(true)}
            >
              <IconMinus className="w-4 h-4 mr-1" /> Minimize
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={handleLeaveCall}
            >
              <IconX className="w-4 h-4 mr-1" /> Leave Meeting
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 relative bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-red-400">
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : (
            <div ref={setContainerElement} className="h-full w-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
