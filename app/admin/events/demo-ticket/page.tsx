'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  IconArrowLeft,
  IconSparkles,
  IconTicket,
  IconCheck,
  IconQrcode,
  IconUser,
  IconBuildingStore,
  IconAdjustmentsHorizontal,
  IconShieldCheck,
  IconShare,
  IconDownload,
  IconCalendar,
} from '@tabler/icons-react'
import { getEvents, type FitflixEvent, type TicketTier, type DigitalPassResponse } from '@/lib/services/event.service'
import { FitflixEventPass } from '@/components/events/fitflix-event-pass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

function DemoTicketContent() {
  const searchParams = useSearchParams()
  const preselectedEventId = searchParams?.get('eventId')

  const [events, setEvents] = useState<FitflixEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Interactive Live Customizer State
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null)
  const [attendeeName, setAttendeeName] = useState('Yeshwanth Reddy')
  const [attendeeEmail, setAttendeeEmail] = useState('yeshwanth.reddy@fitflix.in')
  const [attendeePhone, setAttendeePhone] = useState('+91 98765 43210')
  const [ticketNumber, setTicketNumber] = useState('FFX-COM2-9842')
  const [isCheckedIn, setIsCheckedIn] = useState(false)

  // 1. Load active events
  useEffect(() => {
    setLoading(true)
    getEvents()
      .then((data) => {
        setEvents(data)
        if (data.length > 0) {
          const initial = preselectedEventId
            ? data.find((e) => e.id === preselectedEventId || e._id === preselectedEventId) || data[0]
            : data[0]
          setSelectedEventId(initial.id || initial._id || '')
        }
      })
      .catch((err) => {
        console.error('Failed to load events:', err)
        toast.error('Failed to load events catalog')
      })
      .finally(() => setLoading(false))
  }, [preselectedEventId])

  // Current active event
  const currentEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId || e._id === selectedEventId) || null
  }, [events, selectedEventId])

  // Update selected tier when event changes
  useEffect(() => {
    if (currentEvent?.ticketTiers && currentEvent.ticketTiers.length > 0) {
      setSelectedTier(currentEvent.ticketTiers[0])
      const cleanSlug = currentEvent.slug.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'PASS'
      setTicketNumber(`FFX-${cleanSlug}-9842`)
    } else {
      setSelectedTier({
        tierId: 'default_general_pass',
        name: 'General Admission Pass',
        badgeLabel: 'GENERAL PASS',
        badgeColor: '#10b981',
        type: 'free',
        price: 0,
        totalQuantity: 100,
        perks: ['Official Event Kit', 'Access to Workout & Community Zones'],
      })
    }
  }, [currentEvent])

  // Build the mock DigitalPassResponse for the live preview
  const livePassData: DigitalPassResponse | null = useMemo(() => {
    if (!currentEvent || !selectedTier) return null

    return {
      pass: {
        id: 'mock-pass-preview-id',
        ticketId: ticketNumber,
        tierId: selectedTier.tierId,
        tierName: selectedTier.name,
        badgeLabel: selectedTier.badgeLabel || 'GENERAL PASS',
        badgeColor: selectedTier.badgeColor || '#10b981',
        perks: selectedTier.perks || [],
        attendeeName: attendeeName || 'Attendee Name',
        attendeeEmail: attendeeEmail || 'attendee@fitflix.in',
        attendeePhone: attendeePhone || '+91 98765 43210',
        answers: { tshirtSize: 'L' },
        checkedIn: isCheckedIn,
        checkedInAt: isCheckedIn ? new Date().toISOString() : undefined,
        paymentStatus: selectedTier.price > 0 ? 'paid' : 'free',
        amountPaid: selectedTier.price || 0,
        verificationToken: 'token_preview_sample_hex',
        qrPayload: JSON.stringify({
          ticketId: ticketNumber,
          eventId: currentEvent.id || currentEvent._id,
          token: 'token_preview_sample_hex',
        }),
        createdAt: new Date().toISOString(),
      },
      event: {
        id: currentEvent.id || currentEvent._id || 'mock-event-id',
        title: currentEvent.title,
        slug: currentEvent.slug,
        tagline: currentEvent.tagline,
        description: currentEvent.description,
        startDate: currentEvent.startDate,
        endDate: currentEvent.endDate,
        reportingTime: currentEvent.reportingTime,
        venue: currentEvent.venue,
        coverImageUrl: currentEvent.coverImageUrl,
        collaborators: currentEvent.collaborators,
        sponsors: currentEvent.sponsors,
      },
    }
  }, [currentEvent, selectedTier, attendeeName, attendeeEmail, attendeePhone, ticketNumber, isCheckedIn])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 text-sm font-mono">Loading Demo Pass Studio...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-16 selection:bg-emerald-500 selection:text-black">
      {/* Top Studio Navbar */}
      <div className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/events">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900">
                <IconArrowLeft className="h-4 w-4" />
                Back to Events
              </Button>
            </Link>
            <div className="h-4 w-px bg-zinc-800" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                  <IconTicket className="h-4 w-4 text-emerald-400" />
                  Live Event Pass Studio
                </h1>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono">
                  LIVE PREVIEW
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Simulate and test how the attendee ticket pass looks and scans.
              </p>
            </div>
          </div>

          {currentEvent && (
            <div className="flex items-center gap-2">
              <Link href={`/events/${currentEvent.slug}`} target="_blank">
                <Button variant="outline" size="sm" className="h-8 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300">
                  Open Public Registration Page
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Controls */}
          <div className="lg:col-span-6 space-y-6">
            {/* Event Selector Card */}
            <Card className="bg-zinc-950 border-zinc-800 text-white shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-200">
                  <IconBuildingStore className="h-4 w-4 text-emerald-400" />
                  1. Select Event Context
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Choose which offline event to generate and preview passes for.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-sm text-zinc-200 focus:ring-emerald-500">
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    {events.map((evt) => (
                      <SelectItem key={evt.id || evt._id} value={evt.id || evt._id || ''}>
                        {evt.title} ({evt.venue?.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {currentEvent && (
                  <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80 text-xs text-zinc-300 space-y-1">
                    <p className="font-semibold text-white">{currentEvent.venue.name}, {currentEvent.venue.city}</p>
                    <p className="text-zinc-400">
                      {new Date(currentEvent.startDate).toLocaleDateString('en-IN', { dateStyle: 'full' })} • Reporting: {currentEvent.reportingTime}
                    </p>
                    {currentEvent.collaborators && currentEvent.collaborators.length > 0 && (
                      <p className="text-emerald-400 text-[11px] font-medium pt-0.5">
                        Co-Host: {currentEvent.collaborators[0].name} ({currentEvent.collaborators[0].role})
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pass Tier Selector Card */}
            <Card className="bg-zinc-950 border-zinc-800 text-white shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-200">
                  <IconTicket className="h-4 w-4 text-emerald-400" />
                  2. Select Pass Tier Preset
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Switch between ticket tiers to see how the pass colors, badges, and perks update.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {currentEvent?.ticketTiers && currentEvent.ticketTiers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentEvent.ticketTiers.map((tier) => {
                      const isSelected = selectedTier?.tierId === tier.tierId
                      return (
                        <button
                          key={tier.tierId}
                          type="button"
                          onClick={() => setSelectedTier(tier)}
                          style={{
                            borderColor: isSelected ? tier.badgeColor || '#10b981' : undefined,
                            backgroundColor: isSelected ? `${tier.badgeColor || '#10b981'}15` : undefined,
                          }}
                          className={`p-3 rounded-xl border text-left transition-all relative ${
                            isSelected
                              ? 'shadow-md'
                              : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge
                              style={{
                                backgroundColor: tier.badgeColor || '#10b981',
                                color: '#000',
                              }}
                              className="text-[9px] font-black uppercase border-none px-2 py-0.5"
                            >
                              {tier.badgeLabel}
                            </Badge>
                            <span className="text-xs font-bold text-white">
                              {tier.price === 0 ? 'FREE' : `₹${tier.price}`}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white truncate">{tier.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            {tier.perks?.length || 0} perks included
                          </p>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No custom tiers configured on this event.</p>
                )}
              </CardContent>
            </Card>

            {/* Attendee Identity Customizer Card */}
            <Card className="bg-zinc-950 border-zinc-800 text-white shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-200">
                  <IconUser className="h-4 w-4 text-emerald-400" />
                  3. Customize Attendee & Ticket Number
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Type any test name to see live typography scaling on the pass card.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">Attendee Name</Label>
                    <Input
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-sm focus-visible:ring-emerald-500 font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">Ticket Number</Label>
                    <Input
                      value={ticketNumber}
                      onChange={(e) => setTicketNumber(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-sm font-mono text-emerald-400 focus-visible:ring-emerald-500 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">Attendee Email</Label>
                    <Input
                      type="email"
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-xs focus-visible:ring-emerald-500 text-zinc-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">Attendee Phone</Label>
                    <Input
                      value={attendeePhone}
                      onChange={(e) => setAttendeePhone(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-xs focus-visible:ring-emerald-500 text-zinc-400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Check-In State Simulator Card */}
            <Card className="bg-zinc-950 border-zinc-800 text-white shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-200">
                  <IconShieldCheck className="h-4 w-4 text-emerald-400" />
                  4. Live Check-In State Simulator
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Toggle check-in to see how the status stamp animates when scanned by FrontDesk staff.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-white block">
                      {isCheckedIn ? 'Status: CHECKED IN AT ENTRANCE' : 'Status: READY FOR ON-SITE SCANNING'}
                    </Label>
                    <p className="text-[11px] text-zinc-400">
                      {isCheckedIn
                        ? 'Pass shows verified entry badge with timestamp.'
                        : 'Pass shows active pulsing scan-ready indicator.'}
                    </p>
                  </div>
                  <Switch
                    checked={isCheckedIn}
                    onCheckedChange={setIsCheckedIn}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Demo Pass Preview */}
          <div className="lg:col-span-6 flex flex-col items-center sticky top-24">
            <div className="w-full flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <IconQrcode className="h-4 w-4 text-emerald-400" />
                Live Attendee Ticket View
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Real-Time Anti-Aliased QR
              </span>
            </div>

            {livePassData ? (
              <FitflixEventPass passData={livePassData} showActions={true} />
            ) : (
              <div className="p-12 text-center text-zinc-500 border border-zinc-800 rounded-3xl w-full">
                No event selected
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DemoTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
          <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-400 text-sm font-mono">Loading Demo Pass Studio...</p>
        </div>
      }
    >
      <DemoTicketContent />
    </Suspense>
  )
}
