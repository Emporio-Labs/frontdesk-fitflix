'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  IconArrowLeft,
  IconBroadcast,
  IconLoader2,
  IconPlayerStop,
  IconUsers,
  IconVideo,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { liveSessionService, type LiveSession } from '@/lib/services/live-session.service'

/**
 * GCLS-27: Full-screen Zego hosting page.
 *
 * Session-type dispatch:
 *   - sessionType == "group_class"  → ZegoUIKitPrebuilt VideoConference (symmetric)
 *   - sessionType == "live_stream"  → ZegoUIKitPrebuilt LiveStreaming (host mode)
 *
 * The Zego SDK is loaded dynamically (client-side only) because it depends on
 * browser APIs. We use next/dynamic with ssr:false, or a lazy import.
 */

interface ZegoState {
  loading: boolean
  error: string | null
  joined: boolean
}

export default function LiveSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params?.id as string

  const containerRef = useRef<HTMLDivElement>(null)
  const zegoRef = useRef<any>(null)

  const [session, setSession] = useState<LiveSession | null>(null)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [zegoState, setZegoState] = useState<ZegoState>({
    loading: true,
    error: null,
    joined: false,
  })

  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [ending, setEnding] = useState(false)

  // Fetch session details
  useEffect(() => {
    if (!sessionId || sessionId === 'undefined') {
      setFetchError('Invalid or missing session ID')
      setFetchLoading(false)
      return
    }

    setSession({
      id: sessionId,
      classId: '',
      className: 'Live Video Session',
      sessionType: 'group_class',
      instructor: 'Coach',
      instructorUserId: null,
      sessionDate: new Date().toISOString(),
      startTime: '',
      endTime: '',
      startsAtUtc: null,
      endsAtUtc: null,
      deliveryType: 'ONLINE',
      capacity: 2,
      currentBookings: 1,
      remainingCapacity: 0,
      status: 'SCHEDULED',
      roomStatus: 'READY',
      roomExpiresAt: null,
      streamRoomId: sessionId,
      videoConferenceId: sessionId,
      creditCost: 0,
      durationMinutes: 45,
      hostLiveAt: null,
    })
    setFetchLoading(false)
  }, [sessionId])

  const hasJoinedRef = useRef<string | null>(null)

  // Initialize Zego SDK
  useEffect(() => {
    if (!session || !containerRef.current) return
    if (hasJoinedRef.current === session.id) return

    let cancelled = false

    const initZego = async () => {
      try {
        setZegoState({ loading: true, error: null, joined: false })

        // Dynamic import — SSR-safe
        const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt')

        if (cancelled) return

        // Room-bound, role-scoped, time-windowed
        const access = await liveSessionService.getToken(session.id)

        if (cancelled) return

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          access.appID,
          access.token,
          access.roomId,
          access.userId,
          access.userName,
        )

        if (zegoRef.current) {
          try {
            zegoRef.current.destroy()
          } catch {}
          zegoRef.current = null
        }

        const zp = ZegoUIKitPrebuilt.create(kitToken)
        zegoRef.current = zp
        hasJoinedRef.current = session.id

        const isLiveStream = session.sessionType === 'live_stream'

        zp.joinRoom({
          container: containerRef.current!,
          showPreJoinView: false,
          scenario: isLiveStream
            ? {
                mode: ZegoUIKitPrebuilt.LiveStreaming,
                config: {
                  role: (ZegoUIKitPrebuilt as any).Host,
                  liveStreamingMode: ZegoUIKitPrebuilt.LiveStreamingMode.InteractiveLiveStreaming,
                },
              }
            : { mode: ZegoUIKitPrebuilt.VideoConference },
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: true,
          showLayoutButton: true,
          showUserList: true,
          showNonVideoUser: true,
          showPinButton: true,
          // NB: there used to be a `videoViewMode: 1` here, described as
          // "AspectFit: prevents cropping". No such key exists in the UIKit —
          // it was silently ignored (the `as any` cast below is what let it
          // compile). The supported key is `videoScreenConfig.objectFit`, which
          // already defaults to "contain"; portrait handling for the surface
          // the admin actually uses lives in the group-class modal instead.
          maxUsers: session.capacity || 50,
          onJoinRoom: () => {
            if (cancelled) return
            setZegoState({ loading: false, error: null, joined: true })
            window.setTimeout(() => {
              window.dispatchEvent(new Event('resize'))
            }, 300)
            window.setTimeout(() => {
              window.dispatchEvent(new Event('resize'))
            }, 800)
            liveSessionService.reportHostPresence(session.id).catch((err) => {
              console.error('Failed to report host presence:', err)
            })
          },
          onLeaveRoom: () => {
            if (cancelled) return
            setZegoState((prev) => ({ ...prev, joined: false }))
          },
          onTokenWillExpire: async () => {
            try {
              const renewed = await liveSessionService.getToken(session.id)
              const renewedKitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
                renewed.appID,
                renewed.token,
                renewed.roomId,
                renewed.userId,
                renewed.userName,
              )
              ;(zp as any).renewToken(renewedKitToken)
            } catch (err: any) {
              toast.error(
                err?.response?.data?.message ||
                  err?.message ||
                  'Could not renew session — the class may have ended.',
              )
            }
          },
        } as any)
      } catch (err: any) {
        if (cancelled) return
        console.error('Zego init error:', err)
        setZegoState({
          loading: false,
          error:
            err?.response?.data?.message ||
            err?.message ||
            'Failed to initialize video. Make sure @zegocloud/zego-uikit-prebuilt is installed.',
          joined: false,
        })
      }
    }

    initZego()

    return () => {
      cancelled = true
      hasJoinedRef.current = null
      if (zegoRef.current) {
        try {
          zegoRef.current.destroy()
        } catch {}
        zegoRef.current = null
      }
    }
  }, [session])

  // End session handler
  const handleEndSession = useCallback(async () => {
    if (!session) return
    setEnding(true)
    try {
      const result = await liveSessionService.endSession(session.id)
      if (result.kickErrors?.length) {
        toast.warning(
          `Session ended, but ${result.kickErrors.length} participant(s) may still be connected — they'll be dropped once their token expires.`,
        )
      } else {
        toast.success('Session ended successfully. Status updated to COMPLETED.')
      }

      // Destroy Zego instance
      if (zegoRef.current) {
        try {
          zegoRef.current.destroy()
        } catch { /* ignore */ }
        zegoRef.current = null
      }

      router.push('/admin/therapies?tab=live-sessions')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to end session')
    } finally {
      setEnding(false)
      setEndDialogOpen(false)
    }
  }, [session, router])

  // Handle browser back/close warning
  useEffect(() => {
    if (!zegoState.joined) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'You are in an active session. Are you sure you want to leave?'
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [zegoState.joined])

  // --- Loading state ---
  if (fetchLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="text-center text-white space-y-4">
          <IconLoader2 className="mx-auto h-10 w-10 animate-spin" />
          <p className="text-lg">Loading session...</p>
        </div>
      </div>
    )
  }

  // --- Error state ---
  if (fetchError || !session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-950">
        <div className="text-center text-white space-y-4">
          <p className="text-lg text-red-400">{fetchError || 'Session not found'}</p>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/therapies')}
            className="text-white border-white/30 hover:bg-white/10"
          >
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-screen w-full flex-col bg-gray-950 overflow-hidden">
      {/* Top bar */}
      <div className="flex h-[52px] items-center justify-between gap-4 bg-gray-900/90 px-4 py-2 backdrop-blur-sm z-20 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={() => {
              if (zegoState.joined) {
                setEndDialogOpen(true)
              } else {
                router.push('/admin/therapies?tab=live-sessions')
              }
            }}
          >
            <IconArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{session.className}</span>
            <Badge
              className={
                session.sessionType === 'live_stream'
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                  : 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
              }
            >
              {session.sessionType === 'live_stream' ? (
                <><IconBroadcast className="mr-1 h-3 w-3" /> Live Streaming</>
              ) : (
                <><IconVideo className="mr-1 h-3 w-3" /> Video Conference</>
              )}
            </Badge>
          </div>

          <div className="hidden items-center gap-2 text-xs text-gray-400 sm:flex">
            {session.capacity <= 2 ? (
              <Badge variant="outline" className="border-white/20 text-gray-300">
                1-on-1 PT Session
              </Badge>
            ) : (
              <>
                <IconUsers className="h-3.5 w-3.5" />
                <span>{session.currentBookings}/{session.capacity} booked</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {zegoState.joined && (
            <div className="mr-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-400">LIVE</span>
            </div>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setEndDialogOpen(true)}
            disabled={!zegoState.joined}
          >
            <IconPlayerStop className="mr-1 h-4 w-4" />
            End Session
          </Button>
        </div>
      </div>

      {/* Zego container */}
      <div className="flex-1 relative w-full h-[calc(100vh-52px)] min-h-0 overflow-hidden">
        {zegoState.loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-950">
            <div className="text-center text-white space-y-4">
              <IconLoader2 className="mx-auto h-10 w-10 animate-spin" />
              <p className="text-lg">Connecting to {session.sessionType === 'live_stream' ? 'Live Stream' : 'Video Conference'}...</p>
              <p className="text-sm text-gray-400">Room ID: {session.videoConferenceId}</p>
            </div>
          </div>
        )}

        {zegoState.error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-950">
            <div className="text-center text-white space-y-4 max-w-md">
              <p className="text-lg text-red-400">Connection Error</p>
              <p className="text-sm text-gray-400">{zegoState.error}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="text-white border-white/30 hover:bg-white/10"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* End Session Confirmation Dialog */}
      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">End Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this class for everyone? All participants will be disconnected and the session will be marked as completed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEndDialogOpen(false)} disabled={ending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEndSession} disabled={ending}>
              {ending ? (
                <><IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Ending...</>
              ) : (
                <><IconPlayerStop className="mr-2 h-4 w-4" /> End for Everyone</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
