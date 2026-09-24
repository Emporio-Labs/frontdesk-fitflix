'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  IconCalendarEvent,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDumbbell,
  IconRefresh,
  IconUsers,
  IconUserCheck,
  IconUserX,
  IconVideo,
  IconX,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/skeleton-loader'
import { StatusBadge } from '@/components/status-badge'
import { useHighlightRow } from '@/components/highlight-row'
import { LogWorkoutDialog } from '@/components/personal-training/log-workout-dialog'
import { NoShowDialog } from '@/components/personal-training/no-show-dialog'
import { useAuth } from '@/hooks/use-auth'
import { usePtAdminBookings, usePtTrainers } from '@/hooks/use-personal-training'
import {
  useGroupClassBookings,
  useUpdateGroupClassBookingStatus,
} from '@/hooks/use-group-class-bookings'
import { getBookingJoinState } from '@/lib/booking-window'
import { useVideoConference } from '@/components/video-conference/video-conference-provider'
import type { UnifiedBookingDto } from '@/lib/services/personal-training.service'
import type { GroupClassBooking } from '@/lib/services/group-class-booking.service'

function todayLocalIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type OneOnOneRow = { kind: '1on1'; startTime: string; booking: UnifiedBookingDto }
type ClassRow = {
  kind: 'class'
  startTime: string
  endTime: string
  sessionId: string
  className: string
  bookings: GroupClassBooking[]
}
type TodayRow = OneOnOneRow | ClassRow

export default function TrainerTodayPage() {
  const { user } = useAuth()
  const { startCall } = useVideoConference()

  const todayISO = todayLocalIso()

  const { data: trainers } = usePtTrainers()

  // Match by id → email → name, mirroring the trusted pattern from
  // app/admin/personal-training/page.tsx.
  const currentTrainer =
    (trainers || []).find(
      (t) =>
        t._id === user?.id ||
        t.email?.toLowerCase() === user?.email?.toLowerCase() ||
        t.name?.toLowerCase() === user?.name?.toLowerCase()
    ) || null
  const currentTrainerId = currentTrainer?._id || user?.id || ''

  const {
    data: ptBookings,
    isLoading: isPtLoading,
    refetch: refetchPt,
  } = usePtAdminBookings({ date: todayISO, expertId: currentTrainerId })

  const {
    data: allClassBookings,
    isLoading: isClassLoading,
    refetch: refetchClasses,
  } = useGroupClassBookings({ refetchInterval: 15_000 })

  const updateClassStatus = useUpdateGroupClassBookingStatus()

  // Modals
  const [completingBooking, setCompletingBooking] = useState<UnifiedBookingDto | null>(null)
  const [noShowBooking, setNoShowBooking] = useState<UnifiedBookingDto | null>(null)
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({})

  const rows: TodayRow[] = useMemo(() => {
    const oneOnOnes: OneOnOneRow[] = (ptBookings || []).map((b) => ({
      kind: '1on1' as const,
      startTime: b.startTime,
      booking: b,
    }))

    // Group class bookings today taught by this trainer, grouped by sessionId.
    const myClassesToday = (allClassBookings || []).filter((b) => {
      if (!currentTrainerId) return false
      if ((b.bookingDate || '').slice(0, 10) !== todayISO) return false
      const trainerId = b.sessionId?.trainerId?._id
      return trainerId ? trainerId === currentTrainerId : false
    })

    const bySession = new Map<string, GroupClassBooking[]>()
    for (const b of myClassesToday) {
      const sid = b.sessionId?._id
      if (!sid) continue
      const list = bySession.get(sid) || []
      list.push(b)
      bySession.set(sid, list)
    }

    const classRows: ClassRow[] = Array.from(bySession.entries()).map(([sid, list]) => {
      const first = list[0]
      const start = first.sessionId?.startTime || first.slot?.startTime || '00:00'
      const end = first.sessionId?.endTime || first.slot?.endTime || ''
      const name = first.classId?.name || first.service?.serviceName || 'Group Class'
      return {
        kind: 'class' as const,
        startTime: start,
        endTime: end,
        sessionId: sid,
        className: name,
        bookings: list,
      }
    })

    const combined: TodayRow[] = [...oneOnOnes, ...classRows]
    combined.sort((a, b) => a.startTime.localeCompare(b.startTime))
    return combined
  }, [ptBookings, allClassBookings, currentTrainerId, todayISO])

  const oneOnOneCount = rows.filter((r) => r.kind === '1on1').length
  const classCount = rows.filter((r) => r.kind === 'class').length
  const attendeesExpected =
    (ptBookings || []).length +
    rows.reduce((sum, r) => (r.kind === 'class' ? sum + r.bookings.length : sum), 0)

  const isLoading = isPtLoading || isClassLoading

  const handleRefresh = () => {
    refetchPt()
    refetchClasses()
  }

  const toggleClass = (sid: string) =>
    setExpandedClasses((prev) => ({ ...prev, [sid]: !prev[sid] }))

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Today
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your classes and 1-on-1 sessions for {todayISO}. Mark completed or no-show as they happen so
            member credits stay accurate.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <IconRefresh className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Sessions Today</CardTitle>
            <IconCalendarEvent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '…' : rows.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Classes + 1-on-1</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">1-on-1 Sessions</CardTitle>
            <IconDumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '…' : oneOnOneCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Personal training</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Group Classes</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '…' : classCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Sessions you teach</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Members Expected</CardTitle>
            <IconUserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '…' : attendeesExpected}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Today feed */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Your Day, In Order</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<IconCalendarEvent className="h-10 w-10" />}
                title="No sessions on your calendar today"
                description="When members book 1-on-1s with you or you're rostered on a class, it'll show up here."
                action={
                  <Link href="/admin/personal-training">
                    <Button variant="outline" size="sm">
                      Open Personal Training hub
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Time</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead className="hidden md:table-cell">Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    if (row.kind === '1on1') {
                      return (
                        <OneOnOneRowView
                          key={`pt-${row.booking._id}`}
                          row={row}
                          onLog={() => setCompletingBooking(row.booking)}
                          onNoShow={() => setNoShowBooking(row.booking)}
                          onStartCall={() =>
                            startCall({
                              sessionId: row.booking._id,
                              roomID: row.booking.zegoRoomId || row.booking._id,
                              sessionTitle: `${
                                typeof row.booking.userId === 'object' && row.booking.userId !== null
                                  ? (row.booking.userId as { username?: string }).username || 'Member'
                                  : 'Member'
                              } — PT Session`,
                              mode: 'GroupCall',
                              joinMuted: true,
                            })
                          }
                        />
                      )
                    }
                    return (
                      <ClassRowView
                        key={`class-${row.sessionId}`}
                        row={row}
                        expanded={!!expandedClasses[row.sessionId]}
                        onToggle={() => toggleClass(row.sessionId)}
                        onMark={(bookingId, status) =>
                          updateClassStatus.mutate({ id: bookingId, status })
                        }
                        pending={updateClassStatus.isPending}
                      />
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <LogWorkoutDialog
        booking={completingBooking}
        open={Boolean(completingBooking)}
        onOpenChange={(open) => !open && setCompletingBooking(null)}
      />
      <NoShowDialog
        booking={noShowBooking}
        open={Boolean(noShowBooking)}
        onOpenChange={(open) => !open && setNoShowBooking(null)}
      />
    </div>
  )
}

