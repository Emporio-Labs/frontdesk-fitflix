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
  IconFileCode,
  IconAlertTriangle,
  IconDeviceFloppy,
  IconHelp,
  IconCopy,
} from '@tabler/icons-react'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getEvents,
  updateEvent,
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
    badgeColor: '#D97706', // Warm Amber / VIP Brass
    type: 'paid',
    price: 1499,
    totalQuantity: 30,
    perks: [
      'Priority Starting Wave (Wave A)',
      'Complimentary Health & Wellness Assessment',
      'Reserved Cold Plunge & Recovery Lounge',
      'Fitflix Hydro Flask Bottle',
    ],
  },
  {
    tierId: 'tier_super_early_bird',
    name: 'Super Early Bird Pass',
    badgeLabel: 'SUPER EARLY BIRD',
    badgeColor: '#059669', // Emerald Mint
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
    tierId: 'tier_early_bird',
    name: 'Early Bird Pass',
    badgeLabel: 'EARLY BIRD',
    badgeColor: '#2563EB', // Vibrant Blue
    type: 'paid',
    price: 499,
    totalQuantity: 100,
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
    badgeColor: '#9333EA', // Lavender Purple
    type: 'free',
    price: 0,
    totalQuantity: 100,
    perks: [
      'Free Access to Community & Workout Zones',
      'Complimentary Energy Snack Pack',
    ],
  },
]

const DEFAULT_DEMO_EVENT: FitflixEvent = {
  id: 'demo-commune-part-2',
  _id: 'demo-commune-part-2',
  title: 'COMMUNE PART 2 — FITFLIX × CHAPTER 5 COFFEE',
  slug: 'commune-part-2-hyderabad',
  tagline: '5K Run, Specialty Coffee & Ice Bath Recovery Morning',
  description:
    'Join us for a morning 5K community run, followed by specialty coffee and cold plunge recovery at Chapter 5.',
  eventType: 'fitness_challenge',
  status: 'published',
  startDate: '2026-10-31T06:00:00.000Z',
  endDate: '2026-10-31T11:00:00.000Z',
  reportingTime: '06:00 AM IST',
  venue: {
    name: 'Chapter 5 Speciality Coffee & Roastery',
    address: 'Plot 14, 5th Avenue, Defence Colony, Sainikpuri',
    city: 'Hyderabad',
    googleMapsUrl: 'https://maps.google.com/?q=Chapter+5+Coffee+Hyderabad',
  },
  coverImageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80',
  collaborators: [
    {
      name: 'Chapter 5 Speciality Coffee',
      role: 'Co-Host & Roastery Partner',
      logoUrl: '/events/chapter-5-logo.jpg?v=2',
    },
  ],
  sponsors: [],
  ticketTiers: DEFAULT_PREVIEW_TIERS,
  totalCapacity: 250,
  totalRegistered: 124,
  totalCheckedIn: 42,
  customPassTemplateHtml: null,
  passTemplateMode: 'default',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
}

