'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IconArrowLeft,
  IconEdit,
  IconMail,
  IconPhone,
  IconCheck,
  IconX,
  IconSalad,
  IconEye,
  IconFileText,
  IconCreditCard,
  IconCalendar,
  IconRun,
} from '@tabler/icons-react'
import { GrantGraceDialog } from '@/components/grant-grace-dialog'
import { useUser } from '@/hooks/use-users'
import { MemberWorkoutJourney } from '@/components/workouts/member-workout-journey'
import { useTrainers, useAssignTrainerToUser } from '@/hooks/use-trainers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBookings } from '@/hooks/use-bookings'
import { useMemberships } from '@/hooks/use-memberships'
import { useServices } from '@/hooks/use-services'
import { useTherapies } from '@/hooks/use-therapies'
import { useGroupClasses } from '@/hooks/use-group-classes'
import { useSlots } from '@/hooks/use-slots'
import { useOnboardingProfile } from '@/hooks/use-onboarding'
import { normalizeHealthMarkers, normalizeProfile } from '@/lib/onboarding-normalize'
import { BOOKING_STATUS, type BookingStatusValue } from '@/lib/services/booking.service'
import { getBookingServiceName, getBookingTimeSlotLabel } from '@/lib/populated'
import { StatusBadge } from '@/components/status-badge'
import { MemberOnboardingWorkflow } from '@/components/member-onboarding-workflow'
import { MemberBcaMetrics } from '@/components/member-bca-metrics'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTable } from '@/components/skeleton-loader'
import { Skeleton } from '@/components/ui/skeleton'
import { HealthMarkersDialog } from '@/components/health-markers-dialog'
import { HealthGoalsDialog } from '@/components/health-goals-dialog'
import { ConsentDialog } from '@/components/consent-dialog'
import { OnboardingReportsDialog } from '@/components/onboarding-reports-dialog'
import { InterestSummary } from '@/components/crm/interest-summary'
import {
  computeBmi,
  computeProteinGoalGrams,
  computeWaterIntakeLiters,
  formatHealthMarkerTimestamp,
  getBmiCategory,
  getSleepQuality,
  toNumberSafe,
} from '@/lib/health-insights'
import type { PopulatedServiceRef, PopulatedSlotRef } from '@/lib/populated'

const STATUS_TO_BADGE: Record<BookingStatusValue, string> = {
  0: 'booked',
  1: 'confirmed',
  2: 'cancelled',
  3: 'completed',
  4: 'inactive',
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatDateForDisplay(value?: string): string {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : DATE_FORMATTER.format(parsed)
}

function formatPrice(amount: number | string, currency?: string) {
  const parsed = Number(amount || 0)
  const isUSD = currency?.toUpperCase() === 'USD'
  const symbol = isUSD ? '$' : '₹'
  return `${symbol}${parsed.toFixed(2)}`
}

function isUpcoming(dateStr: string): boolean {
  if (!dateStr) return false
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return parsed.getTime() >= today.getTime()
}

function StatusFlag({
  label,
  value,
  action,
}: {
  label: string
  value: boolean | undefined
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {value ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
            <IconCheck className="h-4 w-4" /> Completed
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <IconX className="h-4 w-4" /> Pending
          </span>
        )}
        {action}
      </div>
    </div>
  )
}

function InsightStat({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  const display =
    value === null || value === undefined || value === '' ? '—' : String(value)
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{display}</p>
    </div>
  )
}

interface BookingRow {
  _id: string
  bookingDate: string
  status: BookingStatusValue
  service?: PopulatedServiceRef | null
  slot?: PopulatedSlotRef | null
  classId?: any
  sessionId?: any
  startTime?: string
  endTime?: string
  name?: string
  title?: string
}

