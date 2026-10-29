'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'qrcode'
import {
  getPublicEvent,
  registerForEvent,
  type FitflixEvent,
  type TicketTier,
  type RegisterEventResponse,
} from '@/lib/services/event.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconCheck,
  IconTicket,
  IconSparkles,
  IconAlertCircle,
  IconArrowRight,
  IconShare,
  IconDownload,
  IconChevronRight,
  IconShieldCheck,
} from '@tabler/icons-react'
import { toast } from 'sonner'

export default function PublicEventRegistrationPage() {
  const params = useParams()
  const slug = String(params?.slug || '')

  const [event, setEvent] = useState<FitflixEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null)
  const [registrationResult, setRegistrationResult] = useState<RegisterEventResponse | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [tshirtSize, setTshirtSize] = useState('L')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getPublicEvent(slug)
      .then((data) => {
        setEvent(data)
        // Auto-select first available tier
        if (data?.ticketTiers && data.ticketTiers.length > 0) {
          const available = data.ticketTiers.find(
            (t) => (t.soldQuantity || 0) < t.totalQuantity
          )
          setSelectedTier(available || data.ticketTiers[0])
        }
      })
      .catch((err) => {
        console.error('Failed to load event:', err)
        toast.error('Event not found or registration is currently closed.')
      })
      .finally(() => setLoading(false))
  }, [slug])

  // When registration succeeds, generate the digital pass QR code
  useEffect(() => {
    if (registrationResult?.registration) {
      const qrPayload = JSON.stringify({
        ticketId: registrationResult.registration.ticketId,
        token: registrationResult.registration.verificationToken,
        slug: event?.slug,
      })
      QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).then((url) => setQrCodeDataUrl(url))
    }
  }, [registrationResult, event])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTier || !event) return

    if (!name.trim()) {
      toast.error('Please enter your full name')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    if (!phone.trim() || phone.length < 7) {
      toast.error('Please enter a valid phone number')
      return
    }

    setSubmitting(true)
    try {
      const response = await registerForEvent(event.slug, {
        tierId: selectedTier.tierId,
        attendeeName: name.trim(),
        attendeeEmail: email.trim(),
        attendeePhone: phone.trim(),
        answers: { tshirtSize },
      })
      setRegistrationResult(response)
      toast.success('Registration confirmed! Your pass has been issued.')
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        'Registration failed. Please try again.'
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Loading event details & pass availability...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <IconAlertCircle className="h-12 w-12 text-zinc-600 mb-3" />
        <h1 className="text-2xl font-bold">Event Not Found</h1>
        <p className="text-zinc-400 text-sm max-w-sm mt-1">
          This event may be in draft status, concluded, or the link may be mistyped.
        </p>
      </div>
    )
  }

  const startDateFormatted = new Date(event.startDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // ── Confirmation / Pass View ──────────────────────────────────────────
  if (registrationResult) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white py-12 px-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-1">
              <IconShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">You are Registered!</h1>
            <p className="text-xs text-zinc-400">
              Present this pass at FrontDesk check-in on the event day.
            </p>
          </div>

          {/* DevFest Tear-off Pass Card Preview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Header Badge Strip */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                  OFFICIAL EVENT PASS
                </span>
                <h3 className="text-sm font-black text-white truncate max-w-[220px]">
                  {event.title}
                </h3>
              </div>
              <Badge className="bg-white/20 text-white font-mono text-[10px] border-none backdrop-blur-sm">
                {registrationResult.registration.tierName}
              </Badge>
            </div>

            {/* Attendee Info & QR */}
            <div className="p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                    ATTENDEE NAME
                  </span>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {registrationResult.registration.attendeeName}
                  </p>
                  <p className="text-xs text-zinc-400 font-mono">
                    {registrationResult.registration.attendeePhone}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                    TICKET ID
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/60 inline-block mt-0.5">
                    {registrationResult.registration.ticketId}
                  </span>
                </div>
              </div>

              {/* Perforated Divider */}
              <div className="relative my-4">
                <div className="border-t-2 border-dashed border-zinc-700 w-full" />
                <div className="absolute -left-9 -top-3 w-6 h-6 bg-zinc-950 rounded-full" />
                <div className="absolute -right-9 -top-3 w-6 h-6 bg-zinc-950 rounded-full" />
              </div>

              {/* High Contrast QR Code */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner">
                {qrCodeDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeDataUrl}
                    alt="Ticket QR Code"
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-zinc-400">
                    Generating Pass QR...
                  </div>
                )}
                <span className="text-[11px] font-bold text-zinc-800 uppercase tracking-widest mt-2">
                  SCAN FOR FAST-TRACK ENTRY
                </span>
              </div>

              {/* Venue & Reporting */}
              <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/80 space-y-1.5 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <IconCalendar className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{startDateFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconClock className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Reporting: {event.reportingTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconMapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{event.venue.name}, {event.venue.city}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: event.title,
                    text: `I'm attending ${event.title}! Join me here:`,
                    url: window.location.href,
                  })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success('Link copied!')
                }
              }}
              className="w-full border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs gap-1.5"
            >
              <IconShare className="h-4 w-4" />
              Share Event
            </Button>
            <Button
              onClick={() => window.print()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
            >
              <IconDownload className="h-4 w-4" />
              Save / Print Pass
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Registration Checkout Page ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
      {/* Top Banner Navigation */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-lg tracking-wider text-emerald-400">FITFLIX</span>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">
              COMMUNITY EVENTS
            </span>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
            Open for Bookings
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Hero Poster / Flyer Banner */}
        <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl">
          {event.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImageUrl}
              alt={event.title}
              className="w-full max-h-[460px] object-cover object-center"
            />
          ) : (
            <div className="h-64 bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/40 flex items-center justify-center p-6">
              <IconTicket className="h-16 w-16 text-emerald-500/40" />
            </div>
          )}

          {/* Collaborator pill floating on image */}
          {event.collaborators && event.collaborators.length > 0 && (
            <div className="absolute top-4 left-4 flex gap-2">
              {event.collaborators.map((collab, i) => (
                <div
                  key={i}
                  className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-lg"
                >
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                    {collab.role}:
                  </span>
                  <span className="text-xs font-bold text-white">{collab.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event Title & Metadata */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              {event.title}
            </h1>
            {event.tagline && (
              <p className="text-base text-zinc-400 font-medium">{event.tagline}</p>
            )}
          </div>

          {/* Info Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-2xl border border-zinc-800/80">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <IconCalendar className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
                  DATE
                </span>
                <span className="text-xs font-bold text-zinc-200">{startDateFormatted}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-2xl border border-zinc-800/80">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                <IconClock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
                  REPORTING TIME
                </span>
                <span className="text-xs font-bold text-zinc-200">{event.reportingTime}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-2xl border border-zinc-800/80">
              <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl">
                <IconMapPin className="h-5 w-5" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
                  VENUE
                </span>
                <span className="text-xs font-bold text-zinc-200 truncate block">
                  {event.venue.name}, {event.venue.city}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pass Tier Selection & Booking Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Select Pass Tier */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <IconTicket className="h-5 w-5 text-emerald-400" />
                Select Your Pass Tier
              </h2>
              <span className="text-xs text-zinc-500">
                {event.ticketTiers?.length || 0} Tier(s) available
              </span>
            </div>

            <div className="space-y-3">
              {event.ticketTiers?.map((tier) => {
                const isSelected = selectedTier?.tierId === tier.tierId
                const isSoldOut = (tier.soldQuantity || 0) >= tier.totalQuantity
                const remaining = Math.max(0, tier.totalQuantity - (tier.soldQuantity || 0))

                return (
                  <div
                    key={tier.tierId}
                    onClick={() => !isSoldOut && setSelectedTier(tier)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/40'
                        : isSoldOut
                        ? 'border-zinc-800/40 bg-zinc-950/40 opacity-50 cursor-not-allowed'
                        : 'border-zinc-800/80 bg-zinc-950 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            style={{
                              backgroundColor: `${tier.badgeColor}20`,
                              color: tier.badgeColor,
                              borderColor: `${tier.badgeColor}40`,
                            }}
                            className="font-bold text-[10px] uppercase border"
                          >
                            {tier.badgeLabel}
                          </Badge>
                          {isSoldOut ? (
                            <Badge variant="destructive" className="text-[10px]">
                              SOLD OUT
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-zinc-400 font-medium">
                              {remaining} spots left
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white">{tier.name}</h3>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-white">
                          {tier.price === 0 ? 'FREE' : `₹${tier.price}`}
                        </div>
                        {tier.type === 'rsvp' && (
                          <span className="text-[10px] text-zinc-500 block">RSVP Pass</span>
                        )}
                      </div>
                    </div>

                    {/* Perks List */}
                    {tier.perks && tier.perks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-800/60 space-y-1">
                        {tier.perks.map((perk, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-zinc-300">
                            <IconCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span>{perk}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Sponsors Banner Strip */}
            {event.sponsors && event.sponsors.length > 0 && (
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 space-y-2 mt-6">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  OFFICIAL EVENT PARTNERS & SPONSORS
                </span>
                <div className="flex flex-wrap gap-3 items-center pt-1">
                  {event.sponsors.map((sponsor, i) => (
                    <div
                      key={i}
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-2 text-xs"
                    >
                      <span className="font-bold text-zinc-200">{sponsor.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">({sponsor.tier})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Checkout Form */}
          <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl sticky top-20">
            <div className="space-y-1 mb-5">
              <h2 className="text-base font-bold text-white">Attendee Details</h2>
              <p className="text-xs text-zinc-400">
                Your pass will be registered and issued instantly.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-zinc-300">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Alex Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-sm focus-visible:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-zinc-300">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="alex@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-sm focus-visible:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs text-zinc-300">
                  Phone Number (for SMS & Check-in) *
                </Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-sm focus-visible:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">T-Shirt / Jersey Size</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setTshirtSize(sz)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        tshirtSize === sz
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Summary Card */}
              {selectedTier && (
                <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs mt-2">
                  <span className="text-zinc-400">Total Due:</span>
                  <span className="font-extrabold text-sm text-emerald-400">
                    {selectedTier.price === 0 ? 'FREE CLAIM' : `₹${selectedTier.price}`}
                  </span>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || !selectedTier}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-5 rounded-xl shadow-lg shadow-emerald-950/50 transition-all"
              >
                {submitting ? (
                  'Issuing Digital Pass...'
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    Claim {selectedTier?.name || 'Pass'}
                    <IconArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              <p className="text-[11px] text-zinc-500 text-center">
                Instant digital pass QR generated upon registration.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