function DemoTicketContent() {
  const searchParams = useSearchParams()
  const preselectedEventId = searchParams?.get('eventId')

  const [events, setEvents] = useState<FitflixEvent[]>([DEFAULT_DEMO_EVENT])
  const [selectedEventId, setSelectedEventId] = useState<string>(DEFAULT_DEMO_EVENT.id)
  const [loading, setLoading] = useState(false)

  // Interactive Live Customizer State
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(DEFAULT_PREVIEW_TIERS[0])
  const [attendeeName, setAttendeeName] = useState('')
  const [attendeeEmail, setAttendeeEmail] = useState('')
  const [attendeePhone, setAttendeePhone] = useState('')
  const [ticketNumber, setTicketNumber] = useState('')
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [passTheme, setPassTheme] = useState<'light' | 'dark'>('light')

  // Custom HTML Pass Template State
  const [renderMode, setRenderMode] = useState<'default' | 'custom_html'>('default')
  const [customHtmlContent, setCustomHtmlContent] = useState<string | null>(null)
  const [customHtmlFilename, setCustomHtmlFilename] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<{ content: string; name: string } | null>(null)
  const [ackDialogOpen, setAckDialogOpen] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [tagGuideOpen, setTagGuideOpen] = useState(false)
  const [copiedTag, setCopiedTag] = useState<string | null>(null)
  const [liveQrDataUrl, setLiveQrDataUrl] = useState<string>('')
  const htmlFileInputRef = useRef<HTMLInputElement>(null)

  // Co-Branding & Partner Customizer State
  const [collabEnabled, setCollabEnabled] = useState(true)
  const [collabName, setCollabName] = useState('Chapter 5 Speciality Coffee')
  const [collabRole, setCollabRole] = useState('Co-Host & Roastery Partner')
  const [collabLogo, setCollabLogo] = useState('/events/chapter-5-logo.jpg?v=2')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Load active events
  useEffect(() => {
    getEvents()
      .then((data) => {
        if (data.length > 0) {
          // Merge database events with canonical demo event so both are readily available
          const combined = [...data, DEFAULT_DEMO_EVENT]
          setEvents(combined)
          const initial = preselectedEventId
            ? combined.find(
                (e) => e.id === preselectedEventId || e._id === preselectedEventId
              ) || combined[0]
            : combined.find((e) => e.title.toLowerCase().includes('chapter 5')) || combined[0]
          setSelectedEventId(initial.id || initial._id || DEFAULT_DEMO_EVENT.id)
        } else {
          setEvents([DEFAULT_DEMO_EVENT])
          setSelectedEventId(DEFAULT_DEMO_EVENT.id)
        }
      })
      .catch((err) => {
        console.warn('Could not fetch events catalog from server, using demo event:', err)
        setEvents([DEFAULT_DEMO_EVENT])
        setSelectedEventId(DEFAULT_DEMO_EVENT.id)
      })
  }, [preselectedEventId])

  // Current active event (guaranteed non-null fallback to DEFAULT_DEMO_EVENT)
  const currentEvent = useMemo(() => {
    return (
      events.find(
        (e) => e.id === selectedEventId || e._id === selectedEventId
      ) ||
      events[0] ||
      DEFAULT_DEMO_EVENT
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

    // Keep custom ticketNumber empty by default, allowing fallback ticket ID in preview

    // 2. Collaborator preset sync
    if (currentEvent.collaborators && currentEvent.collaborators.length > 0) {
      const first = currentEvent.collaborators[0]
      setCollabEnabled(true)
      setCollabName(first.name)
      setCollabRole(first.role || 'Co-Host')
      const initialLogo =
        first.name.toLowerCase().includes('chapter')
          ? '/events/chapter-5-logo.jpg?v=2'
          : first.logoUrl || '/events/chapter-5-logo.jpg?v=2'
      setCollabLogo(initialLogo)
    } else if (currentEvent.title.toLowerCase().includes('chapter 5')) {
      setCollabEnabled(true)
      setCollabName('Chapter 5 Speciality Coffee')
      setCollabRole('Co-Host & Roastery Partner')
      setCollabLogo('/events/chapter-5-logo.jpg?v=2')

    } else {
      setCollabEnabled(false)
      setCollabName('')
      setCollabRole('')
      setCollabLogo('')
    }

    // 3. Restore saved pass template (Backend permanent doc OR localStorage draft)
    const eventId = currentEvent.id || currentEvent._id
    if (eventId) {
      if (currentEvent.customPassTemplateHtml && currentEvent.passTemplateMode === 'custom_html') {
        setCustomHtmlContent(currentEvent.customPassTemplateHtml)
        setCustomHtmlFilename('Saved Event Template')
        setRenderMode('custom_html')
      } else {
        const cached = localStorage.getItem(`fitflix_pass_template_${eventId}`)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (parsed.content) {
              setCustomHtmlContent(parsed.content)
              setCustomHtmlFilename(parsed.name || 'Draft Template')
              setRenderMode(parsed.renderMode || 'custom_html')
            }
          } catch {
            setCustomHtmlContent(cached)
            setCustomHtmlFilename('Draft Template')
            setRenderMode('custom_html')
          }
        } else {
          // Reset to default if no template exists for this event
          setCustomHtmlContent(null)
          setCustomHtmlFilename(null)
          setRenderMode('default')
        }
      }
    }
  }, [currentEvent])

  // Handle Logo Upload from local disk
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingLogo(true)
      // Instant local preview via Blob URL (reliable in browser with zero network latency)
      const localUrl = URL.createObjectURL(file)
      setCollabLogo(localUrl)

      // Upload to server S3 / local static storage in background
      const uploadedUrl = await uploadEventImage(file, 'collaborator')
      if (uploadedUrl) {
        // Pre-validate that browser can fetch uploadedUrl before swapping away from local preview
        const testImg = new Image()
        testImg.onload = () => {
          setCollabLogo(uploadedUrl)
        }
        testImg.onerror = () => {
          console.warn('Uploaded image URL not directly accessible; retaining local blob preview:', uploadedUrl)
        }
        testImg.src = uploadedUrl
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

  // Dynamic fallback Ticket ID based on current event slug
  const defaultEventTicketId = useMemo(() => {
    if (!currentEvent) return 'FFX-PASS-1001'
    const cleanSlug =
      currentEvent.slug
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 4)
        .toUpperCase() || 'PASS'
    return `FFX-${cleanSlug}-1001`
  }, [currentEvent])

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
        ticketId: ticketNumber.trim() || defaultEventTicketId,
        tierId: selectedTier.tierId,
        tierName: selectedTier.name,
        badgeLabel: selectedTier.badgeLabel || 'GENERAL PASS',
        badgeColor: selectedTier.badgeColor || '#8A965A',
        perks: selectedTier.perks || [
          'Official Event Kit',
          'Access to Workout & Community Zones',
        ],
        attendeeName: attendeeName.trim() || 'Rahul Raju',
        attendeeEmail: attendeeEmail.trim() || 'rahul.raju@fitflix.in',
        attendeePhone: attendeePhone.trim() || '+91 98765 43210',
        checkedIn: isCheckedIn,
        checkedInAt: isCheckedIn ? new Date().toISOString() : undefined,
        paymentStatus: selectedTier.price === 0 ? 'free_claim' : 'paid',
        amountPaid: selectedTier.price,
        verificationToken: 'token_mock_preview_123',
        qrPayload: JSON.stringify({
          ticketId: ticketNumber.trim() || defaultEventTicketId,
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

  // Handlers for Custom HTML Template
  const handleSelectHtmlFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = String(event.target?.result || '')
      if (!content.trim()) {
        toast.error('The selected HTML file is empty.')
        return
      }
      setPendingFile({ content, name: file.name })
      setAckDialogOpen(true)
    }
    reader.onerror = () => {
      toast.error('Failed to read the HTML file.')
    }
    reader.readAsText(file)
  }

  const handleConfirmApplyTemplate = () => {
    const eventId = currentEvent?.id || currentEvent?._id
    if (pendingFile) {
      setCustomHtmlContent(pendingFile.content)
      setCustomHtmlFilename(pendingFile.name)
      setRenderMode('custom_html')
      if (eventId) {
        localStorage.setItem(
          `fitflix_pass_template_${eventId}`,
          JSON.stringify({
            content: pendingFile.content,
            name: pendingFile.name,
            renderMode: 'custom_html',
            updatedAt: new Date().toISOString(),
          })
        )
      }
      setPendingFile(null)
      toast.success(`Applied custom template: ${pendingFile.name}`)
    } else {
      setRenderMode('custom_html')
      if (eventId && customHtmlContent) {
        localStorage.setItem(
          `fitflix_pass_template_${eventId}`,
          JSON.stringify({
            content: customHtmlContent,
            name: customHtmlFilename || 'Custom Event Template',
            renderMode: 'custom_html',
            updatedAt: new Date().toISOString(),
          })
        )
      }
      toast.success('Switched to Custom HTML pass mode')
    }
    setAckDialogOpen(false)
  }

  const handleCancelApplyTemplate = () => {
    setPendingFile(null)
    if (htmlFileInputRef.current) {
      htmlFileInputRef.current.value = ''
    }
    setAckDialogOpen(false)
  }

  const handleRevertToDefault = () => {
    setRenderMode('default')
    toast.info('Switched to Default Fitflix UI component')
  }

  // Generate High-Res QR Data URL for dynamic placeholder hydration
  useEffect(() => {
    if (livePassData?.pass) {
      QRCode.toDataURL(livePassData.pass.qrPayload || livePassData.pass.ticketId, {
        width: 320,
        margin: 2,
        color: { dark: '#1B2A1F', light: '#FFFFFF' },
      })
        .then((url) => setLiveQrDataUrl(url))
        .catch(() => {})
    }
  }, [livePassData])

  // Save Pass Template permanently to MongoDB Backend & localStorage
  const handleSavePassTemplate = async () => {
    if (!currentEvent) {
      toast.error('No event selected to save template for.')
      return
    }
    const eventId = currentEvent.id || currentEvent._id
    if (!eventId) return

    try {
      setSavingTemplate(true)

      // 1. Cache to localStorage for instant tab-switch resilience
      localStorage.setItem(
        `fitflix_pass_template_${eventId}`,
        JSON.stringify({
          content: customHtmlContent,
          name: customHtmlFilename || 'Custom Event Template',
          renderMode,
          updatedAt: new Date().toISOString(),
        })
      )

      if (eventId.startsWith('demo-')) {
        currentEvent.customPassTemplateHtml =
          renderMode === 'custom_html' ? customHtmlContent : null
        currentEvent.passTemplateMode = renderMode
        toast.success('Pass design saved locally for Demo Event!')
        return
      }

      // 2. Persist to MongoDB backend via updateEvent API
      await updateEvent(eventId, {
        customPassTemplateHtml: renderMode === 'custom_html' ? customHtmlContent : null,
        passTemplateMode: renderMode,
      })

      // Update currentEvent in memory
      currentEvent.customPassTemplateHtml = renderMode === 'custom_html' ? customHtmlContent : null
      currentEvent.passTemplateMode = renderMode

      toast.success(`Pass design saved permanently for ${currentEvent.title}!`)
    } catch (err) {
      console.error('Failed to save pass template:', err)
      toast.error('Failed to save pass template to the backend.')
    } finally {
      setSavingTemplate(false)
    }
  }

  // Copy tag to clipboard helper
  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag)
    setCopiedTag(tag)
    toast.success(`Copied ${tag} to clipboard!`)
    setTimeout(() => setCopiedTag(null), 2000)
  }

    // Inject current live simulator data into custom HTML template without altering database
  const compiledHtml = useMemo(() => {
    let raw = customHtmlContent
    if (!raw) return ''
    if (!livePassData) return raw

    const eventDateFormatted = currentEvent
      ? new Date(currentEvent.startDate).toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Saturday, 31 Oct, 2026'

    const venueName = currentEvent?.venue?.name || 'Chapter 5 Speciality Coffee & Roastery'
    const venueAddress = currentEvent?.venue?.address || ''
    const venueCity = currentEvent?.venue?.city || 'Hyderabad'
    const venueMapUrl =
      currentEvent?.venue?.googleMapsUrl ||
      `https://maps.google.com/?q=${encodeURIComponent(venueName + ' ' + venueCity)}`
    const attendee = livePassData.pass.attendeeName || 'Rahul Raju'
    const email = livePassData.pass.attendeeEmail || 'rahul.raju@fitflix.in'
    const phone = livePassData.pass.attendeePhone || '+91 98765 43210'
    const ticketId = livePassData.pass.ticketId || defaultEventTicketId
    const tierName = livePassData.pass.tierName || livePassData.pass.badgeLabel || 'GENERAL PASS'
    const eventTitle = currentEvent?.title || 'COMMUNE PART 2 — FITFLIX × CHAPTER 5 COFFEE'
    const eventTime = currentEvent?.reportingTime || '06:00 AM IST'
    const qrImg = liveQrDataUrl || ''
    const qrPayload = livePassData.pass.qrPayload || ticketId

    // 1. Universal Mustache Tag Hydration
    const tagReplacements: Record<string, string> = {
      '{{attendee_name}}': attendee,
      '{{attendee_email}}': email,
      '{{attendee_phone}}': phone,
      '{{ticket_number}}': ticketId,
      '{{ticket_id}}': ticketId,
      '{{ticket_tier}}': tierName,
      '{{ticket_type}}': tierName,
      '{{event_title}}': eventTitle,
      '{{event_name}}': eventTitle,
      '{{event_date}}': eventDateFormatted,
      '{{event_time}}': eventTime,
      '{{reporting_time}}': eventTime,
      '{{venue_name}}': venueName,
      '{{event_venue}}': venueName,
      '{{venue_address}}': venueAddress,
      '{{venue_city}}': venueCity,
      '{{venue_map_url}}': venueMapUrl,
      '{{venue_map_link}}': venueMapUrl,
      '{{google_maps_url}}': venueMapUrl,
      '{{qr_code_image}}': qrImg,
      '{{qr_image}}': qrImg,
      '{{qr_payload}}': qrPayload,
    }

    for (const [tag, val] of Object.entries(tagReplacements)) {
      raw = raw.split(tag).join(val)
      raw = raw.split(tag.toUpperCase()).join(val)
    }

    // Ensure viewport meta is set for mobile responsiveness
    if (!raw.includes('name="viewport"')) {
      const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no">'
      if (raw.includes('<head>')) {
        raw = raw.replace('<head>', `<head>${viewportMeta}`)
      } else {
        raw = viewportMeta + raw
      }
    }

    // Rewrite CDN html2canvas to local robust vendor copy to avoid CSP blocking
    raw = raw.replace(
      /https?:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas\/[^"']+/gi,
      '/vendor/html2canvas.min.js'
    )

    // Ensure html2canvas is always loaded locally if template uses it
    if (!raw.includes('/vendor/html2canvas.min.js')) {
      const vendorScript = '<script src="/vendor/html2canvas.min.js"></script>'
      if (raw.includes('<head>')) {
        raw = raw.replace('<head>', `<head>${vendorScript}`)
      } else if (raw.includes('<body>')) {
        raw = raw.replace('<body>', `<body>${vendorScript}`)
      } else {
        raw = vendorScript + raw
      }
    }

    // 2. Compatibility with Fitflix standalone template variable
    const serialized = JSON.stringify(livePassData)
    if (raw.includes('const DEFAULT_PASS_DATA =')) {
      raw = raw.replace(
        /const DEFAULT_PASS_DATA = \{[\s\S]*?\};/,
        `const DEFAULT_PASS_DATA = ${serialized};`
      )
    }

    // 3. Smart DOM Auto-Matcher Bridge (for third-party static templates like GDSC template)
    const bridgeScript = `
<script id="fitflix-hydration-bridge">
(function() {
  const data = ${JSON.stringify({
    attendeeName: attendee,
    attendeeEmail: email,
    attendeePhone: phone,
    ticketNumber: ticketId,
    ticketTier: tierName,
    eventTitle,
    eventDate: eventDateFormatted,
    eventTime,
    venueName,
    venueAddress,
    venueCity,
    venueMapUrl,
    qrCodeImage: qrImg,
    qrPayload,
  })};

  window.__FITFLIX_PASS_DATA__ = data;

  function hydrateDom() {
    var update = function(selectors, text) {
      if (!text) return;
      document.querySelectorAll(selectors).forEach(function(el) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = text;
        else el.textContent = text;
      });
    };

    update('[data-field="attendee"], #attendee-name, .attendee-name, #attendee, .attendee', data.attendeeName);
    update('[data-field="ticket"], #ticket-id, .ticket-id, #ticket-number, .ticket-number', data.ticketNumber);
    update('[data-field="title"], [data-field="event-title"], #event-title, .event-title', data.eventTitle);
    update('[data-field="venue"], #venue, .venue, #venue-name, .venue-name', data.venueName);
    update('[data-field="venue-address"], #venue-address, .venue-address', data.venueAddress);
    update('[data-field="tier"], #ticket-tier, .ticket-tier, #ticket-type, .ticket-type', data.ticketTier);
    update('[data-field="date"], #event-date, .event-date', data.eventDate);
    update('[data-field="time"], #event-time, .event-time', data.eventTime);

    if (data.venueMapUrl) {
      document.querySelectorAll('a[href*="maps"], a[data-field="venue-map"], a.map-link').forEach(function(a) {
        a.href = data.venueMapUrl;
      });
    }

    if (data.qrCodeImage) {
      document.querySelectorAll('img[alt*="qr" i], img[src*="qr" i], #qr-code img, .qr-code img, [data-qr] img').forEach(function(img) {
        img.src = data.qrCodeImage;
      });
    }

    // Heuristics for static mockup text (e.g. GDSC Summit template)
    try {
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      var nodesToReplace = [];
      while (walker.nextNode()) {
        var node = walker.currentNode;
        var text = (node.nodeValue || '').trim();
        if (!text) continue;

        if (text === 'Alex Developer' || text === 'John Doe' || text === 'Jane Doe' || text.toLowerCase() === 'attendee name') {
          nodesToReplace.push({ node: node, val: data.attendeeName });
        } else if (text === 'Tech Park' || text === 'Convention Center' || text.toLowerCase() === 'venue name') {
          nodesToReplace.push({ node: node, val: data.venueName });
        } else if (text === "Build with AI Summit '26" || text === "Developer Summit" || text.toLowerCase() === 'event name') {
          nodesToReplace.push({ node: node, val: data.eventTitle });
        } else if (text === 'General Admission' || text === 'VIP Pass') {
          nodesToReplace.push({ node: node, val: data.ticketTier });
        } else if (/^#?GDSC-\\d+/i.test(text) || text === '#TICKET-1234') {
          nodesToReplace.push({ node: node, val: data.ticketNumber });
        } else if (text === 'Nov 24, 2026' || text === 'October 24, 2024') {
          nodesToReplace.push({ node: node, val: data.eventDate });
        } else if (text === '10:00 AM' || text === '09:00 AM') {
          nodesToReplace.push({ node: node, val: data.eventTime });
        }
      }
      nodesToReplace.forEach(function(item) {
        if (item.val) item.node.nodeValue = item.val;
      });
    } catch(e) {}

    // Check 2-column or label-value layouts (e.g. VENUE / Tech Park, ATTENDEE / Alex Developer)
    document.querySelectorAll('*').forEach(function(el) {
      var text = (el.textContent || '').trim().toUpperCase();
      if (text === 'ATTENDEE' && el.nextElementSibling) {
        el.nextElementSibling.textContent = data.attendeeName;
      }
      if (text === 'VENUE' && el.nextElementSibling) {
        el.nextElementSibling.textContent = data.venueName;
        if (data.venueMapUrl && !el.nextElementSibling.querySelector('a')) {
          el.nextElementSibling.style.cursor = 'pointer';
          el.nextElementSibling.title = 'Open Google Maps';
          el.nextElementSibling.onclick = function() { window.open(data.venueMapUrl, '_blank'); };
        }
      }
      if (text === 'TICKET TYPE' && el.nextElementSibling) {
        el.nextElementSibling.textContent = data.ticketTier;
      }
      if (text === 'DATE' && el.nextElementSibling) {
        el.nextElementSibling.textContent = data.eventDate;
      }
      if (text === 'TIME' && el.nextElementSibling) {
        el.nextElementSibling.textContent = data.eventTime;
      }
    });

    if (typeof window.renderPass === 'function') {
      try { window.renderPass(data); } catch(e) {}
    }

    // Auto-fit pass layout if card exceeds viewport width
    try {
      var target = document.getElementById('pass-card') || 
                   document.querySelector('.ticket-card') || 
                   document.querySelector('.ticket') || 
                   document.querySelector('.pass-container') ||
                   document.querySelector('.card') || 
                   (document.body ? document.body.firstElementChild : null);
      if (target) {
        var vw = window.innerWidth || document.documentElement.clientWidth;
        var tw = target.scrollWidth || target.offsetWidth;
        if (tw > vw && vw > 0 && tw > 0) {
          var scale = (vw - 8) / tw;
          target.style.transform = 'scale(' + scale + ')';
          target.style.transformOrigin = 'top center';
          target.style.margin = '0 auto';
        }
      }
    } catch(e) {}

    // Safety fallback for button state if download ever errors out
    window.addEventListener('error', function() {
      document.querySelectorAll('button').forEach(function(b) {
        if (b.textContent && b.textContent.includes('Generating PNG')) {
          b.textContent = '⬇ Download Pass';
          b.disabled = false;
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateDom);
  } else {
    hydrateDom();
  }
})();
</script>
`

    if (raw.includes('</body>')) {
      raw = raw.replace('</body>', `${bridgeScript}</body>`)
    } else {
      raw += bridgeScript
    }

    return raw
  }, [customHtmlContent, livePassData, currentEvent, defaultEventTicketId, liveQrDataUrl])

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
          {/* 1. Event Context & Pass Design Template Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <IconBuildingStore className="h-4 w-4 text-primary" />
                  1. Event Context & Pass Template
                </CardTitle>
                {renderMode === 'custom_html' && (
                  <Badge variant="secondary" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                    CUSTOM HTML ACTIVE
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                Select an event and choose between standard Fitflix pass styling or your custom HTML design.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Select Event</Label>
                <Select
                  value={selectedEventId || currentEvent.id || DEFAULT_DEMO_EVENT.id}
                  onValueChange={setSelectedEventId}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((evt) => {
                      const isDemo = evt.id === DEFAULT_DEMO_EVENT.id
                      return (
                        <SelectItem
                          key={evt.id || evt._id}
                          value={evt.id || evt._id || ''}
                          className="text-xs"
                        >
                          {evt.title} {isDemo ? '(Interactive Demo Event)' : `(${evt.venue?.city || ''})`}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

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

              {/* Pass Design Engine & HTML Template Upload */}
              <div className="border-t border-border pt-3.5 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Pass Design Engine</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={renderMode === 'default' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-9 justify-start gap-2"
                      onClick={handleRevertToDefault}
                    >
                      <IconSparkles className="h-4 w-4" />
                      Default Fitflix UI
                    </Button>
                    <Button
                      type="button"
                      variant={renderMode === 'custom_html' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-9 justify-start gap-2"
                      onClick={() => {
                        if (renderMode !== 'custom_html') {
                          setPendingFile(null)
                          setAckDialogOpen(true)
                        }
                      }}
                    >
                      <IconFileCode className="h-4 w-4" />
                      Custom HTML Pass
                    </Button>
                  </div>
                </div>

                {/* Upload HTML Input Box */}
                <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Upload HTML Pass Template (.html)
                    </Label>
                    {customHtmlFilename && (
                      <span className="text-[10px] font-mono bg-background px-2 py-0.5 rounded border text-muted-foreground truncate max-w-[140px]">
                        {customHtmlFilename}
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={htmlFileInputRef}
                    accept=".html,.htm"
                    onChange={handleSelectHtmlFile}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 w-full justify-center"
                      onClick={() => htmlFileInputRef.current?.click()}
                    >
                      <IconUpload className="h-3.5 w-3.5 text-primary" />
                      Choose .html Template File
                    </Button>
                    <Link href="/event-pass.html" target="_blank" className="shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground gap-1 hover:text-foreground"
                        title="Open default standalone pass in new tab"
                      >
                        <IconExternalLink className="h-3.5 w-3.5" />
                        View Sample
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 shrink-0"
                      onClick={() => setTagGuideOpen(true)}
                      title="View dynamic placeholder tags reference"
                    >
                      <IconHelp className="h-3.5 w-3.5 text-primary" />
                      Tags
                    </Button>
                  </div>

                  {/* Save Pass Template Action */}
                  <div className="pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSavePassTemplate}
                      disabled={savingTemplate}
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white w-full justify-center font-semibold shadow-xs"
                    >
                      <IconDeviceFloppy className="h-3.5 w-3.5" />
                      {savingTemplate ? 'Saving to Database...' : 'Save Pass Template for this Event'}
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-normal">
                    The uploaded HTML defines the visual layout. Live attendee and event data are dynamically mapped without altering real database values.
                  </p>
                </div>
              </div>
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
                      onChange={(e) => {
                        const val = e.target.value
                        setCollabName(val)
                        if (
                          val.toLowerCase().includes('chapter') &&
                          (!collabLogo || !collabLogo.includes('chapter-5-logo.jpg'))
                        ) {
                          setCollabLogo('/events/chapter-5-logo.jpg?v=2')
                          setCollabRole('Co-Host & Roastery Partner')
                        }
                      }}
                      className="h-8 text-xs font-semibold"
                      placeholder="e.g. Chapter 5 Speciality Coffee"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Partner Role / Title</Label>
                    <Input
                      value={collabRole}
                      onChange={(e) => setCollabRole(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="e.g. Co-Host & Roastery Partner"
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
                            const target = e.target as HTMLImageElement
                            if (
                              collabName.toLowerCase().includes('chapter') &&
                              !target.src.includes('chapter-5-logo.jpg')
                            ) {
                              target.src = '/events/chapter-5-logo.jpg'
                              return
                            }
                            target.style.display = 'none'
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

                {/* 1-Click Quick Preset */}
                <div className="space-y-1.5 pt-1 border-t border-border">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    QUICK PARTNER PRESET
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        applyPreset({
                          name: 'Chapter 5 Speciality Coffee',
                          role: 'Co-Host & Roastery Partner',
                          logoUrl: '/events/chapter-5-logo.jpg?v=2',
                        })
                      }
                      className="h-7 text-xs gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20 font-semibold"
                    >
                      ☕ Chapter 5 Speciality Coffee
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <IconUser className="h-4 w-4 text-blue-500" />
                  4. Customize Attendee & Ticket Number
                </CardTitle>
                {(attendeeName || ticketNumber || attendeeEmail || attendeePhone) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAttendeeName('')
                      setTicketNumber('')
                      setAttendeeEmail('')
                      setAttendeePhone('')
                    }}
                    className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                  >
                    Clear All
                  </Button>
                )}
              </div>
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
                    placeholder="e.g. Rahul Raju"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Ticket Number</Label>
                  <Input
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    className="h-8 text-xs font-mono text-primary font-bold"
                    placeholder={defaultEventTicketId || 'e.g. FFX-PASS-1001'}
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
                    placeholder="e.g. rahul.raju@fitflix.in"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Attendee Phone</Label>
                  <Input
                    value={attendeePhone}
                    onChange={(e) => setAttendeePhone(e.target.value)}
                    className="h-8 text-xs font-mono"
                    placeholder="e.g. +91 98765 43210"
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
            {renderMode === 'custom_html' ? (
              <div className="w-full flex flex-col items-center space-y-3">
                <div className="w-full flex items-center justify-between text-xs px-1">
                  <span className="font-semibold flex items-center gap-1.5 text-primary">
                    <IconFileCode className="h-4 w-4" />
                    Custom HTML Design: {customHtmlFilename || 'Built-in Template'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={handleRevertToDefault}
                  >
                    Switch to Default UI
                  </Button>
                </div>
                <iframe
                  title="Custom HTML Pass Preview"
                  srcDoc={compiledHtml || undefined}
                  src={!compiledHtml ? '/event-pass.html' : undefined}
                  className="w-full rounded-2xl border bg-transparent min-h-[700px] shadow-sm"
                  sandbox="allow-scripts allow-downloads allow-same-origin allow-popups allow-modals"
                />
              </div>
            ) : (
              <FitflixEventPass
                passData={livePassData || {
                  pass: {
                    id: 'mock-pass-preview-id',
                    ticketId: defaultEventTicketId,
                    tierId: DEFAULT_PREVIEW_TIERS[0].tierId,
                    tierName: DEFAULT_PREVIEW_TIERS[0].name,
                    badgeLabel: DEFAULT_PREVIEW_TIERS[0].badgeLabel,
                    badgeColor: DEFAULT_PREVIEW_TIERS[0].badgeColor,
                    perks: DEFAULT_PREVIEW_TIERS[0].perks,
                    attendeeName: attendeeName.trim() || 'Rahul Raju',
                    attendeeEmail: attendeeEmail.trim() || 'rahul.raju@fitflix.in',
                    attendeePhone: attendeePhone.trim() || '+91 98765 43210',
                    checkedIn: isCheckedIn,
                    paymentStatus: 'paid',
                    amountPaid: DEFAULT_PREVIEW_TIERS[0].price,
                    verificationToken: 'token_mock_preview_123',
                    qrPayload: JSON.stringify({
                      ticketId: defaultEventTicketId,
                      eventId: DEFAULT_DEMO_EVENT.id,
                      token: 'token_mock_preview_123',
                    }),
                    createdAt: new Date().toISOString(),
                  },
                  event: DEFAULT_DEMO_EVENT,
                }}
                showActions={true}
                passTheme={passTheme}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Placeholder Tags Reference Dialog */}
      <Dialog open={tagGuideOpen} onOpenChange={setTagGuideOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <IconHelp className="h-5 w-5 text-primary" />
              Dynamic Template Tags Reference
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Insert any of these tags anywhere inside your custom HTML. They will automatically be replaced with live attendee, venue, and QR code data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground block">
                Attendee Details
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { tag: '{{attendee_name}}', desc: 'Attendee full name (e.g. Rahul Raju)' },
                  { tag: '{{attendee_email}}', desc: 'Registered email address' },
                  { tag: '{{attendee_phone}}', desc: 'Registered contact phone' },
                  { tag: '{{ticket_number}}', desc: 'Unique ticket ID code (e.g. FFX-COMM-1001)' },
                  { tag: '{{ticket_tier}}', desc: 'Ticket tier name (e.g. SUPER EARLY BIRD)' },
                ].map((item) => (
                  <div
                    key={item.tag}
                    onClick={() => handleCopyTag(item.tag)}
                    className="p-2 rounded-lg border bg-muted/30 hover:bg-muted/70 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <code className="text-primary font-bold text-[11px] font-mono">{item.tag}</code>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    {copiedTag === item.tag ? (
                      <IconCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <IconCopy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground block">
                Venue & Map Links
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { tag: '{{venue_name}}', desc: 'Venue place name (e.g. Chapter 5 Roastery)' },
                  { tag: '{{venue_address}}', desc: 'Street address & landmark' },
                  { tag: '{{venue_city}}', desc: 'Event city (e.g. Hyderabad)' },
                  { tag: '{{venue_map_url}}', desc: 'Clickable Google Maps navigation link' },
                ].map((item) => (
                  <div
                    key={item.tag}
                    onClick={() => handleCopyTag(item.tag)}
                    className="p-2 rounded-lg border bg-muted/30 hover:bg-muted/70 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <code className="text-primary font-bold text-[11px] font-mono">{item.tag}</code>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    {copiedTag === item.tag ? (
                      <IconCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <IconCopy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground block">
                Event & QR Code
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { tag: '{{event_title}}', desc: 'Official event title' },
                  { tag: '{{event_date}}', desc: 'Formatted event date' },
                  { tag: '{{event_time}}', desc: 'Reporting / gate opening time' },
                  { tag: '{{qr_code_image}}', desc: 'High-res scannable QR DataURL for <img src="..." />' },
                ].map((item) => (
                  <div
                    key={item.tag}
                    onClick={() => handleCopyTag(item.tag)}
                    className="p-2 rounded-lg border bg-muted/30 hover:bg-muted/70 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <code className="text-primary font-bold text-[11px] font-mono">{item.tag}</code>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    {copiedTag === item.tag ? (
                      <IconCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <IconCopy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

            {/* Acknowledgement Confirmation Dialog */}
      <AlertDialog open={ackDialogOpen} onOpenChange={setAckDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-base">
              <IconAlertTriangle className="h-5 w-5 shrink-0" />
              Update Event Pass in App?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-1.5 leading-relaxed">
              This event pass design will be updated for attendees in the app. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel onClick={handleCancelApplyTemplate}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApplyTemplate}>
              Yes, Update Pass
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
