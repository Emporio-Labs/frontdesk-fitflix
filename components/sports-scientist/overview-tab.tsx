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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonTable } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUsers } from '@/hooks/use-users'
import { useSportsScientistBookings } from '@/hooks/use-sports-scientist-bookings'
import { useSlots } from '@/hooks/use-slots'
import { useVideoConference } from '@/components/video-conference/video-conference-provider'
import { getBookingJoinState } from '@/lib/booking-window'
import type { SportsScientistBooking } from '@/lib/services/sports-scientist.service'
import {
  IconCalendarEvent,
  IconDna,
  IconActivity,
  IconEye,
  IconVideo,
  IconClock,
  IconStethoscope,
  IconArrowRight,
  IconCheck,
} from '@tabler/icons-react'

function StatCard({
  label,
  value,
  loading,
  icon: Icon,
  onClick,
  clickable = false,
}: {
  label: string
  value: number | string
  loading?: boolean
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  clickable?: boolean
}) {
  return (
    <Card
      onClick={onClick}
      className={`transition-all duration-200 ${
        clickable
          ? 'cursor-pointer hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5'
          : ''
      }`}
    >
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {clickable && (
              <span className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-full">
                View
              </span>
            )}
          </div>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          )}
        </div>
        <div className="rounded-full bg-muted/60 p-3 text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  )
}

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

function isToday(dateStr?: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function OverviewTab({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: string, filter?: string) => void
}) {
  const { data: users = [], isLoading: usersLoading } = useUsers()
  const {
    data: bookings = [],
    isLoading: bookingsLoading,
  } = useSportsScientistBookings()
  const { data: slots = [], isLoading: slotsLoading } = useSlots()
  const { startCall } = useVideoConference()

  const [activeXDialogOpen, setActiveXDialogOpen] = useState(false)

  const activeXUsers = useMemo(() => {
    return users.filter((u) => u.onboardingStatus?.activeXTestCompleted)
  }, [users])

  const valdCount = useMemo(() => {
    return users.filter((u) => u.onboardingStatus?.valdTestCompleted).length
  }, [users])

  const ssBookedCount = useMemo(() => {
    return users.filter((u) => u.onboardingStatus?.sportsScientistBooked).length
  }, [users])

  const todaysConsultations = useMemo(() => {
    return bookings.filter((b) => isToday(b.appointmentDate))
  }, [bookings])

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

  return (
    <div className="space-y-5">
      {/* 3-up Interactive Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active X on File"
          value={activeXUsers.length}
          loading={usersLoading}
          icon={IconDna}
          clickable
          onClick={() => setActiveXDialogOpen(true)}
        />
        <StatCard
          label="VALD Completed"
          value={valdCount}
          loading={usersLoading}
          icon={IconActivity}
          clickable={valdCount > 0}
          onClick={() => onNavigateTab?.('active-users', 'vald')}
        />
        <StatCard
          label="Sports Scientist Booked"
          value={ssBookedCount}
          loading={usersLoading}
          icon={IconStethoscope}
          clickable
          onClick={() => onNavigateTab?.('bookings')}
        />
      </div>

      {/* Split layout: Consultations + Capacity */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today's Consultations */}
        <Card className="lg:col-span-2">
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconCalendarEvent className="h-5 w-5" />
              Today&apos;s Consultations
            </CardTitle>
            <CardDescription className="text-sm">
              Sports science consultations scheduled for today
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {bookingsLoading ? (
              <SkeletonTable />
            ) : todaysConsultations.length === 0 ? (
              <EmptyState
                icon={<IconCalendarEvent className="h-10 w-10" />}
                title="No consultations today"
                description="No sports scientist consultations are scheduled for today."
              />
            ) : (
              <div className="space-y-2">
                {todaysConsultations.map((b) => {
                  const userObj = b.userId
                  const username = userObj?.username || 'Member'
                  const email = userObj?.email || userObj?.phone || '—'
                  const userId = userObj?._id || ''
                  const isConfirmed =
                    String(b.bookingStatus || '').toLowerCase() === 'confirmed' ||
                    String(b.bookingStatus || '').toLowerCase() === 'booked'
                  const isOnline = (b.appointmentMode ?? 'ONLINE') === 'ONLINE'
                  const joinState = getBookingJoinState(b as any)
                  const joinDisabled =
                    joinState.state === 'too_early' || joinState.state === 'ended'

                  return (
                    <div
                      key={b._id}
                      className="flex items-center justify-between rounded-lg border p-2.5"
                    >
                      <div>
                        <div className="text-sm font-medium">{username}</div>
                        <div className="text-sm text-muted-foreground">{email}</div>
                        {b.timeSlot && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Slot: {b.timeSlot}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {b.bookingStatus && (
                          <StatusBadge status={b.bookingStatus} size="sm" />
                        )}
                        {isConfirmed && isOnline && (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={joinDisabled}
                            className={
                              joinDisabled
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed h-8 text-xs'
                                : 'bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs'
                            }
                            title={joinState.label ?? 'Join Video Call'}
                            onClick={() =>
                              startCall({
                                sessionId: b._id,
                                roomID: b.zegoRoomId || `ss_session_${b._id}`,
                                sessionTitle: `${username} — Sports Scientist Consult`,
                                mode: 'GroupCall',
                                joinMuted: true,
                              })
                            }
                          >
                            <IconVideo className="mr-1 h-3.5 w-3.5" />
                            Join Call
                          </Button>
                        )}
                        {userId && (
                          <Link href={`/admin/users/${userId}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">
                              <IconEye className="mr-1 h-3.5 w-3.5" />
                              Open
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slot Capacity Card */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconClock className="h-5 w-5" />
              Sports Science Slots (7 Days)
            </CardTitle>
            <CardDescription className="text-sm">
              Capacity for sports scientist appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {slotsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : upcomingSlots.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No sports scientist slots found.{' '}
                <Link href="/admin/slots" className="text-primary underline">
                  Create one
                </Link>
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
                      <div>
                        <div className="font-medium text-xs">
                          {s.isDaily ? 'Daily' : formatDate(s.date)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {s.startTime} – {s.endTime}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          {bookedCount}/{s.capacity}
                        </span>
                        {s.isBooked ? (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-transparent text-[10px] px-1.5 py-0.5"
                          >
                            Full
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent text-[10px] px-1.5 py-0.5"
                          >
                            Avail
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
      </div>

      {/* Active X Members Dialog */}
      <Dialog open={activeXDialogOpen} onOpenChange={setActiveXDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconDna className="h-5 w-5 text-emerald-600" />
              Members with Active X Scans ({activeXUsers.length})
            </DialogTitle>
            <DialogDescription>
              These members have completed a Body Composition Analysis scan synced from the Active X cloud.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {activeXUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No members have Active X scans on file yet.
              </p>
            ) : (
              <div className="space-y-2">
                {activeXUsers.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{u.username}</span>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-transparent text-[10px] px-2 py-0.5"
                        >
                          <IconCheck className="w-3 h-3 mr-1" />
                          Scan Synced
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {u.phone || 'No phone'} &bull; {u.email || 'No email'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/users/${u._id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs">
                          <IconEye className="h-3.5 w-3.5 mr-1" />
                          View Body Composition
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t pt-3 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                setActiveXDialogOpen(false)
                onNavigateTab?.('active-users', 'activex')
              }}
            >
              Open in Active Users Tab <IconArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button size="sm" onClick={() => setActiveXDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
