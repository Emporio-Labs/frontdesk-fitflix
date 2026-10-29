'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import QRCode from 'qrcode'
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconShieldCheck,
  IconShare,
  IconDownload,
  IconExternalLink,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { DigitalPassResponse } from '@/lib/services/event.service'

// Fitflix Canonical Color Palette (Synchronized with USER-APP-FITFLIX app_colors.dart)
export const FITFLIX_TOKENS = {
  background: '#F4F1E9', // Warm Ivory scaffold
  surface: '#FFFFFF', // Pure White card surface
  surfaceAlt: '#ECE5D7', // Warm Sand (pills, badges, input fills)
  surfaceMuted: '#FAF7F2', // Soft Warm Ivory (secondary surfaces)
  surfaceHighlight: '#F7F5EE', // Soft Sand card surface
  border: '#E7E0D2', // Warm hairline border
  borderStrong: '#D8D0C0', // Strong divider / perforation
  textPrimary: '#1B2A1F', // Deep Forest Ink (headers, attendee name)
  textSecondary: '#5E6A60', // Warm Gray-Green (body & subtext)
  textTertiary: '#8E978C', // Muted timestamps & metadata
  primary: '#8A965A', // Sage Olive (shared brand primary)
  primaryDark: '#5C6B34', // Deep Olive ("Start Workout" button style)
  primaryHover: '#4B5829', // Hover tone for Deep Olive
  brass: '#B08D57', // Luxury Brass / VIP Tier
  clay: '#C2674E', // Terracotta
}

// Brand Hang Tag Color Mapping per Pass Tier Preset
export const getHangTagStyle = (label: string, fallbackColor?: string) => {
  const norm = (label || '').toUpperCase().trim()
  if (norm.includes('SUPER EARLY')) {
    return {
      bg: '#D1FAE5',
      text: '#065F46',
      border: '#34D399',
      cord: '#059669',
    }
  }
  if (norm.includes('EARLY')) {
    return {
      bg: '#DBEAFE',
      text: '#1E40AF',
      border: '#60A5FA',
      cord: '#2563EB',
    }
  }
  if (norm.includes('MEMBER')) {
    return {
      bg: '#F3E8FF',
      text: '#6B21A8',
      border: '#C084FC',
      cord: '#9333EA',
    }
  }
  if (norm.includes('VIP') || norm.includes('ALL ACCESS')) {
    return {
      bg: '#FEF3C7',
      text: '#92400E',
      border: '#FBBF24',
      cord: '#D97706',
    }
  }
  if (norm.includes('RUNNER') || norm.includes('GENERAL')) {
    return {
      bg: '#ECFDF5',
      text: '#166534',
      border: '#6EE7B7',
      cord: '#059669',
    }
  }
  return {
    bg: fallbackColor ? `${fallbackColor}18` : '#F4F4F5',
    text: fallbackColor || '#18181B',
    border: fallbackColor ? `${fallbackColor}50` : '#E4E4E7',
    cord: fallbackColor || '#71717A',
  }
}

export interface FitflixEventPassProps {
  passData: DigitalPassResponse
  showActions?: boolean
  passTheme?: 'light' | 'dark'
}

