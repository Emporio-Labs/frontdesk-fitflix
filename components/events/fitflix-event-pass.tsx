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

export interface FitflixEventPassProps {
  passData: DigitalPassResponse
  showActions?: boolean
}

export function FitflixEventPass({ passData, showActions = true }: FitflixEventPassProps) {
  const { pass, event } = passData
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const ticketRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pass.qrPayload || pass.ticketId) {
      const payload = pass.qrPayload || JSON.stringify({
        ticketId: pass.ticketId,
        token: pass.verificationToken,
        eventId: event.id,
      })
      QRCode.toDataURL(payload, {
        width: 360,
        margin: 2,
        color: {
          dark: '#000000',
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
      {/* Fitflix Official Tear-off Pass Card Container */}
      <div
        ref={ticketRef}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative select-none"
      >
        {/* Top Header Strip with Tier Badge */}
        <div
          style={{
            backgroundColor: pass.badgeColor ? `${pass.badgeColor}20` : '#10b98120',
            borderBottom: `2px solid ${pass.badgeColor || '#10b981'}`,
          }}
          className="px-6 py-4 flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs tracking-wider text-white">FITFLIX</span>
              {event.collaborators && event.collaborators.length > 0 && (
                <>
                  <span className="text-zinc-500 text-xs">×</span>
                  <span className="text-xs font-bold text-zinc-300 truncate max-w-[140px]">
                    {event.collaborators[0].name}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-sm font-black text-white truncate max-w-[240px] mt-0.5">
              {event.title}
            </h2>
          </div>

          <Badge
            style={{
              backgroundColor: pass.badgeColor || '#10b981',
              color: '#000000',
            }}
            className="font-extrabold text-[11px] tracking-wider uppercase border-none px-2.5 py-1 shadow-md"
          >
            {pass.badgeLabel || 'GENERAL PASS'}
          </Badge>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5">
          {/* Attendee Identity & Ticket ID */}
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
                ATTENDEE
              </span>
              <p className="text-xl font-extrabold text-white uppercase tracking-tight">
                {pass.attendeeName}
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                {pass.attendeeEmail}
              </p>
            </div>

            <div className="text-right space-y-0.5">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
                TICKET NUMBER
              </span>
              <span
                style={{
                  color: pass.badgeColor || '#10b981',
                  borderColor: `${pass.badgeColor || '#10b981'}50`,
                }}
                className="text-xs font-mono font-black bg-zinc-950 px-2.5 py-1 rounded-md border inline-block"
              >
                {pass.ticketId}
              </span>
            </div>
          </div>

          {/* Perforated Divider with Circular Punch-outs */}
          <div className="relative my-3">
            <div className="border-t-2 border-dashed border-zinc-700/80 w-full" />
            <div className="absolute -left-9 -top-3 w-6 h-6 bg-zinc-950 rounded-full border-r border-zinc-800" />
            <div className="absolute -right-9 -top-3 w-6 h-6 bg-zinc-950 rounded-full border-l border-zinc-800" />
          </div>

          {/* High-Contrast Central QR Code */}
          <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-inner border border-zinc-200">
            {qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
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
          <div className="flex items-center justify-center pt-1">
            {pass.checkedIn ? (
              <div className="bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400 font-black px-4 py-1.5 rounded-full text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 animate-pulse">
                <IconShieldCheck className="h-4 w-4" />
                CHECKED IN AT {pass.checkedInAt ? new Date(pass.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ENTRANCE'}
              </div>
            ) : (
              <div className="bg-zinc-800/60 border border-zinc-700/80 text-zinc-300 font-bold px-3 py-1 rounded-full text-[11px] tracking-wider uppercase flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                READY FOR ON-SITE SCANNING
              </div>
            )}
          </div>

          {/* Event Logistics & Venue Card */}
          <div className="bg-zinc-950/70 rounded-2xl p-4 border border-zinc-800/80 space-y-2 text-xs text-zinc-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCalendar className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400 font-mono">
                <IconClock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>{event.reportingTime}</span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-2 pt-1 border-t border-zinc-800/60">
              <div className="flex items-start gap-2 truncate">
                <IconMapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="truncate">
                  <p className="font-bold text-white truncate">{event.venue.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{event.venue.address}, {event.venue.city}</p>
                </div>
              </div>
              {event.venue.googleMapsUrl && (
                <a
                  href={event.venue.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded-lg shrink-0"
                  title="Open in Google Maps"
                >
                  <IconExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Tier Perks Checklist */}
          {pass.perks && pass.perks.length > 0 && (
            <div className="bg-zinc-950/40 rounded-xl p-3 border border-zinc-800/50 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">
                INCLUDED PASS PERKS
              </span>
              {pass.perks.map((perk, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <IconCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
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
                    className="text-[10px] font-mono font-medium text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800"
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
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs gap-1.5 text-zinc-200"
          >
            <IconCalendar className="h-4 w-4 text-emerald-400" />
            Add to Calendar
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs gap-1.5 text-zinc-200"
          >
            <IconShare className="h-4 w-4 text-emerald-400" />
            {copied ? 'Link Copied!' : 'Share Pass'}
          </Button>
          <Button
            onClick={() => window.print()}
            className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-5 rounded-xl shadow-lg shadow-emerald-950/40 gap-2"
          >
            <IconDownload className="h-4 w-4" />
            Download / Print Digital Pass
          </Button>
        </div>
      )}
    </div>
  )
}
