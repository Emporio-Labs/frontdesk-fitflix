'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  IconStethoscope,
  IconSalad,
  IconEye,
  IconFileText,
  IconCreditCard,
  IconCalendar,
} from '@tabler/icons-react'
import { useUser } from '@/hooks/use-users'
import { useBookings } from '@/hooks/use-bookings'
import { useMemberships } from '@/hooks/use-memberships'
import { useServices } from '@/hooks/use-services'
import { useSlots } from '@/hooks/use-slots'
import { useOnboardingProfile } from '@/hooks/use-onboarding'
import { normalizeHealthMarkers, normalizeProfile } from '@/lib/onboarding-normalize'
import { BOOKING_STATUS, type BookingStatusValue } from '@/lib/services/booking.service'
import { StatusBadge } from '@/components/status-badge'
import { OnboardingTimeline } from '@/components/onboarding-timeline'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTable } from '@/components/skeleton-loader'
import { Skeleton } from '@/components/ui/skeleton'
import { HealthMarkersDialog } from '@/components/health-markers-dialog'
import { HealthGoalsDialog } from '@/components/health-goals-dialog'
import { ConsentDialog } from '@/components/consent-dialog'
import { OnboardingReportsDialog } from '@/components/onboarding-reports-dialog'
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
  service?: PopulatedServiceRef
  slot?: PopulatedSlotRef
}

function BookingsTable({
  rows,
  serviceMap,
  slotMap,
}: {
  rows: BookingRow[]
  serviceMap: Map<string, string>
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
          const serviceName =
            b.service?.serviceName || serviceMap.get(b.service?._id ?? '') || '—'
          const slotLabel =
            (b.slot?.startTime && b.slot?.endTime
              ? `${b.slot.startTime} – ${b.slot.endTime}`
              : slotMap.get(b.slot?._id ?? '')) || '—'
          const statusLabel = STATUS_TO_BADGE[b.status] || 'pending'
          return (
            <TableRow key={b._id}>
              <TableCell className="font-medium">{serviceName}</TableCell>
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
  const { data: slots } = useSlots()

  const userMemberships = useMemo(
    () => (memberships ?? []).filter((m) => m.userId === userId),
    [memberships, userId],
  )

  const serviceMap = useMemo(() => {
    const m = new Map<string, string>()
    ;(services ?? []).forEach((s) => m.set(s.id, s.name))
    return m
  }, [services])

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
    () => userBookings.filter((b) => isUpcoming(b.bookingDate) && b.status !== 2),
    [userBookings],
  )
  const pastBookings = useMemo(
    () => userBookings.filter((b) => !isUpcoming(b.bookingDate) || b.status === 2),
    [userBookings],
  )

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
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
              <Button>
                <IconEdit className="w-4 h-4 mr-2" />
                Edit User
              </Button>
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
                            {m.currency} {m.price}
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
                Sports scientist, nutritionist, trainer, and consultation appointments.
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

          {/* ─── ONBOARDING PROGRESS ─── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Onboarding Progress</CardTitle>
                <CardDescription>
                  Live progression from the onboarding workflow engine
                </CardDescription>
              </div>
              {(() => {
                const summary = profile.onboardingStatus ?? user.onboardingStatus
                if (summary?.onboardingCompleted || user.onboarded) {
                  return <StatusBadge status="completed" size="sm" />
                }
                if (
                  summary?.currentStep ||
                  (summary?.completedSteps && summary.completedSteps.length > 0)
                ) {
                  return <StatusBadge status="in_progress" size="sm" />
                }
                return <StatusBadge status="not_started" size="sm" />
              })()}
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const summary = profile.onboardingStatus ?? user.onboardingStatus
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Current Step</span>
                        {summary?.currentStep ? (
                          <span className="font-medium">
                            {summary.currentStep.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Completed Steps</span>
                        <span className="font-medium">
                          {summary?.completedSteps?.length ?? 0} / 7
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <StatusFlag
                        label="Health Markers"
                        value={summary?.healthMarkersCompleted}
                        action={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setMarkersOpen(true)}
                          >
                            <IconEye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        }
                      />
                      <StatusFlag
                        label="Health Goals"
                        value={summary?.healthGoalsCompleted}
                        action={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setGoalsOpen(true)}
                          >
                            <IconEye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        }
                      />
                      <StatusFlag
                        label="Consent"
                        value={summary?.consentCompleted}
                        action={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setConsentOpen(true)}
                          >
                            <IconEye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        }
                      />
                      <StatusFlag
                        label="Reports Uploaded"
                        value={summary?.reportsUploaded}
                        action={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setReportsOpen(true)}
                          >
                            <IconFileText className="h-4 w-4 mr-1" />
                            View Reports
                          </Button>
                        }
                      />
                      <StatusFlag label="Onboarding Completed" value={summary?.onboardingCompleted} />
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Onboarding Appointments</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          {
                            key: 'sports' as const,
                            expertType: 'sports_scientist' as const,
                            label: 'Sports Scientist',
                            Icon: IconStethoscope,
                            booked: !!summary?.sportsScientistBooked,
                          },
                          {
                            key: 'nutrition' as const,
                            expertType: 'nutritionist' as const,
                            label: 'Nutritionist',
                            Icon: IconSalad,
                            booked: !!summary?.nutritionistBooked,
                          },
                        ].map(({ key, expertType, label, Icon, booked }) => {
                          const appt = (profile.expertAppointments ?? []).find(
                            (a) => a.expertType === expertType,
                          )
                          const statusLabel =
                            appt?.bookingStatus?.toLowerCase() ||
                            (booked ? 'booked' : 'pending')
                          return (
                            <div
                              key={key}
                              className="flex items-start justify-between gap-3 rounded-md border px-4 py-3"
                            >
                              <div className="flex items-start gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="font-medium text-sm">{label}</p>
                                  {appt?.appointmentDate && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {formatDateForDisplay(appt.appointmentDate)}
                                    </p>
                                  )}
                                  {appt?.meetingLink && (
                                    <a
                                      href={appt.meetingLink}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      Meeting link
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {booked && (
                                  <IconCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                                )}
                                <StatusBadge status={statusLabel} size="sm" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="pt-2">
                      <OnboardingTimeline
                        currentStep={summary?.currentStep}
                        completedSteps={summary?.completedSteps}
                      />
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>

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
