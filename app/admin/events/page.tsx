'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  IconCalendarEvent,
  IconPlus,
  IconMapPin,
  IconClock,
  IconUsers,
  IconTicket,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/empty-state'
import { getEvents, type FitflixEvent } from '@/lib/services/event.service'

export default function EventsAdminPage() {
  const [events, setEvents] = useState<FitflixEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true)
        const data = await getEvents()
        setEvents(data)
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [])

  return (
    <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconCalendarEvent className="h-7 w-7 text-primary" />
            Fitflix Events
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage offline gatherings, summits, workshops, and digital ticketing passes.
          </p>
        </div>
        <Link href="/admin/events/new">
          <Button className="gap-2">
            <IconPlus className="h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Events List / Empty State */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <EmptyState
              icon={<IconTicket className="h-12 w-12 text-primary/60" />}
              title="No offline events yet"
              description="Create your first offline event to generate promotional registration links, DevFest-style passes, and QR check-in desks."
              action={
                <Link href="/admin/events/new">
                  <Button className="gap-2">
                    <IconPlus className="h-4 w-4" />
                    Create Your First Event
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <Card key={evt.id} className="overflow-hidden hover:shadow-md transition-shadow group flex flex-col justify-between">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-background/90 text-foreground capitalize backdrop-blur-sm">
                        {evt.eventType?.replace('_', ' ')}
                      </Badge>
                      <Badge variant="secondary" className="capitalize bg-background/90 backdrop-blur-sm">
                        {evt.status}
                      </Badge>
                    </div>
                    <span className="text-xs font-mono text-white/90 drop-shadow">
                      /{evt.slug}
                    </span>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    {evt.title}
                  </CardTitle>
                  {evt.tagline && (
                    <CardDescription className="line-clamp-1">{evt.tagline}</CardDescription>
                  )}
                </CardHeader>
              </div>

              <CardContent className="space-y-2 text-sm text-muted-foreground pt-0">
                <div className="flex items-center gap-2">
                  <IconClock className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">Reporting: {evt.reportingTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconMapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{evt.venue?.name}, {evt.venue?.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconUsers className="h-4 w-4 text-primary shrink-0" />
                  <span>Capacity: {evt.totalCapacity} attendees</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
