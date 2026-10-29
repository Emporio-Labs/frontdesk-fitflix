'use client'

import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconShieldCheck,
  IconShare,
  IconDownload,
  IconCheck,
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
  const collaborators = event.collaborators || []
  const hasCollaborator = collaborators.length > 0
  const primaryCollab = hasCollaborator ? collaborators[0] : null

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
          {/* Row 1: Brand Logos Lockup + Pass Tier Badge */}
          <div className="flex items-center justify-between gap-2.5">
            {hasCollaborator && primaryCollab ? (
              /* Co-Branded Layout: Company 1 Logo × Company 2 Logo */
              <div
                style={{
                  backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : FITFLIX_TOKENS.surfaceAlt,
                  borderColor: isDark ? '#3f3f46' : FITFLIX_TOKENS.borderStrong,
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full min-w-0 border shadow-xs"
              >
                {/* Company 1: Fitflix Official Emblem & Wordmark */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    style={{ backgroundColor: FITFLIX_TOKENS.primaryDark }}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-xs"
                  >
                    F
                  </span>
                  <span
                    style={{ color: isDark ? '#FFFFFF' : FITFLIX_TOKENS.textPrimary }}
                    className="font-black text-xs tracking-wider"
                  >
                    FITFLIX
                  </span>
                </div>

                {/* Multiplier / Cross Separator */}
                <span
                  style={{ color: isDark ? '#a1a1aa' : FITFLIX_TOKENS.textSecondary }}
                  className="text-xs font-black px-0.5 shrink-0"
                >
                  ×
                </span>

                {/* Company 2: Partner Brand Logo & Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {primaryCollab.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={primaryCollab.logoUrl}
                      alt={primaryCollab.name}
                      className="h-4 w-auto max-w-[70px] object-contain rounded shrink-0 bg-white/20 p-0.5"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                        const fallback = (e.target as HTMLElement)
                          .nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  {/* Fallback initials badge if no logoUrl or image error */}
                  <span
                    style={{
                      display: primaryCollab.logoUrl ? 'none' : 'flex',
                      backgroundColor: isDark ? '#27272a' : '#E0D8C8',
                      color: isDark ? '#f4f4f5' : FITFLIX_TOKENS.textPrimary,
                    }}
                    className="w-4 h-4 rounded-full border border-black/10 items-center justify-center text-[8px] font-black shrink-0"
                  >
                    {primaryCollab.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span
                    style={{ color: isDark ? '#f4f4f5' : FITFLIX_TOKENS.textPrimary }}
                    className="font-bold text-xs truncate max-w-[150px] sm:max-w-[190px]"
                  >
                    {primaryCollab.name}
                  </span>
                </div>
              </div>
            ) : (
              /* Single Company Event: Official Fitflix Emblem & Wordmark */
              <div
                style={{
                  backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : FITFLIX_TOKENS.surfaceAlt,
                  borderColor: isDark ? '#3f3f46' : FITFLIX_TOKENS.borderStrong,
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xs"
              >
                <span
                  style={{ backgroundColor: FITFLIX_TOKENS.primaryDark }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-xs"
                >
                  F
                </span>
                <span
                  style={{ color: isDark ? '#FFFFFF' : FITFLIX_TOKENS.textPrimary }}
                  className="font-black text-xs tracking-widest"
                >
                  FITFLIX
                </span>
                <span
                  style={{
                    borderColor: isDark ? '#3f3f46' : FITFLIX_TOKENS.border,
                    color: FITFLIX_TOKENS.primaryDark,
                    backgroundColor: isDark ? 'rgba(92,107,52,0.2)' : FITFLIX_TOKENS.surfaceMuted,
                  }}
                  className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border"
                >
                  OFFICIAL
                </span>
              </div>
            )}

            {/* Pass Tier Badge (Top Right) */}
            <Badge
              style={{
                backgroundColor: tierColor,
                color: '#FFFFFF',
                boxShadow: `0 2px 8px ${tierColor}40`,
              }}
              className="font-black text-[10px] tracking-wider uppercase border-none px-2.5 py-1 shrink-0"
            >
              {pass.badgeLabel || 'GENERAL PASS'}
            </Badge>
          </div>

          {/* Row 2: Event Title & Tagline */}
          <div className="space-y-0.5 pt-0.5">
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

          {/* Live Check-in Status Stamp */}
          <div className="flex items-center justify-center pt-0.5">
            {pass.checkedIn ? (
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
            ) : (
              <div
                style={{
                  borderColor: isDark ? '#3f3f46' : FITFLIX_TOKENS.borderStrong,
                  backgroundColor: isDark ? 'rgba(92,107,52,0.15)' : FITFLIX_TOKENS.surfaceAlt,
                  color: isDark ? FITFLIX_TOKENS.primary : FITFLIX_TOKENS.primaryDark,
                }}
                className="border font-bold px-3 py-1 rounded-full text-[11px] tracking-wider uppercase flex items-center gap-1.5 shadow-2xs"
              >
                <span
                  style={{ backgroundColor: FITFLIX_TOKENS.primaryDark }}
                  className="h-2 w-2 rounded-full animate-ping"
                />
                READY FOR ON-SITE SCANNING
              </div>
            )}
          </div>

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

          {/* Tier Perks Checklist */}
          {pass.perks && pass.perks.length > 0 && (
            <div
              style={{
                backgroundColor: isDark ? 'rgba(24, 24, 27, 0.5)' : FITFLIX_TOKENS.surfaceHighlight,
                borderColor: isDark ? '#27272a' : FITFLIX_TOKENS.border,
              }}
              className="rounded-xl p-3 border space-y-1"
            >
              <span
                style={{ color: isDark ? FITFLIX_TOKENS.primary : FITFLIX_TOKENS.primaryDark }}
                className="text-[10px] uppercase font-bold tracking-wider block mb-1"
              >
                INCLUDED PASS PERKS
              </span>
              {pass.perks.map((perk, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: isDark ? '#e4e4e7' : FITFLIX_TOKENS.textPrimary }}
                >
                  <IconCheck
                    style={{ color: FITFLIX_TOKENS.primaryDark }}
                    className="h-3.5 w-3.5 shrink-0 stroke-[2.5]"
                  />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sponsors Footer Strip */}
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
