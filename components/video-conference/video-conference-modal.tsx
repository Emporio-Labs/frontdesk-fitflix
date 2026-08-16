'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconVideo, IconX, IconMaximize, IconMinus } from '@tabler/icons-react'
import { liveSessionService } from '@/lib/services/live-session.service'
import { cn } from '@/lib/utils'
import { usePortraitTiles } from './use-portrait-tiles'

interface VideoConferenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  roomID: string
  sessionTitle: string
  mode?: 'VideoConference' | 'LiveStreaming'
}

/* ---------------------------------------------------------------------------
 * Geometry.
 *
 * The ZEGOCLOUD UIKit measures its container once on mount and again on window
 * resize, and lays the whole room out from that. Handing it a container that
 * changes size when the admin minimizes would make it re-run that layout
 * mid-call, which is both slow and visibly janky.
 *
 * So the container is given one fixed "stage" size for the lifetime of the
 * call — the size it would have had expanded — and minimizing only applies a
 * CSS `scale()` to it. As far as the UIKit is concerned nothing moved. The
 * stage is only re-measured on a real window resize, which the UIKit handles
 * on its own anyway.
 * ------------------------------------------------------------------------- */
const STAGE_MAX_WIDTH = 1400
const STAGE_MIN_HEIGHT = 464
const EXPANDED_HEADER_H = 56
const PIP_HEADER_H = 40
const PIP_WIDTH = 560

type Stage = { w: number; h: number }

