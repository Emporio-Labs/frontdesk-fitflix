'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonTable } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import {
  IconRefresh,
  IconClock,
  IconCheck,
  IconX,
  IconMapPin,
  IconVideo,
  IconSettings,
  IconCircleCheck,
  IconSearch,
  IconUsers,
} from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  useSportsScientistBookings,
  useAcceptSportsScientistBooking,
  useRejectSportsScientistBooking,
  useCompleteSportsScientistBooking,
} from '@/hooks/use-sports-scientist-bookings'
import { useSlots } from '@/hooks/use-slots'
import { getBookingJoinState } from '@/lib/booking-window'
import type {
  SportsScientistBooking,
  SportsScientistBookingStatus,
  AppointmentMode,
} from '@/lib/services/sports-scientist.service'
import { useVideoConference } from '@/components/video-conference/video-conference-provider'

export type BookingSegment =
  | 'all'
  | 'pending'
  | 'reschedule'
  | 'booked'
  | 'completed'
  | 'expired'
  | 'rejected'
  | 'cancelled'

const SEGMENTS: { key: BookingSegment; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'reschedule', label: 'Reschedule Required' },
  { key: 'booked', label: 'Booked' },
  { key: 'completed', label: 'Completed' },
  { key: 'expired', label: 'Expired' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
]

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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
  return `${d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}, ${d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

function SportsScientistStatusBadge({
  status,
}: {
  status: SportsScientistBookingStatus
}) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: {
      label: 'PENDING',
      cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-transparent',
    },
    confirmed: {
      label: 'ACCEPTED',
      cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent',
    },
    booked: {
      label: 'BOOKED',
      cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent',
    },
    rejected: {
      label: 'REJECTED',
      cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-transparent',
    },
    cancelled: {
      label: 'CANCELLED',
      cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-transparent',
    },
    completed: {
      label: 'COMPLETED',
      cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-transparent',
    },
    expired: {
      label: 'EXPIRED',
      cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-transparent',
    },
    reschedulerequired: {
      label: 'AWAITING RESCHEDULE',
      cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-transparent',
    },
    reschedule_required: {
      label: 'AWAITING RESCHEDULE',
      cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-transparent',
    },
  }
  const statusKey = String(status || '').toLowerCase().replace(/_/g, '')
  const match = map[statusKey] || map.pending
  return <Badge className={match.cls}>{match.label}</Badge>
}

function AppointmentModeCell({
  booking,
}: {
  booking: SportsScientistBooking
}) {
  const mode: AppointmentMode = booking.appointmentMode ?? 'ONLINE'

  if (mode === 'IN_PERSON') {
    return (
      <div className="flex items-start gap-1.5 text-sm">
        <IconMapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
        <div>
          <div className="font-medium text-xs">Fitflix Clinic</div>
          <div className="text-[11px] text-muted-foreground">
            {booking.clinicLocation || '—'}
          </div>
        </div>
      </div>
    )
  }

  const isReady =
    !!booking.zegoRoomId ||
    !!booking.meetingLink ||
    String(booking.bookingStatus || '').toLowerCase() === 'confirmed'

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <IconVideo className="w-4 h-4 text-blue-500 shrink-0" />
      <div>
        <div className="font-medium">Online Session</div>
        {isReady ? (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Online (Ready)
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">
            Pending Confirmation
          </span>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  helper,
  loading,
}: {
  label: string
  value: number | string
  helper?: string
  loading?: boolean
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        {loading ? (
          <Skeleton className="h-6 w-10" />
        ) : (
          <span className="text-2xl font-bold leading-none">{value}</span>
        )}
        {helper && (
          <span className="text-[11px] text-muted-foreground truncate">
            {helper}
          </span>
        )}
      </div>
    </div>
  )
}

export function BookingsTab() {
  const [segment, setSegment] = useState<BookingSegment>('pending')
  const [search, setSearch] = useState('')

  // Dialog states
  const [acceptBooking, setAcceptBooking] = useState<SportsScientistBooking | null>(
    null,
  )
  const [meetingLink, setMeetingLink] = useState('')
  const [clinicLocation, setClinicLocation] = useState('')
  const [assignedExpertName, setAssignedExpertName] = useState('')

  const [confirmReject, setConfirmReject] = useState<SportsScientistBooking | null>(
    null,
  )
  const [rejectionReason, setRejectionReason] = useState('')

  const [confirmComplete, setConfirmComplete] = useState<SportsScientistBooking | null>(
    null,
  )

  const { startCall } = useVideoConference()

  const {
    data: bookings = [],
    isLoading,
    isError,
    refetch,
  } = useSportsScientistBookings()
  const { data: slots = [] } = useSlots()
  const accept = useAcceptSportsScientistBooking()
  const reject = useRejectSportsScientistBooking()
  const complete = useCompleteSportsScientistBooking()

  const counts = useMemo(() => {
    const acc = {
      all: bookings.length,
      pending: 0,
      reschedule: 0,
      booked: 0,
      completed: 0,
      expired: 0,
      rejected: 0,
      cancelled: 0,
    }
    for (const b of bookings) {
      const status = String(b.bookingStatus || '').toLowerCase()
      if (status === 'pending') acc.pending++
      else if (
        status === 'reschedulerequired' ||
        status === 'reschedule_required'
      )
        acc.reschedule++
      else if (
        status === 'confirmed' ||
        status === 'booked' ||
        status === 'accepted'
      )
        acc.booked++
      else if (status === 'completed') acc.completed++
      else if (status === 'expired') acc.expired++
      else if (status === 'rejected') acc.rejected++
      else if (status === 'cancelled') acc.cancelled++
    }
    return acc
  }, [bookings])

  const filtered = useMemo(() => {
    let list = bookings
    if (segment !== 'all') {
      list = list.filter((b) => {
        const status = String(b.bookingStatus || '').toLowerCase()
        if (segment === 'pending') return status === 'pending'
        if (segment === 'reschedule')
          return (
            status === 'reschedulerequired' || status === 'reschedule_required'
          )
        if (segment === 'booked')
          return (
            status === 'confirmed' ||
            status === 'booked' ||
            status === 'accepted'
          )
        if (segment === 'completed') return status === 'completed'
        if (segment === 'expired') return status === 'expired'
        if (segment === 'rejected') return status === 'rejected'
        if (segment === 'cancelled') return status === 'cancelled'
        return true
      })
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((b) => {
        const u = b.userId
        const username = u?.username?.toLowerCase() ?? ''
        const email = u?.email?.toLowerCase() ?? ''
        const phone = u?.phone?.toLowerCase() ?? ''
        return username.includes(q) || email.includes(q) || phone.includes(q)
      })
    }
    return list
  }, [bookings, segment, search])

  const upcomingSlots = useMemo(() => {
    const now = Date.now()
    const sevenDays = now + 7 * 86_400_000
    return slots
      .filter((s) => {
        if (s.expertType !== 'sports_scientist') return false
        if (s.isDaily) return true
        if (!s.date) return false
        const t = new Date(s.date).getTime()
        if (Number.isNaN(t)) return false
        return t >= now - 86_400_000 && t <= sevenDays
      })
      .slice(0, 8)
  }, [slots])

  const handleOpenAccept = (b: SportsScientistBooking) => {
    setAcceptBooking(b)
    setMeetingLink(b.meetingLink || '')
    setClinicLocation(b.clinicLocation || 'Fitflix Clinic')
    setAssignedExpertName(b.assignedExpertName || '')
  }

  const handleOpenReject = (b: SportsScientistBooking) => {
    setConfirmReject(b)
    setRejectionReason('')
  }

  const emptyMessage =
    segment === 'booked'
      ? 'No active confirmed sports scientist appointments.'
      : segment === 'pending'
      ? 'No sports scientist appointments awaiting action.'
      : segment === 'reschedule'
      ? 'No appointments currently require rescheduling.'
      : segment === 'completed'
      ? 'No consultations marked complete yet.'
      : segment === 'expired'
      ? 'No expired or missed appointments.'
      : segment === 'rejected'
      ? 'No rejected appointments.'
      : segment === 'cancelled'
      ? 'No cancelled appointments.'
      : 'No bookings found.'

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <Card>
        <CardHeader className="px-4 pt-4 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                Sports Scientist Appointments Roster
              </CardTitle>
              <CardDescription className="text-sm">
                Triage pending bookings, review history, and manage consultations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/slots">
                  <IconSettings className="w-4 h-4 mr-1" /> Manage Slots
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 pt-0">
          {/* Summary cards matching Roster style */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard
              label="Total Members"
              value={counts.all}
              helper="visible in roster"
              loading={isLoading}
            />
            <SummaryCard
              label="Pending"
              value={counts.pending}
              helper="awaiting accept"
              loading={isLoading}
            />
            <SummaryCard
              label="Reschedule"
              value={counts.reschedule}
              helper="awaiting user slot"
              loading={isLoading}
            />
            <SummaryCard
              label="Booked"
              value={counts.booked}
              helper="live — not yet held"
              loading={isLoading}
            />
            <SummaryCard
              label="Completed"
              value={counts.completed}
              helper="consultation held"
              loading={isLoading}
            />
            <SummaryCard
              label="Expired"
              value={counts.expired}
              helper="booked — call missed"
              loading={isLoading}
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1 rounded-md border p-1 bg-muted/20">
              {SEGMENTS.map((seg) => {
                const active = segment === seg.key
                const count = counts[seg.key]
                return (
                  <button
                    key={seg.key}
                    type="button"
                    onClick={() => setSegment(seg.key)}
                    className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {seg.label}
                    <span
                      className={`ml-1.5 text-xs ${
                        active ? 'opacity-90' : 'opacity-70'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by username, email, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => refetch()}
            >
              <IconRefresh className="mr-1 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Table */}
          {isError ? (
            <div className="py-8 text-center text-red-500">
              Failed to load bookings.{' '}
              <button className="underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <SkeletonTable />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<IconUsers className="h-10 w-10" />}
              title="No bookings"
              description={emptyMessage}
            />
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
                    <TableHead>Mode</TableHead>
                    <TableHead>Booking Status</TableHead>
                    <TableHead>Created Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => {
                    const u = b.userId
                    const userId = u?._id ?? ''
                    const timeSlot =
                      b.timeSlot ??
                      (b.startTime && b.endTime
                        ? `${b.startTime} – ${b.endTime}`
                        : formatTime(b.appointmentDate))
                    const isPending =
                      String(b.bookingStatus || '').toLowerCase() === 'pending'
                    const isConfirmed =
                      String(b.bookingStatus || '').toLowerCase() ===
                        'confirmed' ||
                      String(b.bookingStatus || '').toLowerCase() === 'booked'
                    const acceptingThis =
                      accept.isPending && accept.variables?.id === b._id

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
                          <SportsScientistStatusBadge status={b.bookingStatus} />
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
                                  onClick={() => handleOpenAccept(b)}
                                  disabled={acceptingThis}
                                >
                                  <IconCheck className="w-4 h-4 mr-1" />
                                  {acceptingThis ? 'Accepting…' : 'Accept'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleOpenReject(b)}
                                >
                                  <IconX className="w-4 h-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {isConfirmed && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                                  onClick={() => setConfirmComplete(b)}
                                  disabled={complete.isPending}
                                >
                                  <IconCircleCheck className="w-4 h-4 mr-1" />
                                  Complete
                                </Button>
                                {(b.appointmentMode ?? 'ONLINE') === 'ONLINE' &&
                                  (() => {
                                    const joinState = getBookingJoinState(
                                      b as any,
                                    )
                                    const disabled =
                                      joinState.state === 'too_early' ||
                                      joinState.state === 'ended'
                                    return (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        disabled={disabled}
                                        className={
                                          disabled
                                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }
                                        title={
                                          joinState.label ?? 'Join Video Call'
                                        }
                                        onClick={() =>
                                          startCall({
                                            sessionId: b._id,
                                            roomID:
                                              b.zegoRoomId ||
                                              `ss_session_${b._id}`,
                                            sessionTitle: `${
                                              u?.username || 'Member'
                                            } — Sports Scientist Consult`,
                                            mode: 'GroupCall',
                                            joinMuted: true,
                                            onEnded: () => refetch(),
                                          })
                                        }
                                      >
                                        <IconVideo className="w-4 h-4 mr-1" />{' '}
                                        Join Call
                                      </Button>
                                    )
                                  })()}
                              </>
                            )}
                            {userId && (
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/admin/users/${userId}`}>
                                  View User
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Slots Capacity Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Available Slots (Next 7 days)
          </CardTitle>
          <CardDescription>
            Read-only view for sports-scientist slots. Use Manage Slots to edit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingSlots.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              No sports scientist slots configured. Use Manage Slots to add one.
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingSlots.map((s) => {
                const bookedCount = Math.max(
                  0,
                  (s.capacity ?? 0) - (s.remainingCapacity ?? 0),
                )
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
                        <Badge
                          variant="secondary"
                          className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-transparent"
                        >
                          Full
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent"
                        >
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

      {/* Accept Booking Dialog */}
      <Dialog
        open={!!acceptBooking}
        onOpenChange={(open) => {
          if (!open && !accept.isPending) setAcceptBooking(null)
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Accept Sports Scientist Booking</DialogTitle>
            <DialogDescription>
              Assign details for{' '}
              <span className="font-medium text-foreground">
                {acceptBooking?.userId?.username || 'this member'}
              </span>
              &apos;s appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="meeting-link">Meeting Link (Online)</Label>
              <Input
                id="meeting-link"
                placeholder="https://meet.google.com/xyz or video room url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-location">Clinic Location (In-Person)</Label>
              <Input
                id="clinic-location"
                placeholder="Fitflix Center, Clinic Room 2"
                value={clinicLocation}
                onChange={(e) => setClinicLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expert-name">Assigned Sports Scientist</Label>
              <Input
                id="expert-name"
                placeholder="e.g. Dr. Aryan Varma"
                value={assignedExpertName}
                onChange={(e) => setAssignedExpertName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={accept.isPending}
              onClick={() => setAcceptBooking(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={accept.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (!acceptBooking) return
                accept.mutate(
                  {
                    id: acceptBooking._id,
                    payload: {
                      meetingLink: meetingLink.trim() || null,
                      clinicLocation: clinicLocation.trim() || null,
                      assignedExpertName: assignedExpertName.trim() || null,
                    },
                  },
                  {
                    onSettled: () => setAcceptBooking(null),
                  },
                )
              }}
            >
              {accept.isPending ? 'Accepting…' : 'Confirm Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Booking Dialog */}
      <AlertDialog
        open={!!confirmReject}
        onOpenChange={(open) => {
          if (!open && !reject.isPending) setConfirmReject(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject sports scientist booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark{' '}
              <span className="font-medium">
                {confirmReject?.userId?.username || 'this member'}
              </span>
              &apos;s sports scientist appointment as rejected, restore slot
              capacity, and reset their onboarding step so they can rebook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="reject-reason">Reason for rejection</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Requested slot unavailable, please rebook for next week"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reject.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={reject.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (!confirmReject) return
                reject.mutate(
                  {
                    id: confirmReject._id,
                    payload: {
                      rejectionReason: rejectionReason.trim() || null,
                    },
                  },
                  {
                    onSettled: () => setConfirmReject(null),
                  },
                )
              }}
            >
              {reject.isPending ? 'Rejecting…' : 'Confirm Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Booking Dialog */}
      <AlertDialog
        open={!!confirmComplete}
        onOpenChange={(open) => {
          if (!open && !complete.isPending) setConfirmComplete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark consultation as complete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark{' '}
              <span className="font-medium">
                {confirmComplete?.userId?.username || 'this member'}
              </span>
              &apos;s sports scientist consultation as completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={complete.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={complete.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (!confirmComplete) return
                complete.mutate(confirmComplete._id, {
                  onSettled: () => setConfirmComplete(null),
                })
              }}
            >
              {complete.isPending ? 'Completing…' : 'Mark Completed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
