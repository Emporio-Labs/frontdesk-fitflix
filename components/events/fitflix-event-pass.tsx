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
}

export function FitflixEventPass({ passData, showActions = true }: FitflixEventPassProps) {
  const { pass, event } = passData
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
        className="bg-[#0b0d10] border border-zinc-800/90 rounded-3xl overflow-hidden shadow-2xl relative select-none"
      >
        {/* Top Header Branding Section */}
        <div
          style={{
            borderBottom: `2px solid ${accentColor}`,
            background: `linear-gradient(180deg, ${accentColor}18 0%, rgba(11, 13, 16, 0.98) 100%)`,
          }}
          className="p-5 sm:p-6 space-y-3"
        >
          {/* Row 1: Brand Logos Lockup + Pass Tier Badge */}
          <div className="flex items-center justify-between gap-2.5">
            {hasCollaborator && primaryCollab ? (
              /* Co-Branded Layout: Company 1 Logo × Company 2 Logo */
              <div className="flex items-center gap-2 bg-black/75 border border-zinc-700/80 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-xs min-w-0">
                {/* Company 1: Fitflix Official Emblem & Wordmark */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    style={{ backgroundColor: accentColor }}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-black shrink-0 shadow-xs"
                  >
                    F
                  </span>
                  <span className="font-black text-xs tracking-wider text-white">
                    FITFLIX
                  </span>
                </div>

                {/* Multiplier / Cross Separator */}
                <span className="text-zinc-400 text-xs font-black px-0.5 shrink-0">×</span>

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
                        const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  {/* Fallback initials badge if no logoUrl or image error */}
                  <span
                    style={{ display: primaryCollab.logoUrl ? 'none' : 'flex' }}
                    className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 items-center justify-center text-[8px] font-black text-zinc-200 shrink-0"
                  >
                    {primaryCollab.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="font-bold text-xs text-zinc-100 truncate max-w-[150px] sm:max-w-[190px]">
                    {primaryCollab.name}
                  </span>
                </div>
              </div>
            ) : (
              /* Single Company Event: Official Fitflix Emblem & Wordmark */
              <div className="flex items-center gap-2 bg-black/75 border border-zinc-700/80 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-xs">
                <span
                  style={{ backgroundColor: accentColor }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-black shrink-0 shadow-xs"
                >
                  F
                </span>
                <span className="font-black text-xs tracking-widest text-white">
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
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
              {event.title}
            </h2>
            {event.tagline && (
              <p className="text-xs text-zinc-400 line-clamp-1">{event.tagline}</p>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Attendee Identity & Ticket Number */}
          <div className="flex justify-between items-start gap-3">
            <div className="space-y-0.5 min-w-0">
              <span
                style={{ color: accentColor }}
                className="text-[10px] uppercase font-bold tracking-wider block"
              >
                ATTENDEE
              </span>
              <p className="text-xl font-black text-white uppercase tracking-tight truncate">
                {pass.attendeeName}
              </p>
              <p className="text-xs text-zinc-400 font-mono truncate">
                {pass.attendeeEmail}
              </p>
            </div>

            <div className="text-right space-y-0.5 shrink-0">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
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
            <div className="absolute -left-9 -top-3 w-6 h-6 bg-[#0b0d10] rounded-full border-r border-zinc-800" />
            <div className="absolute -right-9 -top-3 w-6 h-6 bg-[#0b0d10] rounded-full border-l border-zinc-800" />
          </div>

          {/* High-Contrast Central QR Code Window */}
          <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-inner border border-zinc-200">
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
              <div className="bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400 font-black px-4 py-1.5 rounded-full text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 animate-pulse">
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
          <div className="bg-zinc-950/80 rounded-2xl p-4 border border-zinc-800/80 space-y-2 text-xs text-zinc-300 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCalendar
                  style={{ color: accentColor }}
                  className="h-4 w-4 shrink-0"
                />
                <span className="font-semibold text-white">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400 font-mono">
                <IconClock
                  style={{ color: accentColor }}
                  className="h-3.5 w-3.5 shrink-0"
                />
                <span>{event.reportingTime}</span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-2 pt-1 border-t border-zinc-800/60">
              <div className="flex items-start gap-2 truncate">
                <IconMapPin
                  style={{ color: accentColor }}
                  className="h-4 w-4 shrink-0 mt-0.5"
                />
                <div className="truncate">
                  <p className="font-bold text-white truncate">{event.venue.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">
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
            <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/60 space-y-1">
              <span
                style={{ color: accentColor }}
                className="text-[10px] uppercase font-bold tracking-wider block mb-1"
              >
                INCLUDED PASS PERKS
              </span>
              {pass.perks.map((perk, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-300">
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
            <div className="pt-2 text-center border-t border-zinc-800/60 space-y-1.5">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block">
                COMMUNITY PARTNERS & SPONSORS
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {event.sponsors.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono font-medium text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80"
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
            className="border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-xs gap-1.5 text-zinc-200"
          >
            <IconCalendar style={{ color: accentColor }} className="h-4 w-4" />
            Add to Calendar
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            className="border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-xs gap-1.5 text-zinc-200"
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