function BookingsTable({
  rows,
  serviceMap,
  classMap,
  slotMap,
}: {
  rows: BookingRow[]
  serviceMap: Map<string, string>
  classMap?: Map<string, string>
  slotMap: Map<string, string>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type / Service</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time Slot</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((b) => {
          const serviceName = getBookingServiceName(b, classMap, serviceMap, '—')
          const slotLabel = getBookingTimeSlotLabel(b, slotMap, '—')
          const statusLabel = STATUS_TO_BADGE[b.status] || 'pending'

          const isClass = Boolean(b.classId || b.sessionId)
          const classObj = typeof b.classId === 'object' ? b.classId : null
          const sessionType = classObj?.sessionType || (isClass ? 'group_class' : null)
          const instructor = classObj?.instructor

          return (
            <TableRow key={b._id}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium">{serviceName}</span>
                    {sessionType && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {sessionType === 'live_stream' ? 'Live Stream' : 'Group Class'}
                      </Badge>
                    )}
                  </div>
                  {instructor && (
                    <span className="text-xs text-muted-foreground">
                      Instructor: {instructor}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatDateForDisplay(b.bookingDate)}</TableCell>
              <TableCell>{slotLabel}</TableCell>
              <TableCell>
                <StatusBadge status={statusLabel} size="sm" />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default function UserDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const idParam = params?.id
  const userId = Array.isArray(idParam) ? idParam[0] : idParam || ''

  const { data: user, isLoading, isError } = useUser(userId)
  const { data: rawProfile } = useOnboardingProfile(userId)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG_AUTH === '1' && rawProfile) {
      console.debug('[onboarding-profile]', userId, rawProfile)
    }
  }, [rawProfile, userId])

  const profile = useMemo(() => normalizeProfile(rawProfile), [rawProfile])
  const onboardingGoals = useMemo(() => {
    const hg = profile?.healthGoals
    if (!hg) return []
    const rawGoals = hg.goals || hg.primaryGoals
    if (!rawGoals) return []
    if (Array.isArray(rawGoals)) {
      return rawGoals.filter(Boolean)
    }
    if (typeof rawGoals === 'string') {
      return rawGoals.split(',').map((g) => g.trim()).filter(Boolean)
    }
    return []
  }, [profile])

  const healthMarkers = useMemo(
    () => normalizeHealthMarkers(profile.healthMarkers),
    [profile.healthMarkers],
  )

  const [markersOpen, setMarkersOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)

  const { data: memberships, isLoading: membershipsLoading } = useMemberships()
  const { data: bookings, isLoading: bookingsLoading } = useBookings()
  const { data: services } = useServices()
  const { data: therapies } = useTherapies()
  const { data: groupClasses } = useGroupClasses()
  const { data: slots } = useSlots()

  const userMemberships = useMemo(
    () => (memberships ?? []).filter((m) => m.userId === userId),
    [memberships, userId],
  )

  const serviceMap = useMemo(() => {
    const m = new Map<string, string>()
    ;(services ?? []).forEach((s) => m.set(s.id, s.name))
    ;(therapies ?? []).forEach((t) => m.set(t.id, t.name))
    return m
  }, [services, therapies])

  const classMap = useMemo(() => {
    const m = new Map<string, string>()
    ;(groupClasses ?? []).forEach((c) => m.set(c.id, c.name))
    return m
  }, [groupClasses])

  const slotMap = useMemo(() => {
    const m = new Map<string, string>()
    ;(slots ?? []).forEach((s) => {
      const label = s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : s.startTime || '—'
      m.set(s._id, label)
    })
    return m
  }, [slots])

  const userBookings = useMemo(() => {
    const list = (bookings ?? []).filter((b) => b.user?._id === userId)
    return [...list].sort((a, b) => {
      const ta = new Date(a.bookingDate).getTime() || 0
      const tb = new Date(b.bookingDate).getTime() || 0
      return tb - ta
    })
  }, [bookings, userId])

  const insightBmi = useMemo(() => {
    if (healthMarkers?.bmi != null && healthMarkers.bmi !== '') {
      return toNumberSafe(healthMarkers.bmi)
    }
    return computeBmi(healthMarkers?.height, healthMarkers?.weight)
  }, [healthMarkers])
  const insightBmiCategory = useMemo(() => getBmiCategory(insightBmi), [insightBmi])
  const insightWaterL = useMemo(
    () => computeWaterIntakeLiters(healthMarkers?.weight),
    [healthMarkers],
  )
  const insightProteinG = useMemo(
    () => computeProteinGoalGrams(healthMarkers?.weight),
    [healthMarkers],
  )
  const insightSleepQuality = useMemo(
    () => getSleepQuality(healthMarkers?.sleepHours),
    [healthMarkers],
  )

  const upcomingBookings = useMemo(
    () => userBookings.filter((b) => isUpcoming(b.bookingDate) && Number(b.status) !== 2),
    [userBookings],
  )
  const pastBookings = useMemo(
    () => userBookings.filter((b) => !isUpcoming(b.bookingDate) || Number(b.status) === 2),
    [userBookings],
  )

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Loading user...</CardTitle>
          </CardHeader>
        </Card>
      )}

      {isError && (
        <Card>
          <CardHeader>
            <CardTitle>Failed to load user</CardTitle>
            <CardDescription>Please verify API connectivity.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!isLoading && !user && !isError && (
        <Card>
          <CardHeader>
            <CardTitle>User not found</CardTitle>
          </CardHeader>
        </Card>
      )}

      {user && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-2xl">{user.username}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <GrantGraceDialog userId={userId} userName={user.username} />
                <Button>
                  <IconEdit className="w-4 h-4 mr-2" />
                  Edit User
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <IconMail className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IconPhone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{user.phone || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium">{user.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="font-medium">{user.age || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{user.createdAt}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Updated</p>
                  <p className="font-medium">{user.updatedAt}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Same panel the leads board shows, for whoever reaches this
              person from their member record instead. Renders nothing when
              there is no consented activity. */}
          <InterestSummary userId={userId} />

          <AssignedTrainerSection
            userId={userId}
            currentTrainerId={
              typeof user.assignedTrainer === 'object' && user.assignedTrainer
                ? (user.assignedTrainer as any)._id
                : typeof user.assignedTrainer === 'string'
                ? user.assignedTrainer
                : undefined
            }
          />

          {/* ─── BODY COMPOSITION (ACTIVE X) ─── */}
          <MemberBcaMetrics userId={userId} />

          <Card>
            <CardHeader>
              <CardTitle>Health Goals</CardTitle>
              <CardDescription>Submitted during onboarding</CardDescription>
            </CardHeader>
            <CardContent>
              {onboardingGoals && onboardingGoals.length ? (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {onboardingGoals.map((goal) => (
                    <li key={goal}>{goal}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No onboarding goals submitted yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Memberships</CardTitle>
              <CardDescription>Plans assigned to or purchased by this member.</CardDescription>
            </CardHeader>
            <CardContent>
              {membershipsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : userMemberships.length === 0 ? (
                <EmptyState
                  icon={<IconCreditCard className="h-10 w-10" />}
                  title="No memberships"
                  description="This member has no active or past memberships."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {userMemberships.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-md border p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{m.planName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(m.price, m.currency)}
                          </p>
                        </div>
                        <StatusBadge status={m.status.toLowerCase()} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Start</p>
                          <p className="font-medium">{formatDateForDisplay(m.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expires</p>
                          <p className="font-medium">{formatDateForDisplay(m.endDate)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Credits</p>
                          <p className="font-medium">
                            {m.creditsRemaining} / {m.creditsIncluded}
                          </p>
                        </div>
                        {m.features && m.features.length > 0 && (
                          <div>
                            <p className="text-muted-foreground">Features</p>
                            <p className="font-medium truncate" title={m.features.join(', ')}>
                              {m.features.length}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>
                Nutritionist and consultation appointments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <SkeletonTable />
              ) : userBookings.length === 0 ? (
                <EmptyState
                  icon={<IconCalendar className="h-10 w-10" />}
                  title="No bookings yet"
                  description="This member has not booked any appointments."
                />
              ) : (
                <div className="space-y-6">
                  {upcomingBookings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Upcoming</h4>
                      <BookingsTable
                        rows={upcomingBookings}
                        serviceMap={serviceMap}
                        classMap={classMap}
                        slotMap={slotMap}
                      />
                    </div>
                  )}
                  {pastBookings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Past</h4>
                      <BookingsTable
                        rows={pastBookings}
                        serviceMap={serviceMap}
                        classMap={classMap}
                        slotMap={slotMap}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health Insights</CardTitle>
              <CardDescription>
                Auto-calculated from submitted health markers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InsightStat label="BMI" value={insightBmi} />
                <InsightStat label="Category" value={insightBmiCategory} />
                <InsightStat
                  label="Water"
                  value={insightWaterL !== null ? `${insightWaterL} L/day` : null}
                />
                <InsightStat
                  label="Protein"
                  value={insightProteinG !== null ? `${insightProteinG} g/day` : null}
                />
                <InsightStat label="Sleep" value={insightSleepQuality} />
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Recorded On</span>
                  <span className="text-foreground font-medium">
                    {formatHealthMarkerTimestamp(healthMarkers?.createdAt) ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="text-foreground font-medium">
                    {formatHealthMarkerTimestamp(healthMarkers?.updatedAt) ?? '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── WORKOUT JOURNEY ─── */}
          <MemberWorkoutJourney userId={userId} />

          {/* ─── MEMBERSHIP ONBOARDING ─── */}
          <MemberOnboardingWorkflow
            userId={userId}
            userName={user.username}
            hasActiveMembership={userMemberships.some((membership) => membership.status === 'Active')}
            hasTrainerAssigned={Boolean(user.assignedTrainer && user.assignedTrainer !== 'none')}
            onboarding={profile.onboardingStatus ?? user.onboardingStatus}
            expertAppointments={profile.expertAppointments}
          />

          <HealthMarkersDialog
            open={markersOpen}
            onOpenChange={setMarkersOpen}
            data={healthMarkers}
          />
          <HealthGoalsDialog
            open={goalsOpen}
            onOpenChange={setGoalsOpen}
            data={profile.healthGoals}
          />
          <ConsentDialog
            open={consentOpen}
            onOpenChange={setConsentOpen}
            data={profile.consent}
          />
          <OnboardingReportsDialog
            open={reportsOpen}
            onOpenChange={setReportsOpen}
            reports={profile.reports}
          />
        </>
      )}
    </div>
  )
}

function AssignedTrainerSection({
  userId,
  currentTrainerId,
}: {
  userId: string
  currentTrainerId?: string
}) {
  const { data: trainers = [], isLoading } = useTrainers()
  const assignMutation = useAssignTrainerToUser()
  const [selectedTrainer, setSelectedTrainer] = useState<string>(
    currentTrainerId || 'none',
  )

  useEffect(() => {
    if (currentTrainerId) setSelectedTrainer(currentTrainerId)
  }, [currentTrainerId])

  const handleSave = () => {
    const trainerId = selectedTrainer === 'none' ? null : selectedTrainer
    assignMutation.mutate({ userId, trainerId })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconRun className="w-5 h-5 text-primary" />
          Assigned Personal Trainer
        </CardTitle>
        <CardDescription>
          Assign a dedicated trainer to manage this member's workout plans and live training sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 max-w-md">
          <Select
            value={selectedTrainer}
            onValueChange={setSelectedTrainer}
            disabled={isLoading || assignMutation.isPending}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a trainer..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned (No Trainer)</SelectItem>
              {trainers.map((t) => (
                <SelectItem key={t._id} value={t._id}>
                  {t.trainerName} ({t.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSave}
            disabled={assignMutation.isPending}
          >
            Save Assignment
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