// Mirrors the old 96vw x 92vh box so the expanded room is the same size it
// has always been.
const measureStage = (): Stage => ({
  w: Math.min(STAGE_MAX_WIDTH, Math.round(window.innerWidth * 0.96)),
  h: Math.max(STAGE_MIN_HEIGHT, Math.round(window.innerHeight * 0.92) - EXPANDED_HEADER_H),
})

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
  // Live camera/mic state and our own publish stream id, kept for the
  // extra-info re-emit below. Seeded to match turnOn*WhenJoining.
  const localStreamIdRef = useRef<string | null>(null)
  const cameraOnRef = useRef(true)
  const micOnRef = useRef(true)
  const expressOffRef = useRef<(() => void) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<{
    message: string
    code?: string
    startsAt?: string
    endsAt?: string
  } | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [staffDisplay, setStaffDisplay] = useState<string>('Admin Host')
  // createPortal needs a DOM to aim at, so the first (server) render bails.
  const [mounted, setMounted] = useState(false)
  const [stage, setStage] = useState<Stage>({ w: STAGE_MAX_WIDTH, h: 720 })

  // Reshapes phone participants' tiles to their own aspect ratio. Self-disables
  // if the UIKit's DOM doesn't match what it expects.
  usePortraitTiles(containerElement)

  useEffect(() => {
    setMounted(true)
    const sync = () => setStage(measureStage())
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const clearSettleResizeTimer = useCallback(() => {
    if (settleResizeTimerRef.current !== null) {
      window.clearTimeout(settleResizeTimerRef.current)
      settleResizeTimerRef.current = null
    }
  }, [])

  // The ZEGOCLOUD desktop room measures its own footer/video layout on mount.
  // It mounts while the shell's open animation still has a transform on it, so
  // that first measurement can settle a beat too small (footer clipped).
  // Nudging a resize event once the animation is done makes it recompute
  // against the real, settled box. Only needed at join — the stage never
  // changes size afterwards.
  const scheduleSettleResize = useCallback((delay = 400) => {
    clearSettleResizeTimer()
    settleResizeTimerRef.current = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
      settleResizeTimerRef.current = null
    }, delay)
  }, [clearSettleResizeTimer])

  const destroyZego = useCallback(() => {
    clearSettleResizeTimer()
    // Detach before destroy(): `zp.express` is rebuilt per join cycle
    // (destroy() clears the UIKit's static core), so a listener left attached
    // belongs to an object we can no longer reach to remove it from.
    try {
      expressOffRef.current?.()
    } catch {
      // ignore cleanup errors
    }
    expressOffRef.current = null
    localStreamIdRef.current = null
    cameraOnRef.current = true
    micOnRef.current = true
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

  // Radix's <Dialog> used to lock page scroll for us; the plain portal doesn't.
  // Only while expanded — the whole point of minimizing is to use the page.
  useEffect(() => {
    if (!open || isMinimized) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open, isMinimized])

  useEffect(() => {
    if (!open) {
      destroyZego()
      setIsMinimized(false)
      setError(null)
      setErrorDetails(null)
      return
    }

    if (!sessionId || !containerElement) return

    // Minimizing/restoring re-renders this component but never changes
    // sessionId/containerElement/mode — the container div is mounted once and
    // only ever restyled (see the JSX below), which is what keeps the UIKit's
    // video elements alive across a minimize. This guard covers the
    // belt-and-suspenders case where the effect fires again with an
    // already-live session for the same key.
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

        // Members read our camera state from the publish stream's "extra info";
        // a member whose client sees that as absent or unparseable falls back
        // to "camera muted" and renders a placeholder instead of our video —
        // the black host tile reported from the phone app. The UIKit does
        // attach extra info to the publish request, but an extra-info write
        // that lands before the stream is actually publishable is rejected,
        // and the UIKit swallows that rejection and never retries; the only
        // thing that would set it afterwards is the admin toggling the camera.
        //
        // So re-emit once the express layer says the stream is PUBLISHING,
        // which is exactly when the write can succeed. Idempotent and harmless
        // when the publish-time write already worked.
        //
        // The four keys and their meanings match what the UIKit itself writes:
        // isCameraOn/isMicrophoneOn carry live mute state, while hasVideo/
        // hasAudio mean "a track of this kind exists at all". Sending
        // hasVideo:false for a merely-muted camera makes receivers treat the
        // stream as audio-only for good, so they stay pinned to true.
        //
        // `zp.express` is declared on the UIKit but typed `{}`, hence the cast
        // and the feature-detect: if a future version stops exposing it, this
        // degrades to today's behaviour rather than throwing.
        const express: any = (zp as any).express

        const updateStreamExtraInfo = (streamID?: string | null) => {
          const targetId = streamID || localStreamIdRef.current
          if (!targetId || targetId.endsWith('_screensharing')) return
          if (!express || typeof express.setStreamExtraInfo !== 'function') return
          Promise.resolve(
            express.setStreamExtraInfo(
              targetId,
              JSON.stringify({
                isCameraOn: cameraOnRef.current,
                isMicrophoneOn: micOnRef.current,
                hasVideo: true,
                hasAudio: true,
              }),
            ),
          ).catch(() => {
            // A rejected extra-info write is the pre-existing failure mode,
            // not a new one — never surface it to the admin.
          })
        }

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
          showTextChat: true,
          // Pinned rather than left to the SDK's negotiation. The members are
          // Android and iOS phones, where VP8 has no hardware decoder on a lot
          // of devices — a stream the phone can't decode plays as audio with a
          // black picture, which is indistinguishable from the camera-state bug
          // the extra-info re-emit above addresses. H264 is decodable in
          // hardware essentially everywhere the app runs.
          videoCodec: 'H264',
          // Room messages open by default so the admin can see member chat
          // arrive without hunting for the button first.
          rightPanelExpandedType: 'RoomMessages',
          // Mirror the camera/mic state into the refs the extra-info re-emit
          // reads, so a re-publish after the admin has muted doesn't announce
          // a camera that is actually off.
          onLocalStreamUpdated: (state: string, streamId: string) => {
            if (state === 'published') {
              localStreamIdRef.current = streamId
              updateStreamExtraInfo(streamId)
            }
            if (state === 'stopped') localStreamIdRef.current = null
          },
          onCameraStateUpdated: (state: 'ON' | 'OFF') => {
            cameraOnRef.current = state === 'ON'
            updateStreamExtraInfo()
          },
          onMicrophoneStateUpdated: (state: 'ON' | 'OFF') => {
            micOnRef.current = state === 'ON'
            updateStreamExtraInfo()
          },
          onJoinRoom: () => {
            if (!cancelled) setLoading(false)
            updateStreamExtraInfo()
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

        // Attached *after* joinRoom on purpose. The UIKit's own room setup
        // calls `express.off('publisherStateUpdate')` with no callback, and the
        // engine reads a missing callback as "drop every listener" — anything
        // registered before joinRoom is silently discarded. Registering after
        // is safe: `on` appends, so ours runs alongside the UIKit's.
        if (
          express &&
          typeof express.on === 'function' &&
          typeof express.setStreamExtraInfo === 'function'
        ) {
          const onPublisherState = (event: { state?: string; streamID?: string }) => {
            if (event?.state !== 'PUBLISHING') return
            const streamID = event.streamID
            if (!streamID) return
            if (localStreamIdRef.current && streamID !== localStreamIdRef.current) return
            updateStreamExtraInfo(streamID)
          }
          express.on('publisherStateUpdate', onPublisherState)
          expressOffRef.current = () => {
            try {
              // With a callback this removes only ours; without one it would
              // take the UIKit's handler down too.
              express.off?.('publisherStateUpdate', onPublisherState)
            } catch {
              // ignore cleanup errors
            }
          }
        }

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
    setIsMinimized(false)
    onOpenChange(false)
  }

  if (!open || !mounted) return null

  const pipScale = PIP_WIDTH / stage.w
  const pipStageHeight = Math.round(stage.h * pipScale)

  // Deliberately no dismiss affordances anywhere in here: no overlay click
  // handler, no Escape listener, no close button other than the explicit
  // "Leave Meeting" control. The call ends when the host says so.
  return createPortal(
    <>
      {/* Blocks the page behind the expanded room. Swallows clicks by simply
          not handling them — there is nothing to dismiss. */}
      {!isMinimized && <div className="fixed inset-0 z-50 bg-black/80" aria-hidden="true" />}

      <div
        role="dialog"
        aria-label={sessionTitle || 'Active call'}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden bg-black shadow-2xl',
          isMinimized
            ? 'rounded-2xl border border-gray-700'
            : 'rounded-lg border border-gray-800',
        )}
        style={
          isMinimized
            ? { right: 20, bottom: 20, width: PIP_WIDTH, height: PIP_HEADER_H + pipStageHeight }
            : {
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: stage.w,
                height: EXPANDED_HEADER_H + stage.h,
              }
        }
      >
        <div
          className={cn(
            'bg-gray-900 border-b border-gray-800 flex flex-row items-center justify-between shrink-0 select-none',
            isMinimized ? 'px-3' : 'px-4',
          )}
          style={{ height: isMinimized ? PIP_HEADER_H : EXPANDED_HEADER_H }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white text-xs font-semibold truncate flex items-center gap-2">
                <span className="truncate">{sessionTitle || 'Active Call'}</span>
                {!isMinimized && (
                  <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-500/40 text-xs shrink-0">
                    {mode === 'LiveStreaming' ? 'LIVE STREAM' : 'VIDEO CONFERENCE'}
                  </Badge>
                )}
              </h2>
              {!isMinimized && (
                <p className="text-xs text-gray-400">
                  Hosting as: <span className="font-medium text-gray-200">{staffDisplay}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isMinimized ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-indigo-300 hover:text-white hover:bg-indigo-600/30"
                  onClick={() => setIsMinimized(false)}
                >
                  <IconMaximize className="w-3.5 h-3.5 mr-1" /> Expand
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleLeaveCall}
                >
                  <IconX className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Viewport onto the stage. Minimizing shrinks *this* and scales the
            stage inside it; the stage — and therefore everything ZEGOCLOUD has
            rendered — keeps its pixel dimensions and never re-lays-out. */}
        <div
          className="relative shrink-0 overflow-hidden bg-black"
          style={{
            width: isMinimized ? PIP_WIDTH : stage.w,
            height: isMinimized ? pipStageHeight : stage.h,
          }}
        >
          <div
            style={{
              width: stage.w,
              height: stage.h,
              transformOrigin: 'top left',
              // No `transform` at all when expanded: a transformed ancestor
              // becomes the containing block for fixed-position descendants,
              // and the UIKit's menus rely on the usual one.
              ...(isMinimized ? { transform: `scale(${pipScale})` } : null),
            }}
          >
            {/* Mounted exactly once per open call. zg-video-root scopes the
                portrait-tile CSS in globals.css to this modal — see
                use-portrait-tiles.ts. */}
            <div ref={setContainerElement} className="h-full w-full zg-video-root" />
          </div>

          {/* Sibling of the scaled stage, so it stays legible in the PiP. */}
          {error && (
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
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
