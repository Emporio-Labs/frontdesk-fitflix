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

interface VideoConferenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomID: string
  sessionTitle: string
  mode?: 'VideoConference' | 'LiveStreaming'
}

export function VideoConferenceModal({
  open,
  onOpenChange,
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

    if (!roomID || !containerElement) return

    let mounted = true

    const initVideoCall = async () => {
      try {
        setLoading(true)
        setError(null)

        const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt')

        const userRaw = localStorage.getItem('hh_user')
        let staffId = 'admin_host_' + Date.now()
        let staffName = 'FitFlix Admin'

        if (userRaw) {
          try {
            const parsed = JSON.parse(userRaw)
            staffId = parsed._id || parsed.id || staffId
            const rawName = parsed.name || parsed.username || parsed.fullName || ''
            if (rawName && !rawName.includes('@')) {
              staffName = rawName
            } else if (rawName.includes('@')) {
              const parts = rawName.split('@')[0]
              const clean = parts.charAt(0).toUpperCase() + parts.slice(1)
              staffName = `${clean} (Admin)`
            }
          } catch {
            /* use defaults */
          }
        }
        setStaffDisplay(staffName)

        const appID = Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID || 857373493)

        if (!appID) {
          throw new Error('ZEGOCLOUD AppID missing.')
        }

        const cleanRoomID = String(roomID || 'fitflix_class_room').replace(/[^a-zA-Z0-9_-]/g, '_')
        const cleanStaffId = String(staffId || 'admin_host').replace(/[^a-zA-Z0-9_-]/g, '_')
        const cleanStaffName = staffName.replace(/[^\w\s-]/gi, '') || 'Admin Host'

        // This ZEGO project requires Token authentication (AppSign logins are rejected
        // with error 20014/50120), so fetch a server-minted token instead of using
        // generateKitTokenForTest. See app/api/zego-token/route.ts.
        const tokenRes = await fetch('/api/zego-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userID: cleanStaffId }),
        })

        if (!tokenRes.ok) {
          const errBody = await tokenRes.json().catch(() => null)
          throw new Error(errBody?.message || 'Failed to fetch ZEGOCLOUD token from server.')
        }

        const { token } = await tokenRes.json()

        if (!token) {
          throw new Error('ZEGOCLOUD token response was empty.')
        }

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          appID,
          token,
          cleanRoomID,
          cleanStaffId,
          cleanStaffName
        )

        if (!mounted) return

        const zp = ZegoUIKitPrebuilt.create(kitToken)
        zegoRef.current = zp

        const scenarioConfig =
          mode === 'LiveStreaming'
            ? {
                mode: ZegoUIKitPrebuilt.LiveStreaming,
                config: {
                  role: ZegoUIKitPrebuilt.Host,
                },
              }
            : {
                mode: ZegoUIKitPrebuilt.VideoConference,
              }

        zp.joinRoom({
          container: containerElement,
          scenario: scenarioConfig,
          showPreJoinView: false,
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: true,
          showUserList: true,
          showLayoutButton: true,
          showNonVideoUser: true,
          onJoinRoom: () => {
            if (mounted) setLoading(false)
          },
          onLeaveRoom: () => {
            // Session ended
          },
        })

        if (mounted) setLoading(false)
      } catch (err: any) {
        console.error('ZEGOCLOUD Video Conference init error:', err)
        if (mounted) {
          setError(err?.message || 'Failed to connect to ZEGOCLOUD Video Conference suite.')
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
  }, [open, roomID, containerElement, mode, sessionTitle])

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
