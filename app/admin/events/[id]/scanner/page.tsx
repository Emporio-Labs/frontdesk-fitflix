'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  IconArrowLeft,
  IconQrcode,
  IconCamera,
  IconCameraRotate,
  IconVolume,
  IconVolumeOff,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconUsers,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconClock,
  IconRotate2,
  IconSparkles,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getEventById,
  getEventRegistrations,
  verifyEventCheckIn,
  toggleRegistrationCheckIn,
  type FitflixEvent,
  type CheckInVerificationResponse,
} from '@/lib/services/event.service'

const SCANNER_DOM_ID = 'fitflix-event-qr-reader'
const SCAN_COOLDOWN_MS = 2500

interface ScanAuditEntry {
  id: string
  timestamp: string
  ticketId: string
  attendeeName: string
  status: 'VALID' | 'ALREADY_CHECKED_IN' | 'WRONG_EVENT' | 'INVALID'
  tierName?: string
  registrationId?: string
}

export default function EventScannerPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = (params?.id as string) || ''

  const [event, setEvent] = useState<FitflixEvent | null>(null)
  const [totalCheckedIn, setTotalCheckedIn] = useState(0)
  const [totalRegistered, setTotalRegistered] = useState(0)
  const [loading, setLoading] = useState(true)

  // Scanner State
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [manualCode, setManualCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Active Scan HUD Feedback
  const [latestResult, setLatestResult] = useState<CheckInVerificationResponse | null>(null)
  const [recentScans, setRecentScans] = useState<ScanAuditEntry[]>([])

  const scannerRef = useRef<any>(null)
  const cooldownRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Initialize Web Audio API on first user interaction
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx()
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }, [])

  // Audio: Upward chime for successful valid entry
  const playSuccessChime = useCallback(() => {
    if (!soundEnabled) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now) // A5
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15) // E6

      gain.gain.setValueAtTime(0.25, now)
      gain.gain.linearRampToValueAtTime(0, now + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.3)
    } catch {
      // Audio play failed or blocked
    }
  }, [soundEnabled, getAudioContext])

  // Audio: Double low buzz for duplicate or invalid scan
  const playWarningChime = useCallback(() => {
    if (!soundEnabled) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(240, now)
      osc.frequency.setValueAtTime(180, now + 0.12)

      gain.gain.setValueAtTime(0.35, now)
      gain.gain.linearRampToValueAtTime(0, now + 0.28)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.28)
    } catch {
      // Audio play failed or blocked
    }
  }, [soundEnabled, getAudioContext])

  // Load initial event and attendance statistics
  const loadEventData = useCallback(async () => {
    if (!eventId) return
    try {
      setLoading(true)
      const [evt, roster] = await Promise.all([
        getEventById(eventId),
        getEventRegistrations(eventId),
      ])
      setEvent(evt)
      setTotalCheckedIn(roster.summary?.totalCheckedIn ?? evt.totalCheckedIn ?? 0)
      setTotalRegistered(roster.summary?.totalRegistered ?? evt.totalRegistered ?? 0)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load event data'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadEventData()
  }, [loadEventData])

  // Process a scan or manual verification
  const handleVerifyPayload = useCallback(
    async (rawPayload: string) => {
      const trimmed = rawPayload.trim()
      if (!trimmed || isVerifying) return

      try {
        setIsVerifying(true)
        const response = await verifyEventCheckIn({
          payload: trimmed,
          eventId: event?.id || event?._id || eventId,
        })

        setLatestResult(response)

        const timeStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })

        if (response.status === 'VALID') {
          playSuccessChime()
          setTotalCheckedIn((prev) => prev + 1)
          toast.success(response.message || 'Check-in verified!')

          setRecentScans((prev) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: timeStr,
              ticketId: response.registration?.ticketId || trimmed,
              attendeeName: response.registration?.attendeeName || 'Attendee',
              status: 'VALID',
              tierName: response.registration?.tierName,
              registrationId: response.registration?.id,
            },
            ...prev.slice(0, 19),
          ])
        } else if (response.status === 'ALREADY_CHECKED_IN') {
          playWarningChime()
          toast.warning(response.error || 'Already checked in!')

          setRecentScans((prev) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: timeStr,
              ticketId: response.registration?.ticketId || trimmed,
              attendeeName: response.registration?.attendeeName || 'Attendee',
              status: 'ALREADY_CHECKED_IN',
              tierName: response.registration?.tierName,
              registrationId: response.registration?.id,
            },
            ...prev.slice(0, 19),
          ])
        } else if (response.status === 'WRONG_EVENT') {
          playWarningChime()
          toast.error(response.error || 'Ticket belongs to a different event!')

          setRecentScans((prev) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: timeStr,
              ticketId: trimmed,
              attendeeName: 'Wrong Event Ticket',
              status: 'WRONG_EVENT',
            },
            ...prev.slice(0, 19),
          ])
        } else {
          playWarningChime()
          toast.error(response.error || 'Ticket not found in system')

          setRecentScans((prev) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: timeStr,
              ticketId: trimmed,
              attendeeName: 'Invalid / Unrecognized',
              status: 'INVALID',
            },
            ...prev.slice(0, 19),
          ])
        }
      } catch (err: unknown) {
        playWarningChime()
        const msg = err instanceof Error ? err.message : 'Check-in verification failed'
        toast.error(msg)
      } finally {
        setIsVerifying(false)
      }
    },
    [event, eventId, isVerifying, playSuccessChime, playWarningChime]
  )

  // Start html5-qrcode camera instance
  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
        } catch {
          // ignore
        }
      }

      const scanner = new Html5Qrcode(SCANNER_DOM_ID)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode },
        {
          fps: 12,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (cooldownRef.current) return
          cooldownRef.current = true

          handleVerifyPayload(decodedText)

          setTimeout(() => {
            cooldownRef.current = false
          }, SCAN_COOLDOWN_MS)
        },
        () => {
          // Frame read callback without decode
        }
      )

      setCameraActive(true)
    } catch (err: any) {
      console.error('Camera initialization failed:', err)
      setCameraError(
        err?.message ||
          'Unable to access camera. Please allow camera permissions or use manual entry.'
      )
      setCameraActive(false)
    }
  }, [facingMode, handleVerifyPayload])

  // Stop camera on unmount or toggle
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {
        // ignore
      }
      scannerRef.current = null
    }
    setCameraActive(false)
  }, [])

  // Auto-start camera when page is ready
  useEffect(() => {
    if (!loading && event) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [loading, event, startCamera, stopCamera])

  // Camera flip toggle
  const toggleFacingMode = async () => {
    await stopCamera()
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  // Handle Manual Input Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    handleVerifyPayload(manualCode)
    setManualCode('')
  }

  // Handle Undo Check-In for accidental double scans
  const handleUndoCheckIn = async (scan: ScanAuditEntry) => {
    if (!scan.registrationId) return
    try {
      const res = await toggleRegistrationCheckIn(scan.registrationId)
      toast.info(res.message)
      setTotalCheckedIn((prev) => Math.max(0, prev - 1))
      // Remove or mark undone
      setRecentScans((prev) => prev.filter((s) => s.id !== scan.id))
      if (latestResult?.registration?.id === scan.registrationId) {
        setLatestResult(null)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to undo check-in'
      toast.error(msg)
    }
  }

  const attendancePct =
    totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-[500px] rounded-3xl" />
          <Skeleton className="lg:col-span-5 h-[500px] rounded-3xl" />
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Event Not Found</h2>
        <Link href="/admin/events">
          <Button variant="outline">
            <IconArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/admin/events"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <IconArrowLeft className="h-3.5 w-3.5" /> Events
            </Link>
            <span>/</span>
            <Link
              href={`/admin/events/${eventId}/attendees`}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {event.title}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Entrance QR Scanner</span>
          </div>

          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Live QR Check-In Console
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold gap-1"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              LIVE
            </Badge>
          </div>
        </div>

        {/* Live Attendance Stats Header Card */}
        <div className="flex items-center gap-3 bg-card border border-border p-2.5 px-4 rounded-2xl shadow-xs">
          <IconUsers className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-foreground">Checked In:</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                {totalCheckedIn} / {totalRegistered}
              </span>
              <span className="text-muted-foreground">({attendancePct}%)</span>
            </div>
            <Progress value={attendancePct} className="h-1.5 w-36" />
          </div>

          <Link href={`/admin/events/${eventId}/attendees`}>
            <Button variant="ghost" size="sm" className="text-xs ml-2">
              Roster
            </Button>
          </Link>
        </div>
      </div>

      {/* Main 2-Column Console Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Camera Scanner Viewport (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border overflow-hidden rounded-3xl bg-card shadow-lg">
            <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <IconCamera className="h-4 w-4 text-emerald-500" />
                  Camera Viewfinder
                </CardTitle>
                <CardDescription className="text-xs">
                  Point camera at attendee digital pass QR code
                </CardDescription>
              </div>

              {/* Viewfinder Controls */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setSoundEnabled((prev) => !prev)}
                  title={soundEnabled ? 'Mute Chimes' : 'Unmute Chimes'}
                >
                  {soundEnabled ? (
                    <IconVolume className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <IconVolumeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={toggleFacingMode}
                  title="Switch Front/Back Camera"
                >
                  <IconCameraRotate className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => {
                    if (cameraActive) stopCamera()
                    else startCamera()
                  }}
                  title={cameraActive ? 'Pause Camera' : 'Start Camera'}
                >
                  <IconRefresh
                    className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`}
                  />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center">
              {/* html5-qrcode Mount Container with Targeting Reticle */}
              <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black/95 flex items-center justify-center border-2 border-dashed border-zinc-800">
                <div
                  id={SCANNER_DOM_ID}
                  className="w-full h-full object-cover"
                />

                {/* Overlaid Corner Crosshairs Reticle */}
                <div className="absolute inset-8 pointer-events-none border-2 border-emerald-500/40 rounded-xl">
                  {/* Top-left */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                  {/* Top-right */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                  {/* Bottom-left */}
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                  {/* Bottom-right */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                  {/* Pulsing center scan line */}
                  <div className="w-full h-0.5 bg-emerald-400/80 shadow-[0_0_12px_#10b981] absolute top-1/2 -translate-y-1/2 animate-pulse" />
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-background/95 backdrop-blur-xs p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                    <IconAlertTriangle className="h-10 w-10 text-amber-500" />
                    <p className="text-xs font-semibold text-foreground max-w-xs">
                      {cameraError}
                    </p>
                    <Button
                      size="sm"
                      onClick={startCamera}
                      className="text-xs gap-1.5"
                    >
                      <IconRefresh className="h-3.5 w-3.5" />
                      Try Again
                    </Button>
                  </div>
                )}
              </div>

              {/* Scanner Status Indicator */}
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span
                  className={`h-2 w-2 rounded-full ${
                    cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>
                  {isVerifying
                    ? 'Verifying credential...'
                    : cameraActive
                    ? 'Ready for Next Pass'
                    : 'Camera Paused'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Manual Ticket ID or Phone Number Entry Bar */}
          <Card className="border-border rounded-2xl bg-card">
            <CardContent className="p-4">
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter Ticket ID (e.g. FFX-SUNR-0001) or 10-digit Phone..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="pl-9 text-xs font-mono uppercase"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!manualCode.trim() || isVerifying}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4"
                >
                  Verify
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dynamic Scan Result HUD & Recent Activity Stream (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Scan HUD Feedback Card */}
          {latestResult ? (
            <Card
              className={`rounded-3xl border-2 transition-all ${
                latestResult.status === 'VALID'
                  ? 'border-emerald-500/80 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
                  : latestResult.status === 'ALREADY_CHECKED_IN'
                  ? 'border-amber-500/80 bg-amber-500/5 shadow-lg shadow-amber-500/10'
                  : 'border-destructive/80 bg-destructive/5 shadow-lg shadow-destructive/10'
              }`}
            >
              <CardContent className="p-5 sm:p-6 space-y-4">
                {/* Result Status Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {latestResult.status === 'VALID' ? (
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                        <IconCheck className="h-5 w-5" />
                      </div>
                    ) : latestResult.status === 'ALREADY_CHECKED_IN' ? (
                      <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <IconAlertTriangle className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
                        <IconX className="h-5 w-5" />
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider block text-muted-foreground">
                        SCANNER VERIFICATION
                      </span>
                      <h3
                        className={`text-base font-black uppercase tracking-tight ${
                          latestResult.status === 'VALID'
                            ? 'text-emerald-500'
                            : latestResult.status === 'ALREADY_CHECKED_IN'
                            ? 'text-amber-500'
                            : 'text-destructive'
                        }`}
                      >
                        {latestResult.status === 'VALID'
                          ? 'CHECK-IN VERIFIED'
                          : latestResult.status === 'ALREADY_CHECKED_IN'
                          ? 'DUPLICATE PASS DETECTED'
                          : latestResult.status === 'WRONG_EVENT'
                          ? 'WRONG EVENT PASS'
                          : 'INVALID TICKET'}
                      </h3>
                    </div>
                  </div>

                  {latestResult.registration?.badgeLabel && (
                    <Badge
                      style={{
                        backgroundColor:
                          latestResult.registration.badgeColor || '#10b981',
                        color: '#000000',
                      }}
                      className="font-black text-[10px] tracking-wider uppercase border-none px-2 py-0.5 shrink-0"
                    >
                      {latestResult.registration.badgeLabel}
                    </Badge>
                  )}
                </div>

                {/* Attendee Identity Details */}
                {latestResult.registration && (
                  <div className="space-y-1 bg-background/80 rounded-2xl p-4 border border-border">
                    <p className="text-xl font-black text-foreground uppercase tracking-tight">
                      {latestResult.registration.attendeeName}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
                      <span>{latestResult.registration.attendeeEmail}</span>
                      <span>•</span>
                      <span>{latestResult.registration.attendeePhone}</span>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">
                        Ticket Number:
                      </span>
                      <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                        {latestResult.registration.ticketId}
                      </span>
                    </div>
                  </div>
                )}

                {/* Included Tier Perks Checklist */}
                {latestResult.registration?.perks &&
                  latestResult.registration.perks.length > 0 && (
                    <div className="bg-background/60 rounded-xl p-3 border border-border space-y-1">
                      <span className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider block mb-1 flex items-center gap-1">
                        <IconSparkles className="h-3 w-3" />
                        HANDOVER ITEMS & PERKS
                      </span>
                      {latestResult.registration.perks.map((perk, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-xs text-foreground font-medium"
                        >
                          <IconCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Warning / Error Message details */}
                {latestResult.error && (
                  <p className="text-xs text-destructive font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20">
                    {latestResult.error}
                  </p>
                )}

                {/* Timestamp & Operator Stamp */}
                <div className="text-[11px] text-muted-foreground flex items-center justify-between font-mono pt-1">
                  <span className="flex items-center gap-1">
                    <IconClock className="h-3.5 w-3.5" />
                    {new Date().toLocaleTimeString()}
                  </span>
                  <span>Gate 1 Entrance</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Standby Card when no scan has fired yet */
            <Card className="rounded-3xl border-dashed border-border bg-card/60 p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <IconQrcode className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold">Awaiting Next Ticket</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Hold an attendee&apos;s phone or printed ticket inside the camera
                  viewfinder to scan automatically.
                </p>
              </div>
            </Card>
          )}

          {/* Recent Scans Live Stream */}
          <Card className="rounded-3xl border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <IconClock className="h-3.5 w-3.5" />
                  Recent Scans Stream ({recentScans.length})
                </CardTitle>
              </div>
              {recentScans.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecentScans([])}
                  className="text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground"
                >
                  Clear History
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-0 max-h-72 overflow-y-auto divide-y divide-border">
              {recentScans.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No scan events recorded yet during this session.
                </div>
              ) : (
                recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-3 px-4 flex items-center justify-between gap-3 text-xs hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          scan.status === 'VALID'
                            ? 'bg-emerald-500'
                            : scan.status === 'ALREADY_CHECKED_IN'
                            ? 'bg-amber-500'
                            : 'bg-destructive'
                        }`}
                      />

                      <div className="truncate">
                        <p className="font-bold text-foreground truncate">
                          {scan.attendeeName}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {scan.ticketId}{' '}
                          {scan.tierName ? `• ${scan.tierName}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {scan.timestamp}
                      </span>
                      {scan.status === 'VALID' && scan.registrationId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUndoCheckIn(scan)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          title="Undo Check-In"
                        >
                          <IconRotate2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