export function FitflixEventPass({
  passData,
  showActions = true,
  passTheme = 'light',
}: FitflixEventPassProps) {
  const { pass, event } = passData
  const isDark = passTheme === 'dark'
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const ticketRef = useRef<HTMLDivElement>(null)

  // Use tier's specific badge color for the tier badge, defaulting to Brass or Sage
  const tierColor = pass.badgeColor || FITFLIX_TOKENS.brass
  const hangTagStyle = useMemo(
    () => getHangTagStyle(pass.badgeLabel || pass.tierName || '', pass.badgeColor),
    [pass.badgeLabel, pass.tierName, pass.badgeColor]
  )
  const collaborators = event.collaborators || []
  const hasCollaborator = collaborators.length > 0
  const primaryCollab = hasCollaborator ? collaborators[0] : null

  // Smart partner logo resolver: defaults Chapter 5 to the official high-res logo
  const partnerLogoSrc = useMemo(() => {
    if (!primaryCollab) return ''
    const raw = primaryCollab.logoUrl?.trim()
    const nameLower = (primaryCollab.name || '').toLowerCase()

    if (nameLower.includes('chapter') || nameLower.includes('coffee') || raw?.includes('chapter')) {
      if (!raw || raw.endsWith('.svg') || raw.includes('chapter-5-logo.jpg')) {
        return '/events/chapter-5-logo.jpg?v=2'
      }
      return raw
    }

    if (nameLower.includes('red bull') || raw?.includes('red-bull')) {
      return raw || '/events/red-bull.svg'
    }

    return raw || ''
  }, [primaryCollab])

  useEffect(() => {
    if (pass.qrPayload || pass.ticketId) {
      const payload =
        pass.qrPayload ||
        JSON.stringify({
          ticketId: pass.ticketId,
          token: pass.verificationToken,
          eventId: event.id,
        })
      QRCode.toDataURL(payload, {
        width: 380,
        margin: 2,
        color: {
          dark: '#1B2A1F',
          light: '#FAF7F2',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Failed to generate pass QR:', err))
    }
  }, [pass, event])

  const formattedDate = new Date(event.startDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) {
      navigator.share({
        title: `${event.title} - Official Pass`,
        text: `Here is my official entry pass for ${event.title}!`,
        url,
      })
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Pass link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadIcs = () => {
    const start = new Date(event.startDate).toISOString().replace(/-|:|\.\d\d\d/g, '')
    const end = new Date(event.endDate).toISOString().replace(/-|:|\.\d\d\d/g, '')
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${event.title}`,
      `DESCRIPTION:Official Pass for ${pass.attendeeName} (${pass.tierName}). Ticket ID: ${pass.ticketId}`,
      `LOCATION:${event.venue.name}, ${event.venue.address}, ${event.venue.city}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.setAttribute('download', `${event.slug}-pass.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Event added to calendar (.ics downloaded)!')
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Fitflix Official Pass Credential Container */}
      <div
        ref={ticketRef}
        style={{
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            : '0 20px 40px -12px rgba(27, 42, 31, 0.08)',
        }}
        className={`${
          isDark
            ? 'bg-[#0b0d10] border-zinc-800 text-white'
            : 'bg-white border-[#E7E0D2] text-[#1B2A1F]'
        } border rounded-3xl overflow-hidden relative select-none transition-colors duration-200`}
      >
        {/* Sleek Retail Brand Hang Tag (Suspended from Top Right Edge) */}
        <div className="absolute top-0 right-5 sm:right-6 z-20 flex flex-col items-center pointer-events-none select-none">
          {/* Braided Cord / Suspension Thread */}
          <div
            style={{ backgroundColor: hangTagStyle.cord }}
            className="w-[1.5px] h-3 shadow-2xs"
          />

          {/* Cardstock Hang Tag Body */}
          <div
            style={{
              backgroundColor: hangTagStyle.bg,
              borderColor: hangTagStyle.border,
              color: hangTagStyle.text,
              boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.16), 0 2px 4px -2px rgba(0, 0, 0, 0.08)',
            }}
            className="relative flex flex-col items-center justify-center px-2 pt-1.5 pb-1 rounded-b-md border border-t-0 min-w-[72px] max-w-[84px] text-center"
          >
            {/* Metallic Eyelet (Grommet) Punch Hole */}
            <div className="w-2 h-2 rounded-full border border-black/30 bg-[#18181B] shadow-inner flex items-center justify-center -mt-0.5 mb-1">
              <div className="w-0.5 h-0.5 rounded-full bg-white/40" />
            </div>

            {/* Pass Tier Ticket Text */}
            <span className="font-black text-[8.5px] leading-tight tracking-wider uppercase">
              {pass.badgeLabel || 'GENERAL PASS'}
            </span>

            {/* Micro Retail Stamp */}
            <span className="text-[6px] font-mono tracking-widest opacity-60 uppercase pt-0.5">
              PASS TIER
            </span>
          </div>
        </div>

        {/* Top Header Branding Section */}
        <div
          style={{
            borderBottom: isDark ? '1px solid #27272a' : `1px solid ${FITFLIX_TOKENS.border}`,
            background: isDark
              ? 'linear-gradient(180deg, rgba(92, 107, 52, 0.12) 0%, rgba(11, 13, 16, 0.98) 100%)'
              : 'linear-gradient(180deg, rgba(138, 150, 90, 0.12) 0%, #FFFFFF 100%)',
          }}
          className="p-5 sm:p-6 space-y-3"
        >
          {/* Row 1: Brand Logos Lockup (Big Size, Full Span, Zero Collision with Hang Tag) */}
          <div className="flex items-center gap-3 pr-20">
            {hasCollaborator && primaryCollab ? (
              /* Co-Branded Layout: Company 1 Logo × Company 2 Logo */
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Company 1: Official Fitflix Logo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/events/fitflix-full-logo.png"
                  alt="Fitflix"
                  className="h-8 sm:h-9 w-auto object-contain shrink-0"
                />

                {/* Multiplier / Cross Separator */}
                <span
                  style={{ color: isDark ? '#a1a1aa' : '#71717A' }}
                  className="text-base sm:text-lg font-black px-0.5 select-none shrink-0"
                >
                  ×
                </span>

                {/* Company 2: Partner Brand Logo */}
                <div className="flex items-center min-w-0">
                  {partnerLogoSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={partnerLogoSrc}
                      alt={primaryCollab.name}
                      className="h-9 sm:h-10 w-auto max-w-[170px] sm:max-w-[220px] object-contain shrink-0 mix-blend-multiply"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        // If it's Chapter 5, try the verified local logo before hiding
                        if (
                          (primaryCollab.name.toLowerCase().includes('chapter') ||
                            primaryCollab.name.toLowerCase().includes('coffee')) &&
                          !target.src.includes('chapter-5-logo.jpg')
                        ) {
                          target.src = '/events/chapter-5-logo.jpg?v=2'
                          return
                        }
                        target.style.display = 'none'
                        const fallback = target.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'inline-block'
                      }}
                    />
                  ) : null}
                  <span
                    style={{
                      display: partnerLogoSrc ? 'none' : 'inline-block',
                      color: isDark ? '#FFFFFF' : FITFLIX_TOKENS.textPrimary,
                    }}
                    className="font-black text-sm sm:text-base tracking-tight truncate max-w-[150px] sm:max-w-[190px]"
                  >
                    {primaryCollab.name}
                  </span>
                </div>
              </div>
            ) : (
              /* Single Company Event: Official Fitflix Logo */
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/events/fitflix-full-logo.png"
                  alt="Fitflix"
                  className="h-8 sm:h-9 w-auto object-contain shrink-0"
                />
              </div>
            )}
          </div>

          {/* Row 2: Event Title & Tagline (Padded to clear the hang tag smoothly) */}
          <div className="space-y-0.5 pt-0.5 pr-20">
            <h2
              style={{ color: isDark ? '#FFFFFF' : FITFLIX_TOKENS.textPrimary }}
              className="text-base sm:text-lg font-black tracking-tight leading-snug"
            >
              {event.title}
            </h2>
            {event.tagline && (
              <p
                style={{ color: isDark ? '#a1a1aa' : FITFLIX_TOKENS.textSecondary }}
                className="text-xs font-medium line-clamp-1"
              >
                {event.tagline}
              </p>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className={`p-5 sm:p-6 space-y-4 ${isDark ? 'bg-[#0b0d10]' : 'bg-white'}`}>
          {/* Attendee Identity & Ticket Number */}
          <div className="flex justify-between items-start gap-3">
            <div className="space-y-0.5 min-w-0">
              <span
                style={{ color: isDark ? FITFLIX_TOKENS.primary : FITFLIX_TOKENS.primaryDark }}
                className="text-[10px] uppercase font-bold tracking-wider block"
              >
                ATTENDEE
              </span>
              <p
                style={{ color: isDark ? '#FFFFFF' : FITFLIX_TOKENS.textPrimary }}
                className="text-xl font-black uppercase tracking-tight truncate"
              >
                {pass.attendeeName}
              </p>
              <p
                style={{ color: isDark ? '#a1a1aa' : FITFLIX_TOKENS.textSecondary }}
                className="text-xs font-mono truncate"
              >
                {pass.attendeeEmail}
              </p>
            </div>

            <div className="text-right space-y-0.5 shrink-0">
              <span
                style={{ color: isDark ? '#71717a' : FITFLIX_TOKENS.textTertiary }}
                className="text-[10px] uppercase font-bold tracking-wider block"
              >
                TICKET NUMBER
              </span>
              <span
                style={{
                  color: isDark ? '#FFFFFF' : FITFLIX_TOKENS.primaryDark,
                  borderColor: isDark ? '#3f3f46' : FITFLIX_TOKENS.borderStrong,
                  backgroundColor: isDark ? '#18181b' : FITFLIX_TOKENS.surfaceAlt,
                }}
                className="text-xs font-mono font-black px-2.5 py-1 rounded-md border inline-block tracking-wide shadow-2xs"
              >
                {pass.ticketId}
              </span>
            </div>
          </div>

          {/* Perforated Divider with Circular Punch-outs (Melts into Ivory Canvas) */}
          <div className="relative my-3">
            <div
              style={{ borderColor: isDark ? '#27272a' : FITFLIX_TOKENS.borderStrong }}
              className="border-t-2 border-dashed w-full"
            />
            {/* Left circular cutout - matches canvas #F4F1E9 */}
            <div
              style={{
                backgroundColor: isDark ? '#0b0d10' : FITFLIX_TOKENS.background,
                borderColor: isDark ? '#27272a' : FITFLIX_TOKENS.border,
              }}
              className="absolute -left-9 -top-3 w-6 h-6 rounded-full border-r shadow-inner"
            />
            {/* Right circular cutout - matches canvas #F4F1E9 */}
            <div
              style={{
                backgroundColor: isDark ? '#0b0d10' : FITFLIX_TOKENS.background,
                borderColor: isDark ? '#27272a' : FITFLIX_TOKENS.border,
              }}
              className="absolute -right-9 -top-3 w-6 h-6 rounded-full border-l shadow-inner"
            />
          </div>

          {/* Central QR Code Window (Soft Ivory Surface with Hairline Border) */}
          <div
            style={{
              backgroundColor: isDark ? '#FFFFFF' : FITFLIX_TOKENS.surfaceMuted,
              borderColor: isDark ? '#27272a' : FITFLIX_TOKENS.border,
            }}
            className="flex flex-col items-center justify-center p-5 rounded-2xl border shadow-xs"
          >
            {qrCodeDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrCodeDataUrl}
                alt={`QR code for ticket ${pass.ticketId}`}
                className="w-52 h-52 object-contain"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-zinc-400 font-mono text-xs">
                Generating High-Res QR...
              </div>
            )}
            <div className="mt-2 text-center space-y-0.5">
              <span
                style={{ color: FITFLIX_TOKENS.textPrimary }}
                className="text-[11px] font-black tracking-widest uppercase block"
              >
                PRESENT FOR FAST-TRACK ENTRY
              </span>
              <span
                style={{ color: FITFLIX_TOKENS.textSecondary }}
                className="text-[10px] font-mono block"
              >
                Single-Use Non-Transferable Digital Pass
              </span>
            </div>
          </div>

          {/* Live Check-in Status Stamp (Only displayed when checked in) */}
          {pass.checkedIn && (
            <div className="flex items-center justify-center pt-0.5">
              <div
                className={`border-2 font-black px-4 py-1.5 rounded-full text-xs tracking-wider uppercase flex items-center gap-1.5 animate-pulse ${
                  isDark
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-950/40'
                    : 'bg-emerald-500/10 border-emerald-600 text-emerald-700 shadow-xs'
                }`}
              >
                <IconShieldCheck className="h-4 w-4" />
                CHECKED IN AT{' '}
                {pass.checkedInAt
                  ? new Date(pass.checkedInAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'ENTRANCE'}
              </div>
            </div>
          )}

          {/* Event Logistics & Venue Card */}
          <div
            style={{
              backgroundColor: isDark ? 'rgba(24, 24, 27, 0.8)' : FITFLIX_TOKENS.surfaceHighlight,
              borderColor: isDark ? '#27272a' : FITFLIX_TOKENS.border,
            }}
            className="rounded-2xl p-4 border space-y-2 text-xs shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCalendar
                  style={{ color: FITFLIX_TOKENS.primaryDark }}
                  className="h-4 w-4 shrink-0"
                />
                <span
                  style={{ color: isDark ? '#FFFFFF' : FITFLIX_TOKENS.textPrimary }}
                  className="font-bold"
                >
                  {formattedDate}
                </span>
              </div>
              <div
                style={{ color: isDark ? '#a1a1aa' : FITFLIX_TOKENS.textSecondary }}
                className="flex items-center gap-1.5 font-mono"
              >
                <IconClock
                  style={{ color: FITFLIX_TOKENS.primaryDark }}
                  className="h-3.5 w-3.5 shrink-0"
                />
                <span>{event.reportingTime}</span>
              </div>
            </div>

            <div
              style={{ borderColor: isDark ? '#27272a' : FITFLIX_TOKENS.border }}
              className="flex items-start justify-between gap-2 pt-2 border-t"
            >
              <div className="flex items-start gap-2 truncate">
                <IconMapPin
                  style={{ color: FITFLIX_TOKENS.primaryDark }}
                  className="h-4 w-4 shrink-0 mt-0.5"
                />
                <div className="truncate">
                  <p
                    style={{ color: isDark ? '#FFFFFF' : FITFLIX_TOKENS.textPrimary }}
                    className="font-bold truncate"
                  >
                    {event.venue.name}
                  </p>
                  <p
                    style={{ color: isDark ? '#a1a1aa' : FITFLIX_TOKENS.textSecondary }}
                    className="text-[11px] truncate"
                  >
                    {event.venue.address}, {event.venue.city}
                  </p>
                </div>
              </div>
              {event.venue.googleMapsUrl && (
                <a
                  href={event.venue.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: FITFLIX_TOKENS.primaryDark,
                    backgroundColor: isDark ? 'rgba(92,107,52,0.2)' : FITFLIX_TOKENS.surfaceAlt,
                  }}
                  className="p-1.5 rounded-lg shrink-0 hover:opacity-80 transition-opacity"
                  title="Open in Google Maps"
                >
                  <IconExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Optional Community Partners & Sponsors Footer Strip (renders only when event has sponsors) */}
          {event.sponsors && event.sponsors.length > 0 && (
            <div
              style={{ borderColor: isDark ? '#27272a' : FITFLIX_TOKENS.border }}
              className="pt-2 text-center border-t space-y-1.5"
            >
              <span
                style={{ color: isDark ? '#71717a' : FITFLIX_TOKENS.textTertiary }}
                className="text-[9px] uppercase tracking-widest font-bold block"
              >
                COMMUNITY PARTNERS & SPONSORS
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {event.sponsors.map((s, idx) => (
                  <span
                    key={idx}
                    style={{
                      color: isDark ? '#a1a1aa' : FITFLIX_TOKENS.textPrimary,
                      backgroundColor: isDark ? '#18181b' : FITFLIX_TOKENS.surface,
                      borderColor: isDark ? '#27272a' : FITFLIX_TOKENS.border,
                    }}
                    className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border shadow-2xs"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons (Download / Print matches "Start Workout" style from User App) */}
      {showActions && (
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <Button
            variant="outline"
            onClick={handleDownloadIcs}
            style={{
              borderColor: isDark ? '#27272a' : FITFLIX_TOKENS.border,
              backgroundColor: isDark ? '#18181b' : FITFLIX_TOKENS.surface,
              color: isDark ? '#e4e4e7' : FITFLIX_TOKENS.textPrimary,
            }}
            className="text-xs gap-1.5 shadow-xs hover:opacity-90"
          >
            <IconCalendar style={{ color: FITFLIX_TOKENS.primaryDark }} className="h-4 w-4" />
            Add to Calendar
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            style={{
              borderColor: isDark ? '#27272a' : FITFLIX_TOKENS.border,
              backgroundColor: isDark ? '#18181b' : FITFLIX_TOKENS.surface,
              color: isDark ? '#e4e4e7' : FITFLIX_TOKENS.textPrimary,
            }}
            className="text-xs gap-1.5 shadow-xs hover:opacity-90"
          >
            <IconShare style={{ color: FITFLIX_TOKENS.primaryDark }} className="h-4 w-4" />
            {copied ? 'Link Copied!' : 'Share Pass'}
          </Button>
          <Button
            onClick={() => window.print()}
            style={{
              backgroundColor: FITFLIX_TOKENS.primaryDark,
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(92, 107, 52, 0.28)',
            }}
            className="col-span-2 font-bold text-xs py-5 rounded-xl hover:opacity-95 gap-2 transition-all"
          >
            <IconDownload className="h-4 w-4" />
            Download / Print Digital Pass
          </Button>
        </div>
      )}
    </div>
  )
}
