'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  IconCalendarEvent,
  IconPlus,
  IconMapPin,
  IconClock,
  IconUsers,
  IconTicket,
  IconSearch,
  IconEdit,
  IconTrash,
  IconCopy,
  IconCheck,
  IconBuildingStore,
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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/empty-state'
import { FlyerQrDialog } from '@/components/events/flyer-qr-dialog'
import { IconQrcode } from '@tabler/icons-react'
import {
  getEvents,
  deleteEvent,
  updateEvent,
  type FitflixEvent,
} from '@/lib/services/event.service'

const STATUS_TABS = [
  { id: 'all', label: 'All Events' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' },
]

export default function EventsAdminPage() {
  const [events, setEvents] = useState<FitflixEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedQrEvent, setSelectedQrEvent] = useState<FitflixEvent | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)

  const loadEvents = async () => {
    try {
      setLoading(true)
      const data = await getEvents()
      setEvents(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesTab =
        selectedTab === 'all' ? true : evt.status?.toLowerCase() === selectedTab

      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        evt.title?.toLowerCase().includes(q) ||
        evt.slug?.toLowerCase().includes(q) ||
        evt.venue?.name?.toLowerCase().includes(q) ||
        evt.venue?.city?.toLowerCase().includes(q)

      return matchesTab && matchesSearch
    })
  }, [events, selectedTab, searchQuery])

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      await deleteEvent(id)
      toast.success('Event deleted successfully')
      setEvents((prev) => prev.filter((e) => (e.id || e._id) !== id))
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete event')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (evt: FitflixEvent) => {
    const id = evt.id || evt._id
    if (!id) return
    const nextStatus = evt.status === 'published' ? 'draft' : 'published'
    try {
      await updateEvent(id, { status: nextStatus })
      toast.success(`Event status changed to ${nextStatus}`)
      setEvents((prev) =>
        prev.map((e) => ((e.id || e._id) === id ? { ...e, status: nextStatus } : e)),
      )
    } catch {
      toast.error('Failed to change status')
    }
  }

  const handleCopyLink = (slug: string, id: string) => {
    const link = `https://fitflix.in/events/${slug}`
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    toast.success('Registration link copied to clipboard!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconCalendarEvent className="h-7 w-7 text-primary" />
            Fitflix Offline Events
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage physical summits, marathons, workshops, pass tiers, and digital check-ins.
          </p>
        </div>
        <Link href="/admin/events/new">
          <Button className="gap-2">
            <IconPlus className="h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Search and Tabs Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant={selectedTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab(tab.id)}
              className="text-xs h-8 shrink-0"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, city, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Events List / Empty State */}
      {loading ? (
        <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center space-y-2">
          <IconCalendarEvent className="h-8 w-8 animate-pulse text-primary" />
          <p>Loading offline events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <EmptyState
              icon={<IconTicket className="h-12 w-12 text-primary/60" />}
              title={searchQuery ? 'No matching events found' : 'No events in this view'}
              description={
                searchQuery
                  ? 'Try searching with another keyword or resetting the filter.'
                  : 'Create an event to start issuing digital passes and managing registrations.'
              }
              action={
                searchQuery ? (
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                ) : (
                  <Link href="/admin/events/new">
                    <Button className="gap-2" size="sm">
                      <IconPlus className="h-4 w-4" />
                      Create New Event
                    </Button>
                  </Link>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => {
            const id = evt.id || evt._id || ''
            const tiers = evt.ticketTiers || []
            const collaborators = evt.collaborators || []

            return (
              <Card
                key={id}
                className="overflow-hidden hover:shadow-md transition-shadow group flex flex-col justify-between"
              >
                <div>
                  {/* Event Poster Banner */}
                  <div className="relative h-48 w-full bg-muted overflow-hidden">
                    {evt.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={evt.coverImageUrl}
                        alt={evt.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/5 to-muted flex items-center justify-center">
                        <IconCalendarEvent className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="bg-background/90 text-foreground capitalize backdrop-blur-sm text-xs font-semibold"
                        >
                          {evt.eventType?.replace('_', ' ')}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(evt)}
                          className="h-6 px-2 text-xs bg-background/90 hover:bg-background backdrop-blur-sm"
                          title="Click to toggle Draft / Published"
                        >
                          <span
                            className={`w-2 h-2 rounded-full mr-1.5 ${
                              evt.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <span className="capitalize">{evt.status}</span>
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-white/90 drop-shadow">
                          /{evt.slug}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyLink(evt.slug, id)}
                          className="h-7 w-7 text-white/90 hover:text-white bg-black/40 hover:bg-black/60 rounded-full"
                          title="Copy public registration link"
                        >
                          {copiedId === id ? (
                            <IconCheck className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <IconCopy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Header Title & Tagline */}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {evt.title}
                    </CardTitle>
                    {evt.tagline && (
                      <CardDescription className="line-clamp-1">{evt.tagline}</CardDescription>
                    )}
                  </CardHeader>

                  {/* Logistics Strip */}
                  <CardContent className="space-y-2 text-sm text-muted-foreground pt-0">
                    <div className="flex items-center gap-2">
                      <IconClock className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">Reporting: {evt.reportingTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconMapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">
                        {evt.venue?.name}, {evt.venue?.city}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconUsers className="h-4 w-4 text-primary shrink-0" />
                      <span>Capacity: {evt.totalCapacity} attendees</span>
                    </div>

                    {/* Step 3: Co-Host & Tiers badges */}
                    <div className="pt-2 border-t mt-3 flex flex-wrap items-center gap-1.5">
                      {collaborators.length > 0 && (
                        <Badge variant="secondary" className="text-[11px] font-normal gap-1 bg-primary/10 text-primary">
                          <IconBuildingStore className="h-3 w-3" />
                          × {collaborators[0].name}
                        </Badge>
                      )}
                      {tiers.length > 0 ? (
                        <Badge variant="outline" className="text-[11px] font-normal gap-1">
                          <IconTicket className="h-3 w-3 text-emerald-500" />
                          {tiers.length} Pass Tier{tiers.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">No pass tiers yet</span>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 pt-2 border-t flex items-center justify-between gap-2">
                  <Link href={`/admin/events/${id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      <IconEdit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedQrEvent(evt)
                      setQrDialogOpen(true)
                    }}
                    className="gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    title="View Flyer QR Code & Share Link"
                  >
                    <IconQrcode className="h-3.5 w-3.5" />
                    Flyer QR
                  </Button>

                  {/* Delete Confirmation Dialog */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete event"
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete &quot;{evt.title}&quot;?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(id)}
                          className="bg-destructive hover:bg-destructive/90"
                          disabled={deletingId === id}
                        >
                          {deletingId === id ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <FlyerQrDialog
        event={selectedQrEvent}
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
      />
    </div>
  )
}
