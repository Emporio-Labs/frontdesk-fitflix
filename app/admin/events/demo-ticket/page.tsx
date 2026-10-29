'use client'

import { useEffect, useState, useMemo, useRef, Suspense } from 'react'
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
  IconUpload,
  IconX,
  IconSparkles,
} from '@tabler/icons-react'
import {
  getEvents,
  uploadEventImage,
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

// Default fallback tiers if an event has 0 custom tiers in the database (Harmonized with Fitflix Design System)
const DEFAULT_PREVIEW_TIERS: TicketTier[] = [
  {
    tierId: 'tier_vip_gold',
    name: 'All-Inclusive VIP Recovery Pass',
    badgeLabel: 'ALL ACCESS VIP',
    badgeColor: '#B08D57', // Luxury Brass
    type: 'paid',
    price: 1499,
    totalQuantity: 30,
    perks: [
      'Priority Starting Wave (Wave A)',
      'ActiveX Bio-Scan & Consultation',
      'Reserved Cold Plunge & Recovery Lounge',
      'Fitflix Hydro Flask Bottle',
    ],
  },
  {
    tierId: 'tier_super_early_bird',
    name: 'Super Early Bird Pass',
    badgeLabel: 'SUPER EARLY BIRD',
    badgeColor: '#8A965A', // Sage Olive
    type: 'paid',
    price: 299,
    totalQuantity: 50,
    perks: [
      'Official Fitflix Dri-FIT Running Tee',
      'RFID Timing Chip & Finisher Medal',
      'Post-Run Cold Plunge & Protein Shake',
    ],
  },
  {
    tierId: 'tier_general_runner',
    name: 'General Admission Pass',
    badgeLabel: 'RUNNER PASS',
    badgeColor: '#5C6B34', // Deep Olive
    type: 'paid',
    price: 499,
    totalQuantity: 150,
    perks: [
      'Official Fitflix Runner T-Shirt',
      'Finisher Medal',
      'Hydration & Recovery Zone Access',
    ],
  },
  {
    tierId: 'tier_member_community',
    name: 'Fitflix Member Community Pass',
    badgeLabel: 'MEMBER ACCESS',
    badgeColor: '#C2674E', // Terracotta
    type: 'free',
    price: 0,
    totalQuantity: 100,
    perks: [
      'Free Access to Community & Workout Zones',
      'Complimentary Energy Snack Pack',
    ],
  },
]

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
  const [passTheme, setPassTheme] = useState<'light' | 'dark'>('light')

  // Co-Branding & Partner Customizer State
  const [collabEnabled, setCollabEnabled] = useState(true)
  const [collabName, setCollabName] = useState('Red Bull')
  const [collabRole, setCollabRole] = useState('Official Energy Partner')
  const [collabLogo, setCollabLogo] = useState('/events/red-bull.svg')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Sync tiers and collaborator context when currentEvent changes
  useEffect(() => {
    if (!currentEvent) return

    // 1. Tier selection
    if (currentEvent.ticketTiers && currentEvent.ticketTiers.length > 0) {
      setSelectedTier(currentEvent.ticketTiers[0])
    } else {
      setSelectedTier(DEFAULT_PREVIEW_TIERS[0])
    }

    const cleanSlug =
      currentEvent.slug
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 4)
        .toUpperCase() || 'PASS'
    setTicketNumber(`FFX-${cleanSlug}-9842`)

    // 2. Collaborator preset sync
    if (currentEvent.collaborators && currentEvent.collaborators.length > 0) {
      const first = currentEvent.collaborators[0]
      setCollabEnabled(true)
      setCollabName(first.name)
      setCollabRole(first.role || 'Co-Host')
      setCollabLogo(first.logoUrl || '/events/chapter-5.svg')
    } else if (currentEvent.title.toLowerCase().includes('red bull')) {
      setCollabEnabled(true)
      setCollabName('Red Bull')
      setCollabRole('Official Energy Partner')
      setCollabLogo('/events/red-bull.svg')
    } else if (currentEvent.title.toLowerCase().includes('chapter 5')) {
      setCollabEnabled(true)
      setCollabName('Chapter 5 Speciality Coffee')
      setCollabRole('Co-Host & Roastery Partner')
      setCollabLogo('/events/chapter-5.svg')
    } else {
      setCollabEnabled(false)
      setCollabName('')
      setCollabRole('')
      setCollabLogo('')
    }
  }, [currentEvent])

  // Handle Logo Upload from local disk
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingLogo(true)
      // Instant local preview
      const localUrl = URL.createObjectURL(file)
      setCollabLogo(localUrl)

      // Upload to server S3 / local static storage
      const uploadedUrl = await uploadEventImage(file, 'collaborator')
      if (uploadedUrl) {
        setCollabLogo(uploadedUrl)
      }
      toast.success('Partner logo uploaded successfully!')
    } catch {
      toast.info('Using local image preview on pass.')
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 1-Click Preset applier
  const applyPreset = (preset: { name: string; role: string; logoUrl: string }) => {
    setCollabEnabled(true)
    setCollabName(preset.name)
    setCollabRole(preset.role)
    setCollabLogo(preset.logoUrl)
    toast.success(`Applied ${preset.name} co-branding`)
  }

  // Active tiers list to display (either event's custom tiers or default presets)
  const activeTiersList = useMemo(() => {
    if (currentEvent?.ticketTiers && currentEvent.ticketTiers.length > 0) {
      return currentEvent.ticketTiers
    }
    return DEFAULT_PREVIEW_TIERS
  }, [currentEvent])

  // Build the mock DigitalPassResponse for the live preview
  const livePassData: DigitalPassResponse | null = useMemo(() => {
    if (!currentEvent || !selectedTier) return null

    const collaboratorsList =
      collabEnabled && collabName.trim()
        ? [
            {
              name: collabName.trim(),
              role: collabRole.trim() || 'Co-Host',
              logoUrl: collabLogo.trim(),
            },
          ]
        : []

    return {
      pass: {
        id: 'mock-pass-preview-id',
        ticketId: ticketNumber,
        tierId: selectedTier.tierId,
        tierName: selectedTier.name,
        badgeLabel: selectedTier.badgeLabel || 'GENERAL PASS',
        badgeColor: selectedTier.badgeColor || '#8A965A',
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
        collaborators: collaboratorsList,
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
    collabEnabled,
    collabName,
    collabRole,
    collabLogo,
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
          <Skeleton className="lg:col-span-6 h-[600px] rounded-2xl" />
          <Skeleton className="lg:col-span-6 h-[600px] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
              <IconQrcode className="h-6 w-6 text-emerald-500" />
              Live Event Pass Studio
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold"
            >
              LIVE PREVIEW
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Simulate, customize, and inspect how attendee passes render and scan across tiers and branding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/events">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <IconArrowLeft className="h-3.5 w-3.5" />
              Back to Events
            </Button>
          </Link>

          {currentEvent && (
            <Link href={`/events/${currentEvent.slug}`} target="_blank">
              <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
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
        <div className="lg:col-span-6 space-y-5">
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
                  {collabEnabled && collabName && (
                    <p className="text-primary text-[11px] font-medium pt-0.5 flex items-center gap-1">
                      <IconSparkles className="h-3 w-3" />
                      Co-Host: {collabName} ({collabRole || 'Partner'})
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Co-Branding & Partner Logos Card (Live Customizer) */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <IconBuildingStore className="h-4 w-4 text-emerald-500" />
                  2. Co-Branding & Partner Logos
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="collab-toggle"
                    className="text-xs text-muted-foreground font-normal cursor-pointer"
                  >
                    {collabEnabled
                      ? 'Co-Branded (Company 1 × 2)'
                      : 'Single Company (Fitflix Only)'}
                  </Label>
                  <Switch
                    id="collab-toggle"
                    checked={collabEnabled}
                    onCheckedChange={setCollabEnabled}
                  />
                </div>
              </div>
              <CardDescription className="text-xs">
                Test how the pass updates between single-brand and multi-company partnerships.
              </CardDescription>
            </CardHeader>

            {collabEnabled && (
              <CardContent className="space-y-3.5 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Partner Brand Name</Label>
                    <Input
                      value={collabName}
                      onChange={(e) => setCollabName(e.target.value)}
                      className="h-8 text-xs font-semibold"
                      placeholder="e.g. Red Bull / Chapter 5 Coffee"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Partner Role / Title</Label>
                    <Input
                      value={collabRole}
                      onChange={(e) => setCollabRole(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="e.g. Official Energy Partner"
                    />
                  </div>
                </div>

                {/* Partner Logo Upload & Live Preview */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Partner Logo Image</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />

                  {collabLogo ? (
                    <div className="flex items-center justify-between border border-border rounded-lg p-2 bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={collabLogo}
                          alt="Partner logo"
                          className="h-7 w-auto max-w-[80px] object-contain rounded bg-white p-1 border border-border"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {collabName || 'Partner'} Logo
                          </p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <IconCheck className="h-3 w-3" /> Ready on Pass
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="h-7 text-xs gap-1"
                        >
                          <IconUpload className="h-3 w-3" />
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setCollabLogo('')}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Remove logo"
                        >
                          <IconX className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="w-full border-dashed h-10 gap-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <IconUpload className="h-4 w-4" />
                      {uploadingLogo
                        ? 'Uploading logo...'
                        : 'Upload Partner Logo (PNG, SVG, JPG)'}
                    </Button>
                  )}
                </div>

                {/* 1-Click Quick Presets */}
                <div className="space-y-1.5 pt-1 border-t border-border">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    QUICK PARTNER PRESETS
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        applyPreset({
                          name: 'Red Bull',
                          role: 'Official Energy Partner',
                          logoUrl: '/events/red-bull.svg',
                        })
                      }
                      className="h-7 text-xs gap-1.5 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20 font-semibold"
                    >
                      🔴 Red Bull
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        applyPreset({
                          name: 'Chapter 5 Speciality Coffee',
                          role: 'Co-Host & Roastery Partner',
                          logoUrl: '/events/chapter-5.svg',
                        })
                      }
                      className="h-7 text-xs gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20 font-semibold"
                    >
                      ☕ Chapter 5
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        applyPreset({
                          name: 'ActiveX Smart Health',
                          role: 'Bio-Scan & BCA Partner',
                          logoUrl: '/events/activex.svg',
                        })
                      }
                      className="h-7 text-xs gap-1.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 font-semibold"
                    >
                      ⚡ ActiveX
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        applyPreset({
                          name: 'Under Armour India',
                          role: 'Official Apparel Partner',
                          logoUrl: '/events/under-armour.svg',
                        })
                      }
                      className="h-7 text-xs gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20 font-semibold"
                    >
                      🛡️ Under Armour
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 3. Pass Tier Preset Selector Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <IconTicket className="h-4 w-4 text-emerald-500" />
                3. Select Pass Tier Preset
              </CardTitle>
              <CardDescription className="text-xs">
                Switch between ticket tiers to see how pass colors, badge labels, and perks update.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeTiersList.map((tier) => {
                  const isSelected = selectedTier?.tierId === tier.tierId
                  const badgeColor = tier.badgeColor || '#8A965A'
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
            </CardContent>
          </Card>

          {/* 4. Attendee Identity Customizer Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <IconUser className="h-4 w-4 text-blue-500" />
                4. Customize Attendee & Ticket Number
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

          {/* 5. Check-In State Simulator Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <IconShieldCheck className="h-4 w-4 text-emerald-500" />
                5. Live Check-In State Simulator
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
                      : 'Status: ACTIVE / UNCHECKED'}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {isCheckedIn
                      ? 'Pass displays verified green check-in stamp with timestamp.'
                      : 'Pass displays clean layout ready for entrance check-in.'}
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
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setPassTheme('light')}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                  passTheme === 'light'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Light Pass
              </button>
              <button
                type="button"
                onClick={() => setPassTheme('dark')}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                  passTheme === 'dark'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Dark Pass
              </button>
            </div>
          </div>

          {/* Showcase Canvas Frame (Harmonized Warm Ivory #F4F1E9 Scaffold) */}
          <div
            style={{
              backgroundColor: passTheme === 'dark' ? '#18181b' : '#F4F1E9',
              borderColor: passTheme === 'dark' ? '#27272a' : '#E7E0D2',
            }}
            className="w-full p-4 sm:p-6 rounded-3xl border flex flex-col items-center justify-center shadow-xs transition-colors duration-200"
          >
            {livePassData ? (
              <FitflixEventPass
                passData={livePassData}
                showActions={true}
                passTheme={passTheme}
              />
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
