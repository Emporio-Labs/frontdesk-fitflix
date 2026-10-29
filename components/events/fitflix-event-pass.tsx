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
  IconFlame,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { DigitalPassResponse } from '@/lib/services/event.service'

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

  const accentColor = pass.badgeColor || '#10b981'
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
          dark: '#09090b',
          light: '#ffffff',
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
        className={`${
          isDark
            ? 'bg-[#0b0d10] border-zinc-800/90 text-white shadow-2xl'
            : 'bg-white border-zinc-200/90 text-zinc-950 shadow-xl shadow-zinc-950/5'
        } border rounded-3xl overflow-hidden relative select-none transition-colors duration-200`}
      >
        {/* Top Header Branding Section */}
        <div
          style={{
            borderBottom: `2px solid ${accentColor}`,
            background: isDark
              ? `linear-gradient(180deg, ${accentColor}18 0%, rgba(11, 13, 16, 0.98) 100%)`
              : `linear-gradient(180deg, ${accentColor}16 0%, #ffffff 100%)`,
          }}
          className="p-5 sm:p-6 space-y-3"
        >
          {/* Row 1: Brand Logos Lockup + Pass Tier Badge */}
          <div className="flex items-center justify-between gap-2.5">
            {hasCollaborator && primaryCollab ? (
              /* Co-Branded Layout: Company 1 Logo × Company 2 Logo */
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full min-w-0 ${
                  isDark
                    ? 'bg-black/75 border border-zinc-700/80 shadow-lg backdrop-blur-xs'
                    : 'bg-white/95 border border-zinc-200/90 shadow-xs'
                }`}
              >
                {/* Company 1: Fitflix Official Emblem & Wordmark */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    style={{ backgroundColor: accentColor }}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-black shrink-0 shadow-xs"
                  >
                    F
                  </span>
                  <span
                    className={`font-black text-xs tracking-wider ${
                      isDark ? 'text-white' : 'text-zinc-950'
                    }`}
                  >
                    FITFLIX
                  </span>
                </div>

                {/* Multiplier / Cross Separator */}
                <span className="text-zinc-400 text-xs font-black px-0.5 shrink-0">
                  ×
                </span>

                {/* Company 2: Partner Brand Logo & Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {primaryCollab.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={primaryCollab.logoUrl}
                      alt={primaryCollab.name}
                      className="h-4 w-auto max-w-[70px] object-contain rounded shrink-0 bg-white/10 p-0.5"
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
                    style={{ display: primaryCollab.logoUrl ? 'none' : 'flex' }}
                    className={`w-4 h-4 rounded-full border items-center justify-center text-[8px] font-black shrink-0 ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-800'
                    }`}
                  >
                    {primaryCollab.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span
                    className={`font-bold text-xs truncate max-w-[150px] sm:max-w-[190px] ${
                      isDark ? 'text-zinc-100' : 'text-zinc-900'
                    }`}
                  >
                    {primaryCollab.name}
                  </span>
                </div>
              </div>
            ) : (
              /* Single Company Event: Official Fitflix Emblem & Wordmark */
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  isDark
                    ? 'bg-black/75 border border-zinc-700/80 shadow-lg backdrop-blur-xs'
                    : 'bg-white/95 border border-zinc-200/90 shadow-xs'
                }`}
              >
                <span
                  style={{ backgroundColor: accentColor }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-black shrink-0 shadow-xs"
                >
                  F
                </span>
                <span
                  className={`font-black text-xs tracking-widest ${
                    isDark ? 'text-white' : 'text-zinc-950'
                  }`}
                >
                  FITFLIX
                </span>
                <span
                  style={{
                    borderColor: `${accentColor}40`,
                    color: accentColor,
                    backgroundColor: `${accentColor}15`,
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
                backgroundColor: accentColor,
                color: '#000000',
                boxShadow: `0 0 16px ${accentColor}40`,
              }}
              className="font-black text-[10px] tracking-wider uppercase border-none px-2.5 py-1 shrink-0"
            >
              {pass.badgeLabel || 'GENERAL PASS'}
            </Badge>
          </div>

          {/* Row 2: Event Title & Tagline */}
          <div className="space-y-0.5 pt-0.5">
            <h2
              className={`text-base sm:text-lg font-black tracking-tight leading-snug ${
                isDark ? 'text-white' : 'text-zinc-950'
              }`}
            >
              {event.title}
            </h2>
            {event.tagline && (
              <p
                className={`text-xs line-clamp-1 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600 font-medium'
                }`}
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
                style={{ color: accentColor }}
                className="text-[10px] uppercase font-bold tracking-wider block"
              >
                ATTENDEE
              </span>
              <p
                className={`text-xl font-black uppercase tracking-tight truncate ${
                  isDark ? 'text-white' : 'text-zinc-950'
                }`}
              >
                {pass.attendeeName}
              </p>
              <p
                className={`text-xs font-mono truncate ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {pass.attendeeEmail}
              </p>
            </div>

            <div className="text-right space-y-0.5 shrink-0">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider block ${
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                TICKET NUMBER
              </span>
              <span
                style={{
                  color: accentColor,
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}12`,
                }}
                className="text-xs font-mono font-black px-2.5 py-1 rounded-md border inline-block tracking-wide"
              >
                {pass.ticketId}
              </span>
            </div>
          </div>

          {/* Perforated Divider with Circular Punch-outs */}
          <div className="relative my-3">
            <div
              style={{ borderColor: `${accentColor}35` }}
              className="border-t-2 border-dashed w-full"
            />
            <div
              className={`absolute -left-9 -top-3 w-6 h-6 rounded-full border-r ${
                isDark
                  ? 'bg-[#0b0d10] border-zinc-800'
                  : 'bg-zinc-100 border-zinc-200'
              }`}
            />
            <div
              className={`absolute -right-9 -top-3 w-6 h-6 rounded-full border-l ${
                isDark
                  ? 'bg-[#0b0d10] border-zinc-800'
                  : 'bg-zinc-100 border-zinc-200'
              }`}
            />
          </div>

          {/* Central QR Code Window */}
          <div
            className={`flex flex-col items-center justify-center p-5 rounded-2xl border ${
              isDark
                ? 'bg-white border-zinc-200 shadow-inner'
                : 'bg-zinc-50/80 border-zinc-200/80 shadow-xs'
            }`}
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
            <div className="mt-2 text-center">
              <span className="text-[11px] font-black tracking-widest text-zinc-900 uppercase block">
                PRESENT FOR FAST-TRACK ENTRY
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block">
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
                    : 'bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-xs'
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
                  borderColor: `${accentColor}40`,
                  backgroundColor: `${accentColor}10`,
                  color: accentColor,
                }}
                className="border font-bold px-3 py-1 rounded-full text-[11px] tracking-wider uppercase flex items-center gap-1.5"
              >
                <span
                  style={{ backgroundColor: accentColor }}
                  className="h-2 w-2 rounded-full animate-ping"
                />
                READY FOR ON-SITE SCANNING
              </div>
            )}
          </div>

          {/* Event Logistics & Venue Card */}
          <div
            className={`rounded-2xl p-4 border space-y-2 text-xs shadow-xs ${
              isDark
                ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-300'
                : 'bg-zinc-50/90 border-zinc-200/80 text-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCalendar
                  style={{ color: accentColor }}
                  className="h-4 w-4 shrink-0"
                />
                <span
                  className={`font-semibold ${
                    isDark ? 'text-white' : 'text-zinc-950'
                  }`}
                >
                  {formattedDate}
                </span>
              </div>
              <div
                className={`flex items-center gap-1.5 font-mono ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                <IconClock
                  style={{ color: accentColor }}
                  className="h-3.5 w-3.5 shrink-0"
                />
                <span>{event.reportingTime}</span>
              </div>
            </div>

            <div
              className={`flex items-start justify-between gap-2 pt-1 border-t ${
                isDark ? 'border-zinc-800/60' : 'border-zinc-200/80'
              }`}
            >
              <div className="flex items-start gap-2 truncate">
                <IconMapPin
                  style={{ color: accentColor }}
                  className="h-4 w-4 shrink-0 mt-0.5"
                />
                <div className="truncate">
                  <p
                    className={`font-bold truncate ${
                      isDark ? 'text-white' : 'text-zinc-950'
                    }`}
                  >
                    {event.venue.name}
                  </p>
                  <p
                    className={`text-[11px] truncate ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
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
                    color: accentColor,
                    backgroundColor: `${accentColor}15`,
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
              className={`rounded-xl p-3 border space-y-1 ${
                isDark
                  ? 'bg-zinc-950/50 border-zinc-800/60'
                  : 'bg-zinc-50/90 border-zinc-200/80'
              }`}
            >
              <span
                style={{ color: accentColor }}
                className="text-[10px] uppercase font-bold tracking-wider block mb-1"
              >
                INCLUDED PASS PERKS
              </span>
              {pass.perks.map((perk, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 text-xs ${
                    isDark ? 'text-zinc-300' : 'text-zinc-800 font-medium'
                  }`}
                >
                  <IconCheck
                    style={{ color: accentColor }}
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sponsors Footer Strip */}
          {event.sponsors && event.sponsors.length > 0 && (
            <div
              className={`pt-2 text-center border-t space-y-1.5 ${
                isDark ? 'border-zinc-800/60' : 'border-zinc-200/80'
              }`}
            >
              <span
                className={`text-[9px] uppercase tracking-widest font-bold block ${
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                COMMUNITY PARTNERS & SPONSORS
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {event.sponsors.map((s, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                      isDark
                        ? 'text-zinc-400 bg-zinc-950 border-zinc-800/80'
                        : 'text-zinc-700 bg-white border-zinc-200/90 shadow-xs'
                    }`}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <Button
            variant="outline"
            onClick={handleDownloadIcs}
            className={`text-xs gap-1.5 ${
              isDark
                ? 'border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200'
                : 'border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs'
            }`}
          >
            <IconCalendar style={{ color: accentColor }} className="h-4 w-4" />
            Add to Calendar
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            className={`text-xs gap-1.5 ${
              isDark
                ? 'border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200'
                : 'border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs'
            }`}
          >
            <IconShare style={{ color: accentColor }} className="h-4 w-4" />
            {copied ? 'Link Copied!' : 'Share Pass'}
          </Button>
          <Button
            onClick={() => window.print()}
            style={{
              backgroundColor: accentColor,
              color: '#000000',
              boxShadow: `0 8px 20px ${accentColor}30`,
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
