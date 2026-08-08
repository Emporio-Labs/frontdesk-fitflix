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
  const [errorDetails, setErrorDetails] = useState<{
    message: string
    code?: string
    startsAt?: string
    endsAt?: string
  } | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [staffDisplay, setStaffDisplay] = useState<string>('Admin Host')

  useEffect(() => {
    if (!open) {
      setIsMinimized(false)
      setError(null)
      setErrorDetails(null)
      return
    }

    if (!sessionId || !containerElement) return

    let mounted = true

    const initVideoCall = async () => {
      try {
        setLoading(true)
        setError(null)
        setErrorDetails(null)

        const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt')

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
          onJoinRoom: () => {
            if (mounted) setLoading(false)
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

        if (mounted) setLoading(false)
      } catch (err: any) {
        console.error('ZEGOCLOUD Video Conference init error:', err)
        if (mounted) {
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
      mounted = false
      if (zegoRef.current) {
        try {
          zegoRef.current.destroy()
        } catch {
          // ignore cleanup errors
        }
        zegoRef.current = null
      }
    }
  }, [open, sessionId, containerElement, mode])

  const handleLeaveCall = () => {
    if (zegoRef.current) {
      try {
        zegoRef.current.destroy()
      } catch {
        // ignore cleanup errors
      }
      zegoRef.current = null
    }
    onOpenChange(false)
  }

  if (!open) return null

  if (isMinimized) {
    return (
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
            onClick={() => setIsMinimized(false)}
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
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden bg-black border-gray-800 flex flex-col">
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
  )
}
