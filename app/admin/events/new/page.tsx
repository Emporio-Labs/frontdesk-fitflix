'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  IconArrowLeft,
  IconCalendarEvent,
  IconMapPin,
  IconClock,
  IconUsers,
  IconSparkles,
  IconBuildingCommunity,
  IconUpload,
  IconPhoto,
  IconX,
  IconCheck,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createEvent,
  uploadEventImage,
  type CreateEventPayload,
  type TicketTier,
  type Collaborator,
  type Sponsor,
} from '@/lib/services/event.service'
import { TierManager } from '@/components/events/tier-manager'
import { CoBrandingManager } from '@/components/events/co-branding-manager'

const EVENT_TYPES = [
  { value: 'community_meetup', label: 'Community Meetup' },
  { value: 'fitness_challenge', label: 'Fitness Challenge / Expo' },
  { value: 'workshop', label: 'Hands-on Workshop' },
  { value: 'marathon_run', label: 'Marathon / Outdoor Run' },
  { value: 'masterclass', label: 'Coach Masterclass' },
  { value: 'wellness_summit', label: 'Wellness Summit' },
  { value: 'celebration', label: 'Launch Party & Celebration' },
]

export default function CreateEventPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState('marathon_run')
  const [startDate, setStartDate] = useState('2026-10-31T06:00')
  const [endDate, setEndDate] = useState('2026-10-31T10:00')
  const [reportingTime, setReportingTime] = useState('06:00 AM IST')
  
  // Venue State
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [venueCity, setVenueCity] = useState('Hyderabad')
  const [venueLandmark, setVenueLandmark] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  
  // Capacity & Assets
  const [totalCapacity, setTotalCapacity] = useState('150')
  const [coverImageUrl, setCoverImageUrl] = useState('/events/commune-part-2.png')
  const [imagePreview, setImagePreview] = useState<string | null>('/events/commune-part-2.png')

  // Step 3: Tiers, Collaborators & Sponsors State
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    {
      tierId: 'super_early_bird',
      name: 'Super Early Bird Pass',
      badgeLabel: 'SUPER EARLY BIRD',
      badgeColor: '#10b981',
      type: 'paid',
      price: 299,
      totalQuantity: 50,
      perks: ['Official Event Jersey', 'Priority Entrance Gate', 'Fitflix Shaker'],
    },
    {
      tierId: 'early_bird',
      name: 'Early Bird Pass',
      badgeLabel: 'EARLY BIRD',
      badgeColor: '#3b82f6',
      type: 'paid',
      price: 499,
      totalQuantity: 75,
      perks: ['Official Event T-Shirt', 'Energy Drink'],
    },
  ])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      name: 'Chapter 5 Speciality Coffee',
      role: 'Co-Host & Roastery Partner',
      logoUrl: 'https://api.fitflix.in/uploads/collaborators/chapter-5.png',
      websiteUrl: 'https://chapter5coffee.com',
    },
  ])
  const [sponsors, setSponsors] = useState<Sponsor[]>([
    {
      name: 'Fitflix Nutrition',
      logoUrl: 'https://api.fitflix.in/uploads/collaborators/fitflix.png',
      tier: 'Title Partner',
    },
  ])

  // Computed slug preview
  const slugPreview = title
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // Handle Photo File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    setImagePreview(objectUrl)

    try {
      setUploadingImage(true)
      const uploadedUrl = await uploadEventImage(file)
      setCoverImageUrl(uploadedUrl)
      toast.success('Event photo uploaded successfully!')
    } catch {
      toast.error('Failed to upload image to server, using local preview.')
      setCoverImageUrl(objectUrl)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemovePhoto = () => {
    setImagePreview(null)
    setCoverImageUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Event title is required')
      return
    }
    if (!startDate) {
      toast.error('Start date is required')
      return
    }
    if (!endDate) {
      toast.error('End date is required')
      return
    }
    if (!venueName.trim() || !venueAddress.trim()) {
      toast.error('Venue name and address are required')
      return
    }

    const capacityNum = parseInt(totalCapacity, 10)
    if (isNaN(capacityNum) || capacityNum < 1) {
      toast.error('Total capacity must be at least 1')
      return
    }

    try {
      setLoading(true)

      const payload: CreateEventPayload = {
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
        eventType,
        status: 'draft',
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reportingTime: reportingTime.trim(),
        venue: {
          name: venueName.trim(),
          address: venueAddress.trim(),
          city: venueCity.trim() || 'Bengaluru',
          landmark: venueLandmark.trim() || undefined,
          googleMapsUrl: googleMapsUrl.trim() || undefined,
        },
        totalCapacity: capacityNum,
        coverImageUrl: coverImageUrl.trim() || undefined,
        ticketTiers,
        collaborators,
        sponsors,
      }

      const res = await createEvent(payload)
      toast.success(res.message || 'Event created successfully!')
      router.push('/admin/events')
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to create event'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/events">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <IconArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconCalendarEvent className="h-6 w-6 text-primary" />
            Create Offline Event & Passes
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure offline fitness expos, multi-tier passes (Super Early Bird, VIP), and co-branding partners.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Event Essentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IconSparkles className="h-5 w-5 text-amber-500" />
              Event Essentials
            </CardTitle>
            <CardDescription>
              Basic information visible on promotional flyers and member passes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="e.g. COMMUNE PART 2 — FITFLIX × CHAPTER 5 COFFEE"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              {slugPreview && (
                <p className="text-xs text-muted-foreground">
                  Public URL preview:{' '}
                  <span className="font-mono text-primary">
                    fitflix.in/events/{slugPreview}
                  </span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline / Short Subtitle</Label>
                <Input
                  id="tagline"
                  placeholder="e.g. RUN · YOGA · COFFEE · COMMUNITY"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventType">Category / Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger id="eventType">
                    <SelectValue placeholder="Select event category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Event Description</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Fitflix and Chapter 5 Specialty Coffee come together for a high-energy morning run, recovery yoga, and premium coffee community gathering."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Step 3 Pass & Ticket Tiers */}
        <TierManager tiers={ticketTiers} onChange={setTicketTiers} />

        {/* Section 3: Step 3 Co-Branding & Sponsors */}
        <CoBrandingManager
          collaborators={collaborators}
          sponsors={sponsors}
          onCollaboratorsChange={setCollaborators}
          onSponsorsChange={setSponsors}
        />

        {/* Section 4: Event Photo / Flyer Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IconPhoto className="h-5 w-5 text-indigo-500" />
              Event Poster / Flyer Photo
            </CardTitle>
            <CardDescription>
              Upload high-resolution event photo displayed in the user app, on landing pages, and promotional passes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative border rounded-xl overflow-hidden bg-muted/30 p-2 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-40 h-52 shrink-0 rounded-lg overflow-hidden border shadow-sm bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Event poster preview"
                    className="w-full h-full object-cover"
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-white">
                      Uploading...
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-sm font-semibold">Active Poster Image</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <IconCheck className="h-3 w-3" /> Ready
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono break-all line-clamp-2">
                    {coverImageUrl}
                  </p>
                  <div className="flex items-center gap-2 pt-2 justify-center sm:justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      Change Photo
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={handleRemovePhoto}
                    >
                      <IconX className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <IconUpload className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Click to upload event photo or drag and drop</p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, or WEBP up to 10MB
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm">
                  Select Image File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 5: Date & Reporting Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IconClock className="h-5 w-5 text-blue-500" />
              Schedule & Reporting Logistics
            </CardTitle>
            <CardDescription>
              Check-in and reporting times printed on the right tear-off stub of passes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Event Start Date & Time *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Event End Date & Time *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportingTime">Gate Reporting Time *</Label>
              <Input
                id="reportingTime"
                placeholder="e.g. 06:00 AM IST"
                value={reportingTime}
                onChange={(e) => setReportingTime(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Offline Venue Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IconMapPin className="h-5 w-5 text-red-500" />
              Offline Venue
            </CardTitle>
            <CardDescription>
              Physical auditorium, stadium, or club location where QR check-in happens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venueName">Venue Name *</Label>
              <Input
                id="venueName"
                placeholder="e.g. Chapter 5 Coffee Roasters / Sainikpuri Club"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="venueAddress">Full Address *</Label>
                <Input
                  id="venueAddress"
                  placeholder="Plot 42, 5th Avenue, Sainikpuri"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venueCity">City *</Label>
                <Input
                  id="venueCity"
                  placeholder="e.g. Hyderabad, Bengaluru, Pune"
                  value={venueCity}
                  onChange={(e) => setVenueCity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="venueLandmark">Landmark (Optional)</Label>
                <Input
                  id="venueLandmark"
                  placeholder="e.g. Near Defecne Colony Arch"
                  value={venueLandmark}
                  onChange={(e) => setVenueLandmark(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleMapsUrl">Google Maps Link (Optional)</Label>
                <Input
                  id="googleMapsUrl"
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 7: Capacity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IconUsers className="h-5 w-5 text-emerald-500" />
              Audience Capacity
            </CardTitle>
            <CardDescription>
              Set maximum registration limits for on-site crowd control.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totalCapacity">Total Max Attendees *</Label>
              <Input
                id="totalCapacity"
                type="number"
                min="1"
                placeholder="150"
                value={totalCapacity}
                onChange={(e) => setTotalCapacity(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/events">
            <Button variant="outline" type="button" disabled={loading || uploadingImage}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || uploadingImage} className="gap-2">
            {loading ? (
              'Creating Event...'
            ) : (
              <>
                <IconBuildingCommunity className="h-4 w-4" />
                Create Event & Passes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