// -- Row components -----------------------------------------------------------

function OneOnOneRowView({
  row,
  onLog,
  onNoShow,
  onStartCall,
}: {
  row: OneOnOneRow
  onLog: () => void
  onNoShow: () => void
  onStartCall: () => void
}) {
  const b = row.booking
  const member =
    typeof b.userId === 'object' && b.userId !== null
      ? (b.userId as { username?: string; phone?: string })
      : { username: 'Member', phone: '' }

  const isActive = b.status === 'CONFIRMED' || b.status === 'PENDING'
  const joinState =
    b.appointmentMode === 'ONLINE' && b.status === 'CONFIRMED'
      ? getBookingJoinState(b, new Date(), { leadMinutes: 30, graceMinutes: 30 })
      : null
  const isJoinDisabled = joinState?.state === 'too_early' || joinState?.state === 'ended'

  const highlight = useHighlightRow<HTMLTableRowElement>(b._id)

  return (
    <TableRow ref={highlight.ref} className={highlight.className}>
      <TableCell data-label="Time" className="font-medium whitespace-nowrap">
        {b.startTime}
        {b.endTime ? ` – ${b.endTime}` : ''}
      </TableCell>
      <TableCell data-label="Session">
        <div className="flex items-center gap-2">
          <IconDumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="font-medium truncate">{member.username || 'Member'}</div>
            <div className="text-xs text-muted-foreground">1-on-1 Personal Training</div>
          </div>
        </div>
      </TableCell>
      <TableCell data-label="Details" className="hidden md:table-cell">
        <Badge variant={b.appointmentMode === 'ONLINE' ? 'default' : 'outline'} className="gap-1">
          {b.appointmentMode === 'ONLINE' ? (
            <IconVideo className="h-3 w-3" />
          ) : (
            <IconDumbbell className="h-3 w-3" />
          )}
          {b.appointmentMode}
        </Badge>
        {member.phone && (
          <div className="text-xs text-muted-foreground mt-1">{member.phone}</div>
        )}
      </TableCell>
      <TableCell data-label="Status">
        <StatusBadge status={b.status.toLowerCase()} size="sm" />
      </TableCell>
      <TableCell data-hide-label className="text-right">
        <div className="flex flex-wrap justify-end gap-2">
          {b.appointmentMode === 'ONLINE' && b.status === 'CONFIRMED' && (
            <Button
              size="sm"
              variant="default"
              className="gap-1"
              disabled={isJoinDisabled}
              title={isJoinDisabled ? joinState?.label ?? 'Video window closed' : undefined}
              onClick={onStartCall}
            >
              <IconVideo className="h-3.5 w-3.5" />
              Start Call
            </Button>
          )}
          {isActive && (
            <>
              <Button size="sm" variant="outline" className="gap-1" onClick={onLog}>
                <IconCheck className="h-3.5 w-3.5" />
                Log &amp; Complete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                onClick={onNoShow}
              >
                <IconUserX className="h-3.5 w-3.5" />
                No-Show
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function ClassRowView({
  row,
  expanded,
  onToggle,
  onMark,
  pending,
}: {
  row: ClassRow
  expanded: boolean
  onToggle: () => void
  onMark: (bookingId: string, status: 'completed' | 'noshow') => void
  pending: boolean
}) {
  const attendeeCount = row.bookings.length
  const rosterStatusLabel =
    row.bookings.every((b) => b.status?.toLowerCase() === 'completed')
      ? 'completed'
      : row.bookings.every((b) =>
          ['noshow', 'no-show', 'no_show', 'unattended'].includes(b.status?.toLowerCase() || '')
        )
      ? 'noshow'
      : 'confirmed'

  const highlight = useHighlightRow<HTMLTableRowElement>(row.sessionId)

  return (
    <>
      <TableRow ref={highlight.ref} className={highlight.className}>
        <TableCell data-label="Time" className="font-medium whitespace-nowrap align-top">
          {row.startTime}
          {row.endTime ? ` – ${row.endTime}` : ''}
        </TableCell>
        <TableCell data-label="Session">
          <div className="flex items-center gap-2">
            <IconUsers className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="font-medium truncate">{row.className}</div>
              <div className="text-xs text-muted-foreground">Group class</div>
            </div>
          </div>
        </TableCell>
        <TableCell data-label="Details" className="hidden md:table-cell">
          <Badge variant="secondary" className="gap-1">
            <IconUsers className="h-3 w-3" />
            {attendeeCount} booked
          </Badge>
        </TableCell>
        <TableCell data-label="Status">
          <StatusBadge status={rosterStatusLabel} size="sm" />
        </TableCell>
        <TableCell data-hide-label className="text-right">
          <Button size="sm" variant="outline" className="gap-1" onClick={onToggle}>
            {expanded ? (
              <IconChevronDown className="h-3.5 w-3.5" />
            ) : (
              <IconChevronRight className="h-3.5 w-3.5" />
            )}
            {expanded ? 'Hide' : 'Attendance'}
          </Button>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30 py-3">
            <Collapsible open={expanded}>
              <CollapsibleTrigger asChild>
                <span className="sr-only">Toggle roster</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-md border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="hidden md:table-cell">Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Mark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {row.bookings.map((b) => {
                        const status = (b.status || 'confirmed').toLowerCase()
                        const isFinal =
                          status === 'completed' ||
                          status === 'noshow' ||
                          status === 'no-show' ||
                          status === 'no_show' ||
                          status === 'unattended' ||
                          status === 'cancelled'
                        return (
                          <TableRow key={b._id}>
                            <TableCell data-label="Member" className="font-medium">
                              {b.user?.username || 'Member'}
                            </TableCell>
                            <TableCell
                              data-label="Contact"
                              className="hidden md:table-cell text-sm text-muted-foreground"
                            >
                              {b.user?.phone || b.user?.email || '—'}
                            </TableCell>
                            <TableCell data-label="Status">
                              <StatusBadge status={status} size="sm" />
                            </TableCell>
                            <TableCell data-hide-label className="text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  disabled={pending || isFinal}
                                  onClick={() => onMark(b._id, 'completed')}
                                >
                                  <IconCheck className="h-3.5 w-3.5" />
                                  Attended
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                                  disabled={pending || isFinal}
                                  onClick={() => onMark(b._id, 'noshow')}
                                >
                                  <IconX className="h-3.5 w-3.5" />
                                  No-Show
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
