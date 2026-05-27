'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconRefresh,
  IconCalendarEvent,
  IconClock,
  IconCheck,
  IconX,
  IconMapPin,
  IconVideo,
  IconSettings,
} from '@tabler/icons-react'
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
  useNutritionistBookings,
  useAcceptNutritionistBooking,
  useRejectNutritionistBooking,
} from '@/hooks/use-nutritionist-bookings'
import { useSlots } from '@/hooks/use-slots'
import type {
  NutritionistBooking,
  NutritionistBookingStatus,
  AppointmentMode,
} from '@/lib/services/nutritionist-booking.service'

type Tab = 'pending' | 'confirmed' | 'cancelled' | 'all'

const STATUS_BY_TAB: Record<Exclude<Tab, 'all'>, NutritionistBookingStatus> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(
    'en-US',
    { hour: 'numeric', minute: '2-digit' },
  )}`
}

function NutritionistStatusBadge({ status }: { status: NutritionistBookingStatus }) {
  const map: Record<NutritionistBookingStatus, { label: string; cls: string }> = {
    Pending: {
      label: 'PENDING',
      cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-transparent',
    },
    Confirmed: {
      label: 'ACCEPTED',
      cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent',
    },
    Cancelled: {
      label: 'REJECTED',
      cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-transparent',
    },
    Completed: {
      label: 'COMPLETED',
      cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-transparent',
    },
  }
  const { label, cls } = map[status]
  return <Badge className={cls}>{label}</Badge>
}

function AppointmentModeCell({ booking }: { booking: NutritionistBooking }) {
  const mode: AppointmentMode =
    booking.appointmentMode ?? (booking.meetingLink ? 'ONLINE' : 'IN_PERSON')

  if (mode === 'IN_PERSON') {
    return (
      <div className="flex items-start gap-1.5 text-sm">
        <IconMapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
        <div>
          <div className="font-medium">Hybrid Human Clinic</div>
          <div className="text-xs text-muted-foreground">Jubilee Hills</div>
        </div>
      </div>
    )
  }

  if (booking.meetingLink) {
    return (
      <a
        href={booking.meetingLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
      >
        <IconVideo className="w-4 h-4" /> Join Meeting
      </a>
    )
  }

  return (
    <span className="text-xs italic text-muted-foreground">
      Meeting link will be generated after approval
    </span>
  )
}

function StatCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string
  value: number
  icon: React.ReactNode
  loading: boolean
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default function NutritionistAppointmentsPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const [confirmReject, setConfirmReject] = useState<NutritionistBooking | null>(null)

  const { data: bookings = [], isLoading, isError, refetch } = useNutritionistBookings()
  const { data: slots = [] } = useSlots()
  const accept = useAcceptNutritionistBooking()
  const reject = useRejectNutritionistBooking()

  const counts = useMemo(() => {
    let pending = 0
    let confirmed = 0
    let cancelled = 0
    for (const b of bookings) {
      if (b.bookingStatus === 'Pending') pending++
      else if (b.bookingStatus === 'Confirmed') confirmed++
      else if (b.bookingStatus === 'Cancelled') cancelled++
    }
    return { pending, confirmed, cancelled, total: bookings.length }
  }, [bookings])

  const segmented = useMemo(() => {
    if (tab === 'all') return bookings
    const target = STATUS_BY_TAB[tab]
    return bookings.filter((b) => b.bookingStatus === target)
  }, [bookings, tab])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return segmented
    return segmented.filter((b) => {
      const u = b.userId
      const username = u?.username?.toLowerCase() ?? ''
      const email = u?.email?.toLowerCase() ?? ''
      const phone = u?.phone?.toLowerCase() ?? ''
      return username.includes(q) || email.includes(q) || phone.includes(q)
    })
  }, [segmented, search])

  const upcomingSlots = useMemo(() => {
    const now = Date.now()
    const sevenDays = now + 7 * 86_400_000
    return slots
      .filter((s) => {
        if (s.isDaily) return true
        if (!s.date) return false
        const t = new Date(s.date).getTime()
        if (Number.isNaN(t)) return false
        return t >= now - 86_400_000 && t <= sevenDays
      })
      .slice(0, 10)
  }, [slots])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconCalendarEvent className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Nutritionist Appointments</h2>
            <p className="text-muted-foreground">
              Triage pending bookings, review history, and monitor slot capacity
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/slots">
              <IconSettings className="w-4 h-4 mr-1" /> Manage Slots
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending"
          value={counts.pending}
          icon={<IconClock className="w-4 h-4 text-yellow-500" />}
          loading={isLoading}
        />
        <StatCard
          title="Accepted"
          value={counts.confirmed}
          icon={<IconCheck className="w-4 h-4 text-green-500" />}
          loading={isLoading}
        />
        <StatCard
          title="Rejected"
          value={counts.cancelled}
          icon={<IconX className="w-4 h-4 text-red-500" />}
          loading={isLoading}
        />
        <StatCard
          title="Total"
          value={counts.total}
          icon={<IconCalendarEvent className="w-4 h-4 text-blue-500" />}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Available Slots (Next 7 days)</CardTitle>
          <CardDescription>Read-only view. Use Manage Slots to edit.</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingSlots.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              No slots configured. Use Manage Slots to add one.
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingSlots.map((s) => {
                const bookedCount = Math.max(0, (s.capacity ?? 0) - (s.remainingCapacity ?? 0))
                return (
                  <div
                    key={s._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-medium">
                        {s.isDaily ? 'Daily' : formatDate(s.date)}
                      </div>
                      <div className="text-muted-foreground">
                        {s.startTime} – {s.endTime}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {bookedCount} / {s.capacity} booked
                      </span>
                      {s.isBooked ? (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-transparent">
                          Full
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent">
                          Available
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <div className="flex flex-wrap items-center gap-3">
          <TabsList>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="confirmed">Accepted ({counts.confirmed})</TabsTrigger>
            <TabsTrigger value="cancelled">Rejected ({counts.cancelled})</TabsTrigger>
            <TabsTrigger value="all">All ({counts.total})</TabsTrigger>
          </TabsList>
          <Input
            placeholder="Search by username, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>
                {isLoading
                  ? 'Loading...'
                  : `${filtered.length} ${filtered.length === 1 ? 'booking' : 'bookings'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isError && (
                <div className="text-center py-8 text-red-500">
                  Failed to load bookings. Check connection and try again.
                </div>
              )}
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time Slot</TableHead>
                        <TableHead>Appointment Mode</TableHead>
                        <TableHead>Booking Status</TableHead>
                        <TableHead>Created Time</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                            No bookings found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((b) => {
                          const u = b.userId
                          const userId = u?._id ?? ''
                          const timeSlot = b.timeSlot ?? formatTime(b.appointmentDate)
                          const isPending = b.bookingStatus === 'Pending'
                          const acceptingThis =
                            accept.isPending && accept.variables === b._id
                          return (
                            <TableRow key={b._id}>
                              <TableCell className="font-medium">
                                {u?.username || '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {u?.email || '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {u?.phone || '—'}
                              </TableCell>
                              <TableCell>{formatDate(b.appointmentDate)}</TableCell>
                              <TableCell>{timeSlot}</TableCell>
                              <TableCell>
                                <AppointmentModeCell booking={b} />
                              </TableCell>
                              <TableCell>
                                <NutritionistStatusBadge status={b.bookingStatus} />
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {formatDateTime(b.createdAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {isPending && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => accept.mutate(b._id)}
                                        disabled={acceptingThis}
                                      >
                                        <IconCheck className="w-4 h-4 mr-1" />
                                        {acceptingThis ? 'Accepting…' : 'Accept'}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => setConfirmReject(b)}
                                      >
                                        <IconX className="w-4 h-4 mr-1" /> Reject
                                      </Button>
                                    </>
                                  )}
                                  {userId && (
                                    <Button asChild size="sm" variant="outline">
                                      <Link href={`/admin/users/${userId}`}>View User</Link>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={!!confirmReject}
        onOpenChange={(open) => {
          if (!open && !reject.isPending) setConfirmReject(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject nutritionist booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark{' '}
              <span className="font-medium">
                {confirmReject?.userId?.username || 'this member'}
              </span>
              's nutritionist appointment as rejected and restore slot capacity. The user will
              be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reject.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={reject.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (!confirmReject) return
                reject.mutate(confirmReject._id, {
                  onSettled: () => setConfirmReject(null),
                })
              }}
            >
              {reject.isPending ? 'Rejecting…' : 'Confirm Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
