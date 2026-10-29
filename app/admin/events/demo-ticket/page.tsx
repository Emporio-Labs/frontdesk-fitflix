'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  IconArrowLeft,
  IconTicket,
  IconBuildingStore,
  IconUser,
  IconShieldCheck,
  IconQrcode,
  IconExternalLink,
  IconCheck,
} from '@tabler/icons-react'
import {
  getEvents,
  type FitflixEvent,
  type TicketTier,
  type DigitalPassResponse,
} from '@/lib/services/event.service'
import { FitflixEventPass } from '@/components/events/fitflix-event-pass'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
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
            ? data.find(
                (e) => e.id === preselectedEventId || e._id === preselectedEventId
              ) || data[0]
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
    return (
      events.find(
        (e) => e.id === selectedEventId || e._id === selectedEventId
      ) || null
    )
  }, [events, selectedEventId])

  // Update selected tier when event changes
  useEffect(() => {
    if (currentEvent?.ticketTiers && currentEvent.ticketTiers.length > 0) {
      setSelectedTier(currentEvent.ticketTiers[0])
      const cleanSlug =
        currentEvent.slug
          .replace(/[^a-z0-9]/gi, '')
          .slice(0, 4)
          .toUpperCase() || 'PASS'
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
        perks: selectedTier.perks || [
          'Official Event Kit',
          'Access to Workout & Community Zones',
        ],
        attendeeName: attendeeName.trim() || 'Attendee Name',
        attendeeEmail: attendeeEmail.trim() || 'attendee@example.com',
        attendeePhone: attendeePhone.trim() || '+91 98765 43210',
        checkedIn: isCheckedIn,
        checkedInAt: isCheckedIn ? new Date().toISOString() : undefined,
        paymentStatus: selectedTier.price === 0 ? 'free_claim' : 'paid',
        amountPaid: selectedTier.price,
        verificationToken: 'token_mock_preview_123',
        qrPayload: JSON.stringify({
          ticketId: ticketNumber,
          eventId: currentEvent.id || currentEvent._id,
          token: 'token_mock_preview_123',
        }),
        createdAt: new Date().toISOString(),
      },
      event: {
        id: currentEvent.id || currentEvent._id || '',
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
  }, [
    currentEvent,
    selectedTier,
    attendeeName,
    attendeeEmail,
    attendeePhone,
    ticketNumber,
    isCheckedIn,
  ])

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-6">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
          <div className="lg:col-span-6 flex justify-center">
            <Skeleton className="h-[600px] w-full max-w-md rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link
              href="/admin/events"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <IconArrowLeft className="h-3.5 w-3.5" /> Events
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Demo Pass Studio</span>
          </div>

          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <IconTicket className="h-6 w-6 text-primary" />
              Live Event Pass Studio
            </h1>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold"
            >
              LIVE PREVIEW
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            Simulate, customize, and inspect how attendee passes render and scan across tiers and branding.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <Link href="/admin/events">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <IconArrowLeft className="h-3.5 w-3.5" />
              Back to Events
            </Button>
          </Link>

          {currentEvent && (
            <Link href={`/events/${currentEvent.slug}`} target="_blank">
              <Button variant="secondary" size="sm" className="h-9 text-xs gap-1.5">
                <IconExternalLink className="h-3.5 w-3.5" />
                Public Page
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid: Controls on Left, Live Pass Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Controls */}
        <div className="lg:col-span-6 space-y-6">
          {/* 1. Event Selector Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <IconBuildingStore className="h-4 w-4 text-primary" />
                1. Select Event Context
              </CardTitle>
              <CardDescription className="text-xs">
                Choose which offline event to generate and preview passes for.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((evt) => (
                    <SelectItem
                      key={evt.id || evt._id}
                      value={evt.id || evt._id || ''}
                      className="text-xs"
                    >
                      {evt.title} ({evt.venue?.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentEvent && (
                <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1">
                  <p className="font-semibold text-foreground">
                    {currentEvent.venue.name}, {currentEvent.venue.city}
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(currentEvent.startDate).toLocaleDateString('en-IN', {
                      dateStyle: 'full',
                    })}{' '}
                    • Reporting: {currentEvent.reportingTime}
                  </p>
                  {currentEvent.collaborators &&
                    currentEvent.collaborators.length > 0 && (
                      <p className="text-primary text-[11px] font-medium pt-0.5">
                        Co-Host: {currentEvent.collaborators[0].name} (
                        {currentEvent.collaborators[0].role})
                      </p>
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Pass Tier Selector Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <IconTicket className="h-4 w-4 text-emerald-500" />
                2. Select Pass Tier Preset
              </CardTitle>
              <CardDescription className="text-xs">
                Switch between ticket tiers to see how pass colors, badge labels, and perks update.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {currentEvent?.ticketTiers &&
              currentEvent.ticketTiers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentEvent.ticketTiers.map((tier) => {
                    const isSelected = selectedTier?.tierId === tier.tierId
                    const badgeColor = tier.badgeColor || '#10b981'
                    return (
                      <button
                        key={tier.tierId}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        style={{
                          borderColor: isSelected ? badgeColor : undefined,
                          backgroundColor: isSelected
                            ? `${badgeColor}15`
                            : undefined,
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'ring-1 ring-offset-1 ring-primary/30 shadow-xs'
                            : 'border-border bg-card hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: `${badgeColor}25`,
                              color: badgeColor,
                            }}
                          >
                            {tier.badgeLabel}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {tier.price === 0 ? 'FREE' : `₹${tier.price}`}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-foreground truncate">
                          {tier.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {tier.perks?.length || 0} perks included
                        </p>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No custom tiers configured on this event.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 3. Attendee Identity Customizer Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <IconUser className="h-4 w-4 text-blue-500" />
                3. Customize Attendee & Ticket Number
              </CardTitle>
              <CardDescription className="text-xs">
                Type any test name to see live typography scaling and auto-fit on the pass.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Attendee Name</Label>
                  <Input
                    value={attendeeName}
                    onChange={(e) => setAttendeeName(e.target.value)}
                    className="h-8 text-xs font-semibold"
                    placeholder="e.g. Yeshwanth Reddy"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Ticket Number</Label>
                  <Input
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    className="h-8 text-xs font-mono text-primary font-bold"
                    placeholder="e.g. FFX-PASS-9842"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Attendee Email</Label>
                  <Input
                    type="email"
                    value={attendeeEmail}
                    onChange={(e) => setAttendeeEmail(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="name@fitflix.in"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Attendee Phone</Label>
                  <Input
                    value={attendeePhone}
                    onChange={(e) => setAttendeePhone(e.target.value)}
                    className="h-8 text-xs font-mono"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Check-In State Simulator Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <IconShieldCheck className="h-4 w-4 text-emerald-500" />
                4. Live Check-In State Simulator
              </CardTitle>
              <CardDescription className="text-xs">
                Toggle check-in to inspect how the visual status badge animates upon entrance scanning.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-3.5 bg-muted/40 rounded-lg border border-border flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-foreground block">
                    {isCheckedIn
                      ? 'Status: CHECKED IN AT ENTRANCE'
                      : 'Status: READY FOR ON-SITE SCANNING'}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {isCheckedIn
                      ? 'Pass displays verified green check-in stamp with timestamp.'
                      : 'Pass displays active scan-ready indicator for desk cameras.'}
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
        <div className="lg:col-span-6 flex flex-col items-center sticky top-6">
          <div className="w-full flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IconQrcode className="h-4 w-4 text-primary" />
              Live Attendee Ticket View
            </span>
            <Badge
              variant="secondary"
              className="text-[10px] font-mono font-medium"
            >
              Anti-Aliased High-Contrast QR
            </Badge>
          </div>

          {/* Showcase Canvas Frame */}
          <div className="w-full p-4 sm:p-6 rounded-2xl border border-border bg-muted/20 flex flex-col items-center justify-center shadow-xs">
            {livePassData ? (
              <FitflixEventPass passData={livePassData} showActions={true} />
            ) : (
              <div className="p-12 text-center text-muted-foreground border border-dashed rounded-2xl w-full">
                No event selected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DemoTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <DemoTicketContent />
    </Suspense>
  )
}
