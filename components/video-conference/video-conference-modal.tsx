'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconVideo, IconX, IconMaximize, IconMinus } from '@tabler/icons-react'
import { liveSessionService } from '@/lib/services/live-session.service'
import { cn } from '@/lib/utils'

interface VideoConferenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  // Identifies which `${sessionId}|${mode}` the live zegoRef.current belongs
  // to, so minimizing/restoring (which doesn't touch sessionId/mode) never
  // re-triggers a join — only an actual session/mode change does.
  const joinedKeyRef = useRef<string | null>(null)
  const settleResizeTimerRef = useRef<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<{
    message: string
    code?: string
    startsAt?: string
    endsAt?: string
  } | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showMinimizeConfirm, setShowMinimizeConfirm] = useState(false)
  const [staffDisplay, setStaffDisplay] = useState<string>('Admin Host')

  const clearSettleResizeTimer = useCallback(() => {
    if (settleResizeTimerRef.current !== null) {
      window.clearTimeout(settleResizeTimerRef.current)
      settleResizeTimerRef.current = null
    }
  }, [])

  // The ZEGOCLOUD desktop room measures its own footer/video layout on mount
  // and on window resize. It mounts while the dialog's open/restore animation
  // still has a transform on it, so that first measurement can settle a beat
  // too small (footer clipped). Nudging a resize event once the 200ms
  // animation is done makes it recompute against the real, settled box.
  const scheduleSettleResize = useCallback((delay = 400) => {
    clearSettleResizeTimer()
    settleResizeTimerRef.current = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
      settleResizeTimerRef.current = null
    }, delay)
  }, [clearSettleResizeTimer])

  const destroyZego = useCallback(() => {
    clearSettleResizeTimer()
    if (zegoRef.current) {
      try {
        zegoRef.current.destroy()
      } catch {
        // ignore cleanup errors
      }
      zegoRef.current = null
    }
    joinedKeyRef.current = null
  }, [clearSettleResizeTimer])

  // Unmount-only: the actual leave/destroy for a live session happens either
  // here (component unmounts) or explicitly via handleLeaveCall/`open` going
  // false below — never as a side effect of the container div re-rendering.
  useEffect(() => {
    return () => destroyZego()
  }, [destroyZego])

  useEffect(() => {
    if (!open) {
      destroyZego()
      setIsMinimized(false)
      setShowMinimizeConfirm(false)
      setError(null)
      setErrorDetails(null)
      return
    }

    if (!sessionId || !containerElement) return

    // Minimizing/restoring re-renders this component but never changes
    // sessionId/containerElement/mode (the container div stays mounted the
    // whole time `open` is true — see the JSX below), so this effect simply
    // won't re-run for that. This guard covers the belt-and-suspenders case
    // where it fires again with an already-live session for the same key.
    const key = `${sessionId}|${mode}`
    if (zegoRef.current && joinedKeyRef.current === key) {
      return
    }

    let cancelled = false

    const initVideoCall = async () => {
      try {
        setLoading(true)
        setError(null)
        setErrorDetails(null)

        // A stale session/mode is still connected — leave it before joining anew.
        destroyZego()

        const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt')

        const access = await liveSessionService.getToken(sessionId)
        if (cancelled) return

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
        joinedKeyRef.current = key

        const isLiveStream = mode === 'LiveStreaming'

        zp.joinRoom({
          container: containerElement,
          scenario: isLiveStream
            ? {
                mode: ZegoUIKitPrebuilt.LiveStreaming,
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
          showNonVideoUser: !isLiveStream,
          // Room messages open by default so the admin can see member chat
          // arrive without hunting for the button first.
          rightPanelExpandedType: 'RoomMessages',
          onJoinRoom: () => {
            if (!cancelled) setLoading(false)
            liveSessionService.reportHostPresence(sessionId).catch((err) => {
              console.error('Failed to report host presence:', err)
            })
          },
          onLeaveRoom: () => {
            // Session ended
          },
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
              ;(zp as any).renewToken(renewedKitToken)
            } catch {
              // Best-effort
            }
          },
        } as any)

        scheduleSettleResize()

        if (!cancelled) setLoading(false)
      } catch (err: any) {
        console.error('ZEGOCLOUD Video Conference init error:', err)
        if (!cancelled) {
          const resData = err?.response?.data
          const apiMsg = resData?.message || resData?.error
          const errMsg = apiMsg || err?.message || 'Failed to connect to ZEGOCLOUD Video Conference suite.'
          setError(errMsg)
          setErrorDetails({
            message: errMsg,
            code: resData?.code,
            startsAt: resData?.startsAt,
            endsAt: resData?.endsAt,
          })
          setLoading(false)
        }
      }
    }

    initVideoCall()

    return () => {
      cancelled = true
    }
  }, [open, sessionId, containerElement, mode, destroyZego, scheduleSettleResize])

  const handleLeaveCall = () => {
    destroyZego()
    setShowMinimizeConfirm(false)
    setIsMinimized(false)
    onOpenChange(false)
  }

  const handleMinimizeConfirm = () => {
    setShowMinimizeConfirm(false)
    setIsMinimized(true)
  }

  const handleStayInMeeting = () => {
    setShowMinimizeConfirm(false)
  }

  if (!open) return null

  return (
    <>
      {isMinimized && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-gray-900 border border-gray-700 text-white px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold">{sessionTitle || 'Active Call'}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-gray-300 hover:text-white px-2"
              onClick={() => {
                setIsMinimized(false)
                scheduleSettleResize(600)
              }}
            >
              <IconMaximize className="w-3.5 h-3.5 mr-1" /> Expand
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white px-2"
              onClick={handleLeaveCall}
            >
              <IconX className="w-3.5 h-3.5 mr-1" /> Leave
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation modal shown when user attempts an outside click or escape */}
      <AlertDialog open={showMinimizeConfirm} onOpenChange={setShowMinimizeConfirm}>
        <AlertDialogContent className="z-[60] bg-gray-900 border-gray-800 text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-base">
              Do you want to minimize the meeting?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-400">
              Minimizing keeps your ZEGOCLOUD video/audio session active in the background while allowing you to navigate Frontdesk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              onClick={handleStayInMeeting}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700 text-xs h-9"
            >
              Stay in Meeting
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMinimizeConfirm}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
            >
              Minimize Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stays mounted (off-screen, no overlay) while minimized so the
          ZEGOCLOUD session — video, audio, chat history — keeps running in
          the background instead of being torn down and rejoined. */}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && open && !isMinimized) {
            setShowMinimizeConfirm(true)
            return
          }
          onOpenChange(nextOpen)
        }}
        modal={!isMinimized}
      >
        <DialogContent
          hideOverlay={isMinimized}
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            if (!isMinimized) {
              setShowMinimizeConfirm(true)
            }
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault()
            if (!isMinimized) {
              setShowMinimizeConfirm(true)
            }
          }}
          onInteractOutside={(e) => {
            e.preventDefault()
            if (!isMinimized) {
              setShowMinimizeConfirm(true)
            }
          }}
          className={cn(
            // ZEGOCLOUD's desktop room is fixed-chrome (64px room header +
            // 74px footer) and clips anything that doesn't fit rather than
            // scrolling — too small a box here silently loses the footer
            // controls. w-full/max-w-lg/gap-4/max-h-[90vh]/overflow-y-auto
            // from the base DialogContent are all overridden below.
            'w-[96vw] max-w-[1400px] h-[92vh] max-h-[92vh] min-h-[520px] p-0 gap-0 overflow-hidden overflow-y-hidden bg-black border-gray-800 flex flex-col',
            // When minimized: keep the dialog in-viewport (invisible) so
            // ZEGOCLOUD's internal layout engine can still measure its
            // container. Moving it off-screen (left: -20000px) causes
            // ZEGOCLOUD to compute collapsed / zero dimensions which don't
            // recover after the dialog slides back into view.
            isMinimized && 'pointer-events-none invisible',
          )}
        >
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
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-gray-950/95 gap-4">
                <div className="rounded-full bg-indigo-500/10 p-4 border border-indigo-500/20 text-indigo-400">
                  <IconVideo className="w-10 h-10" />
                </div>

                {errorDetails?.code === 'NOT_OPEN_YET' || error.toLowerCase().includes('not open') ? (
                  <div className="space-y-2 max-w-md">
                    <h3 className="text-lg font-semibold text-white">Session Hasn't Started Yet</h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {errorDetails?.startsAt && errorDetails?.endsAt ? (
                        <>
                          This session is scheduled for{' '}
                          <span className="font-semibold text-white">
                            {new Date(errorDetails.startsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} –{' '}
                            {new Date(errorDetails.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          . You can join when the session starts.
                        </>
                      ) : (
                        'This session is not open for joining yet. You can join when the session starts.'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-w-md">
                    <h3 className="text-base font-semibold text-rose-400">Unable to Join Session</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{error}</p>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800 hover:text-white px-6"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            ) : (
              <div ref={setContainerElement} className="h-full w-full" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

