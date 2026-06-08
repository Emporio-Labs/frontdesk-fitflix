'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton, SkeletonTable } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { NutritionStatusCell } from '@/components/nutrition/nutrition-status-cell'
import { AssignPlanForm } from '@/components/nutrition/assign-plan-form'
import { FoodForm } from '@/components/nutrition/food-form'
import { MyNutritionDashboard } from '@/components/nutrition/my-nutrition-dashboard'
import { EditAssignedPlanModal } from '@/components/nutrition/edit-assigned-plan-modal'
import { ClinicalUserDialog } from '@/components/nutrition/clinical-user-dialog'
import { NutritionistAppointmentsTab } from '@/components/nutrition/nutritionist-appointments-tab'
import {
  BookingStatusTabs,
  type BookingSegment,
} from '@/components/nutrition/booking-status-tabs'
import { Progress } from '@/components/ui/progress'
import {
  IconCalendarEvent,
  IconUsers,
  IconClipboardList,
  IconApple,
  IconToolsKitchen2,
  IconSearch,
  IconEye,
  IconSalad,
  IconSparkles,
  IconPlus,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconExternalLink,
  IconCheck,
  IconCircleCheck,
} from '@tabler/icons-react'
import {
  useNutritionMembers,
  useNutritionPlans,
  useFoods,
  useRecipes,
  useRecipe,
  useCategories,
  useDeletePlan,
  useDeleteFood,
} from '@/hooks/use-nutrition'
import {
  useAcceptNutritionistBooking,
  useCompleteNutritionistBooking,
} from '@/hooks/use-nutritionist-bookings'
import { useCanAccess } from '@/hooks/use-auth'
import { useUsers } from '@/hooks/use-users'
import type { User } from '@/lib/services/user.service'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { NutritionDashboardMember, FoodItem, UserNutritionPlan } from '@/lib/types/nutrition'
import { onboardingStepLabel, ONBOARDING_STEP_ORDER } from '@/components/onboarding-timeline'

// ── Helpers ──────────────────────────────────────────────────────────────────

function memberDisplayName(m?: NutritionDashboardMember['member']): string {
  if (!m) return 'Unknown User'
  return m.username || m.fullName || m.email || 'Unknown User'
}

type RosterStatus = 'pending' | 'booked' | 'completed' | 'ignored'

interface NutritionRosterRow {
  user: User
  rosterStatus: RosterStatus
  onboardingStep?: string
  bookingStatus?: string
  bookingDate?: string
}

function normalizeRosterStatus(value?: string | number | null): string {
  return String(value ?? '').trim().toLowerCase()
}

function deriveNutritionRosterStatus(
  user: User,
  hasActivePlan: boolean
): RosterStatus {
  const nutritionistAppointment = user.expertAppointments?.find(
    (appointment) => appointment.expertType === 'nutritionist'
  )
  const bookingStatus = normalizeRosterStatus(
    nutritionistAppointment?.bookingStatus ??
      (user.onboardingStatus?.nutritionistBooked ? 'confirmed' : undefined)
  )
  const onboardingStep = normalizeRosterStatus(
    user.onboardingStatus?.currentStep ??
      (nutritionistAppointment ? 'NUTRITIONIST_BOOKING' : undefined)
  )

  const onboardingCompleted =
    user.onboardingStatus?.onboardingCompleted === true ||
    user.onboarded === true

  // Completed = onboarding done AND there's at least one active nutrition plan,
  // OR the booking was explicitly marked completed
  if (onboardingCompleted && hasActivePlan) return 'completed'
  if (bookingStatus === 'completed') return 'completed'

  const booked =
    bookingStatus === 'booked' ||
    bookingStatus === 'confirmed' ||
    bookingStatus === '0' ||
    bookingStatus === '1' ||
    onboardingCompleted ||
    user.onboardingStatus?.nutritionistBooked === true

  if (booked) return 'booked'

  const cancelled = bookingStatus === 'cancelled' || bookingStatus === '2'
  if (cancelled) return 'ignored'

  const pending =
    bookingStatus === 'pending' ||
    bookingStatus === 'requested' ||
    bookingStatus === '' ||
    onboardingStep === 'nutritionist_booking' ||
    user.onboardingStatus?.completedSteps?.includes('NUTRITIONIST_BOOKING') === true

  return pending ? 'pending' : 'ignored'
}

function toNutritionRosterRow(
  user: User,
  hasActivePlan: boolean
): NutritionRosterRow {
  const nutritionistAppointment = user.expertAppointments?.find(
    (appointment) => appointment.expertType === 'nutritionist'
  )
  return {
    user,
    onboardingStep:
      user.onboardingStatus?.currentStep ??
      (nutritionistAppointment ? 'NUTRITIONIST_BOOKING' : undefined),
    bookingStatus:
      nutritionistAppointment?.bookingStatus ??
      (user.onboardingStatus?.nutritionistBooked ? 'Confirmed' : undefined),
    bookingDate: nutritionistAppointment?.appointmentDate ?? undefined,
    rosterStatus: deriveNutritionRosterStatus(user, hasActivePlan),
  }
}

function planMemberName(p: UserNutritionPlan): string {
  return p.member?.username || p.member?.fullName || p.member?.email || p.userName || 'Unknown User'
}


// ── Summary card (compact — used in BookingsTab) ─────────────────────────────

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

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  loading,
  icon: Icon,
}: {
  label: string
  value: number | string
  loading: boolean
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
        <CardDescription className="text-sm">{label}</CardDescription>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  members,
  plans,
  membersLoading,
  plansLoading,
  todaysAppointments,
  onAssign,
  onSelectMember,
}: {
  members: NutritionDashboardMember[]
  plans: UserNutritionPlan[]
  membersLoading: boolean
  plansLoading: boolean
  todaysAppointments: NutritionDashboardMember[]
  onAssign: (userId?: string) => void
  onSelectMember: (userId: string) => void
}) {
  const activePlans = plans.filter((p) => p.status === 'Active').length

  const recentPlans = useMemo(
    () =>
      [...plans]
        .sort((a, b) =>
          String(b.updatedAt ?? b.createdAt ?? '').localeCompare(
            String(a.updatedAt ?? a.createdAt ?? '')
          )
        )
        .slice(0, 6),
    [plans]
  )

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Members"
          value={members.length}
          loading={membersLoading}
          icon={IconUsers}
        />
        <StatCard
          label="Active Plans"
          value={activePlans}
          loading={plansLoading}
          icon={IconClipboardList}
        />
        <StatCard
          label="Today's Bookings"
          value={todaysAppointments.length}
          loading={membersLoading}
          icon={IconCalendarEvent}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today's Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconCalendarEvent className="h-5 w-5" />
              Today&apos;s Consultations
            </CardTitle>
            <CardDescription className="text-sm">
              Nutrition consultations scheduled for today
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {membersLoading ? (
              <SkeletonTable />
            ) : todaysAppointments.length === 0 ? (
              <EmptyState
                icon={<IconCalendarEvent className="h-10 w-10" />}
                title="No consultations today"
                description="No nutrition consultations are scheduled for today."
              />
            ) : (
              <div className="space-y-2">
                {todaysAppointments.map((m) => (
                  <div
                    key={m._id}
                    className="flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div>
                      <div className="text-sm font-medium">{memberDisplayName(m.member)}</div>
                      <div className="text-sm text-muted-foreground">
                        {m.member.email || m.member.phone || '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.bookingStatus && (
                        <StatusBadge status={m.bookingStatus} size="sm" />
                      )}
                      <Link href={`/admin/nutrition/members/${m.member._id}`}>
                        <Button variant="outline" size="sm">
                          <IconEye className="mr-1 h-4 w-4" />
                          Open
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4 pt-0">
            <Button
              className="w-full justify-start text-sm"
              variant="outline"
              onClick={() => onAssign(undefined)}
            >
              <IconSalad className="mr-2 h-4 w-4" />
              Assign a Plan
            </Button>
            <Link href="/admin/nutrition/diet-plans/new" className="block">
              <Button className="w-full justify-start text-sm" variant="outline">
                <IconSparkles className="mr-2 h-4 w-4" />
                New Diet plan
              </Button>
            </Link>
            {/* Templates removed — use Diet Plans instead */}
            <Link href="/admin/bookings" className="block">
              <Button className="w-full justify-start text-sm" variant="outline">
                <IconExternalLink className="mr-2 h-4 w-4" />
                All Bookings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">Recent Plan Activity</CardTitle>
          <CardDescription className="text-sm">Recently updated assigned plans</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {plansLoading ? (
            <SkeletonTable />
          ) : recentPlans.length === 0 ? (
            <EmptyState
              icon={<IconClipboardList className="h-10 w-10" />}
              title="No plan activity yet"
              description="Assigned plan updates will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm">Member</TableHead>
                    <TableHead className="text-sm">Plan</TableHead>
                    <TableHead className="text-sm">Goal</TableHead>
                    <TableHead className="text-sm">Status</TableHead>
                    <TableHead className="text-sm">Assigned Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPlans.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="text-sm">
                        <button
                          onClick={() => onSelectMember(p.userId)}
                          className="font-medium hover:underline text-left text-primary"
                        >
                          {planMemberName(p)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/nutrition/plans/${p._id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="secondary" className="text-xs">
                          {p.goal.replace(/([a-z])([A-Z])/g, '$1 $2')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <NutritionStatusCell status={p.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(p.startDate || p.createdAt) ? new Date(p.startDate || p.createdAt!).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Bookings Tab ──────────────────────────────────────────────────────────────

function BookingsTab({
  onAssign,
  initialReviewUserId,
}: {
  onAssign: (userId?: string) => void
  initialReviewUserId?: string | null
}) {
  const [segment, setSegment] = useState<BookingSegment>('pending')
  const [search, setSearch] = useState('')
  const [reviewUserId, setReviewUserId] = useState<string | null>(
    initialReviewUserId ?? null
  )
  const [dialogOpen, setDialogOpen] = useState<boolean>(!!initialReviewUserId)

  const accept = useAcceptNutritionistBooking()
  const complete = useCompleteNutritionistBooking()

  // React when the parent provides a deep-link ?review=<userId>
  useEffect(() => {
    if (initialReviewUserId) {
      setReviewUserId(initialReviewUserId)
      setDialogOpen(true)
    }
  }, [initialReviewUserId])

  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useUsers()
  const { data: plans = [] } = useNutritionPlans()

  const activePlanByUserId = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const p of plans) {
      if (p.status === 'Active') map.set(p.userId, true)
    }
    return map
  }, [plans])

  const rows = useMemo(
    () =>
      users
        .map((u) =>
          toNutritionRosterRow(u, activePlanByUserId.get(u._id) === true)
        )
        .filter((r) => r.rosterStatus !== 'ignored'),
    [users, activePlanByUserId]
  )

  const counts = useMemo(() => {
    const acc = { all: rows.length, pending: 0, booked: 0, completed: 0 }
    for (const r of rows) {
      if (r.rosterStatus === 'pending') acc.pending++
      else if (r.rosterStatus === 'booked') acc.booked++
      else if (r.rosterStatus === 'completed') acc.completed++
    }
    return acc
  }, [rows])

  const filtered = useMemo(() => {
    let list = rows
    if (segment !== 'all') {
      list = list.filter((r) => r.rosterStatus === segment)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.user.username?.toLowerCase().includes(q) ||
          r.user.email?.toLowerCase().includes(q) ||
          (r.user.phone ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [rows, segment, search])

  const emptyMessage =
    segment === 'booked'
      ? 'No members have booked the nutritionist yet.'
      : segment === 'pending'
      ? 'No members are pending the nutritionist step.'
      : segment === 'completed'
      ? 'No members have completed the nutritionist workflow yet.'
      : 'No members found.'

  const handleReview = (userId: string) => {
    setReviewUserId(userId)
    setDialogOpen(true)
  }

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      // clear ?review= from URL so the dialog won't re-open on refresh
      const url = new URL(window.location.href)
      if (url.searchParams.has('review')) {
        url.searchParams.delete('review')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">Nutritionist Onboarding Roster</CardTitle>
          <CardDescription className="text-sm">
            Review members, then create or assign a personalized plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 pt-0">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="Total Members"
              value={counts.all}
              helper="visible in roster"
              loading={usersLoading}
            />
            <SummaryCard
              label="Pending"
              value={counts.pending}
              helper="awaiting nutrition workflow"
              loading={usersLoading}
            />
            <SummaryCard
              label="Booked"
              value={counts.booked}
              helper="appointments scheduled"
              loading={usersLoading}
            />
            <SummaryCard
              label="Completed"
              value={counts.completed}
              helper="onboarded & plan assigned"
              loading={usersLoading}
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-3">
            <BookingStatusTabs
              value={segment}
              onChange={setSegment}
              counts={counts}
            />
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
              onClick={() => refetchUsers()}
            >
              <IconRefresh className="mr-1 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {usersError ? (
            <div className="py-8 text-center text-red-500">
              Failed to load members.{' '}
              <button className="underline" onClick={() => refetchUsers()}>
                Retry
              </button>
            </div>
          ) : usersLoading ? (
            <SkeletonTable />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<IconUsers className="h-10 w-10" />}
              title="No members"
              description={emptyMessage}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm">Username</TableHead>
                    <TableHead className="text-sm">Email</TableHead>
                    <TableHead className="text-sm">Phone</TableHead>
                    <TableHead className="text-sm">Onboarding Step</TableHead>
                    <TableHead className="text-sm w-[160px]">Progress</TableHead>
                    <TableHead className="text-sm">Nutritionist</TableHead>
                    {segment !== 'pending' && <TableHead className="text-sm">Meeting Link</TableHead>}
                    <TableHead className="text-right text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const { user } = row
                    const completedCount =
                      user.onboardingStatus?.completedSteps?.length ?? 0
                    const totalSteps = ONBOARDING_STEP_ORDER.length
                    const pct = Math.round((completedCount / totalSteps) * 100)
                    const stepLabel = onboardingStepLabel(
                      user.onboardingStatus?.currentStep ?? row.onboardingStep
                    )
                    const statusLabel =
                      row.rosterStatus === 'completed'
                        ? 'completed'
                        : row.rosterStatus === 'booked'
                        ? 'booked'
                        : 'pending'
                    return (
                      <TableRow key={user._id}>
                        <TableCell className="text-sm font-medium">
                          {user.username || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.email || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.phone || '—'}
                        </TableCell>
                        <TableCell className="text-sm">{stepLabel}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 w-20" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {completedCount}/{totalSteps}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={statusLabel} size="sm" />
                        </TableCell>
                        {segment !== 'pending' && (
                          <TableCell className="text-sm">
                            {(() => {
                              const appt = user.expertAppointments?.find(
                                (a) => a.expertType === 'nutritionist'
                              )
                              const displayLink = appt?.meetingLink || appt?.meetingUrl
                              if (!displayLink) return <span className="text-muted-foreground">—</span>
                              return (
                                <a
                                  href={displayLink}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-semibold"
                                >
                                  <IconExternalLink className="h-3 w-3" />
                                  Meeting Link
                                </a>
                              )
                            })()}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(() => {
                              const bookingId = user.expertAppointments?.find(
                                (a) => a.expertType === 'nutritionist'
                              )?._id || user._id
                              if (row.rosterStatus === 'pending' && bookingId) {
                                return (
                                  <Button
                                    size="sm"
                                    onClick={() => accept.mutate(bookingId)}
                                    disabled={accept.isPending && accept.variables === bookingId}
                                  >
                                    <IconCheck className="mr-1 h-4 w-4" />
                                    {accept.isPending && accept.variables === bookingId
                                      ? 'Accepting…'
                                      : 'Accept'}
                                  </Button>
                                )
                              }
                              if (row.rosterStatus === 'booked' && bookingId) {
                                return (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                    onClick={() => complete.mutate(bookingId)}
                                    disabled={complete.isPending && complete.variables === bookingId}
                                  >
                                    <IconCircleCheck className="mr-1 h-4 w-4" />
                                    {complete.isPending && complete.variables === bookingId
                                      ? 'Completing…'
                                      : 'Complete Consultation'}
                                  </Button>
                                )
                              }
                              return null
                            })()}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReview(user._id)}
                            >
                              <IconEye className="mr-1 h-4 w-4" />
                              View User
                            </Button>
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

      <ClinicalUserDialog
        userId={reviewUserId}
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        onAssignExisting={(uid) => onAssign(uid)}
      />
    </div>
  )
}

// ── Diet Plans Tab ────────────────────────────────────────────────────────────

function DietPlansTab({
  onAssign,
  canCreate,
  canDelete,
}: {
  onAssign: (userId?: string) => void
  canCreate: boolean
  canDelete: boolean
}) {
  const { data: plans = [], isLoading, isError, refetch } = useNutritionPlans()
  const deletePlan = useDeletePlan()
  const canUpdate = useCanAccess('nutrition', 'update')
  const [editingPlan, setEditingPlan] = useState<any>(null) // UserNutritionPlan

  const handleDelete = (p: UserNutritionPlan) => {
    if (confirm(`Remove plan "${p.name}" from ${planMemberName(p)}?`)) {
      deletePlan.mutate(p._id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Assigned Plans</h3>
          <p className="text-sm text-muted-foreground">
            Nutrition plans assigned to members
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <IconRefresh className="h-4 w-4" />
          </Button>
          {canCreate && (
            <>
              <Button variant="outline" onClick={() => onAssign(undefined)}>
                <IconSalad className="mr-2 h-4 w-4" />
                Assign Plan
              </Button>
              <Link href="/admin/nutrition/diet-plans/new">
                <Button>
                  <IconSparkles className="mr-2 h-4 w-4" />
                  New Diet plan
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <SkeletonTable />
          ) : isError ? (
            <div className="py-8 text-center text-red-500">
              Failed to load plans.{' '}
              <button className="underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : plans.length === 0 ? (
            <EmptyState
              icon={<IconClipboardList className="h-10 w-10" />}
              title="No plans assigned"
              description="Assign a nutrition plan to a member to get started."
              action={
                canCreate ? (
                  <Button onClick={() => onAssign(undefined)}>
                    <IconSalad className="mr-2 h-4 w-4" />
                    Assign Plan
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell>{planMemberName(p)}</TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/nutrition/plans/${p._id}`}
                          className="hover:underline"
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {p.goal.replace(/([a-z])([A-Z])/g, '$1 $2')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <NutritionStatusCell status={p.status} />
                      </TableCell>
                      <TableCell>
                        {(p.startDate || p.createdAt)
                          ? new Date((p.startDate || p.createdAt)!).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Link href={`/admin/nutrition/plans/${p._id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        {canUpdate && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingPlan(p)}
                          >
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500"
                            onClick={() => handleDelete(p)}
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <EditAssignedPlanModal 
        plan={editingPlan} 
        onClose={() => setEditingPlan(null)} 
      />
    </div>
  )
}



// ── Food Catalog Tab ──────────────────────────────────────────────────────────

function FoodCatalogTab({ canCreate }: { canCreate: boolean }) {
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FoodItem | null>(null)
  const [activeCatalogTab, setActiveCatalogTab] = useState('ingredients')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)

  const { data: foods = [], isLoading, isError, refetch } = useFoods(search || undefined)
  const { data: recipes = [], isLoading: recipesLoading, isError: recipesError, refetch: refetchRecipes } = useRecipes()
  const { data: categories = [] } = useCategories()

  const deleteFood = useDeleteFood()
  const canUpdate = useCanAccess('nutrition', 'update')
  const canDelete = useCanAccess('nutrition', 'delete')

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (food: FoodItem) => { setEditing(food); setDialogOpen(true) }
  const handleDelete = (food: FoodItem) => {
    if (confirm(`Delete "${food.name}" from the food catalog?`)) {
      deleteFood.mutate(food._id)
    }
  }

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c._id, c.name]))
  }, [categories])

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter((r) => r.name.toLowerCase().includes(q))
  }, [recipes, search])

  const { data: recipeDetails, isLoading: detailsLoading } = useRecipe(selectedRecipeId || '', !!selectedRecipeId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Food Catalog</h3>
          <p className="text-sm text-muted-foreground">
            Reusable foods and pre-defined recipes for nutrition plans
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => activeCatalogTab === 'ingredients' ? refetch() : refetchRecipes()}>
            <IconRefresh className="h-4 w-4" />
          </Button>
          {canCreate && activeCatalogTab === 'ingredients' && (
            <Button onClick={openCreate}>
              <IconPlus className="mr-2 h-4 w-4" />
              Add Food
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <Tabs value={activeCatalogTab} onValueChange={setActiveCatalogTab} className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b">
              <TabsList>
                <TabsTrigger value="ingredients">Ingredients ({foods.length})</TabsTrigger>
                <TabsTrigger value="recipes">Recipes ({recipes.length})</TabsTrigger>
              </TabsList>
              
              <div className="relative max-w-sm flex-1 min-w-[200px]">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={activeCatalogTab === 'ingredients' ? "Search ingredients…" : "Search recipes…"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <TabsContent value="ingredients" className="mt-4">
              {isLoading ? (
                <SkeletonTable />
              ) : isError ? (
                <div className="py-8 text-center text-red-500">
                  Failed to load food catalog.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Retry
                  </button>
                </div>
              ) : foods.length === 0 ? (
                <EmptyState
                  icon={<IconApple className="h-10 w-10" />}
                  title="No foods yet"
                  description="Add foods to build reusable nutrition plans."
                  action={
                    canCreate ? (
                      <Button onClick={openCreate}>
                        <IconPlus className="mr-2 h-4 w-4" />
                        Add Food
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Serving</TableHead>
                        <TableHead>Cal</TableHead>
                        <TableHead>P</TableHead>
                        <TableHead>C</TableHead>
                        <TableHead>F</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {foods.map((food) => (
                        <TableRow key={food._id}>
                          <TableCell className="font-medium">{food.name}</TableCell>
                          <TableCell>{food.servingLabel}</TableCell>
                          <TableCell>{food.caloriesKcal}</TableCell>
                          <TableCell>{food.proteinG}g</TableCell>
                          <TableCell>{food.carbsG}g</TableCell>
                          <TableCell>{food.fatG}g</TableCell>
                          <TableCell className="text-right space-x-2">
                            {canUpdate && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(food)}
                              >
                                <IconEdit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500"
                                onClick={() => handleDelete(food)}
                              >
                                <IconTrash className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="recipes" className="mt-4">
              {recipesLoading ? (
                <SkeletonTable />
              ) : recipesError ? (
                <div className="py-8 text-center text-red-500">
                  Failed to load recipes.{' '}
                  <button className="underline" onClick={() => refetchRecipes()}>
                    Retry
                  </button>
                </div>
              ) : filteredRecipes.length === 0 ? (
                <EmptyState
                  icon={<IconToolsKitchen2 className="h-10 w-10" />}
                  title="No recipes found"
                  description="Use the Excel import script to populate recipes."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipe Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Cal</TableHead>
                        <TableHead>P</TableHead>
                        <TableHead>C</TableHead>
                        <TableHead>F</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecipes.map((recipe) => (
                        <TableRow key={recipe._id}>
                          <TableCell className="font-medium">{recipe.name}</TableCell>
                          <TableCell>{categoryMap.get(recipe.categoryId) || '—'}</TableCell>
                          <TableCell>
                            {recipe.isVeg === true ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" variant="secondary">
                                Veg
                              </Badge>
                            ) : recipe.isVeg === false ? (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" variant="secondary">
                                Non-Veg
                              </Badge>
                            ) : (
                              <Badge variant="outline">Mixed</Badge>
                            )}
                          </TableCell>
                          <TableCell>{recipe.totals.caloriesKcal} kcal</TableCell>
                          <TableCell>{recipe.totals.proteinG}g</TableCell>
                          <TableCell>{recipe.totals.carbsG}g</TableCell>
                          <TableCell>{recipe.totals.fatG}g</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRecipeId(recipe._id)}
                            >
                              <IconEye className="mr-1 h-4 w-4" /> View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <FoodForm open={dialogOpen} onOpenChange={setDialogOpen} food={editing} />

      {/* View Recipe Dialog */}
      <Dialog open={!!selectedRecipeId} onOpenChange={(open) => !open && setSelectedRecipeId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recipe Details</DialogTitle>
            <DialogDescription>Ingredients and macro breakdown for this recipe.</DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="py-8 flex justify-center"><Skeleton className="h-20 w-full" /></div>
          ) : recipeDetails ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-foreground">{recipeDetails.recipe.name}</h4>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">
                    {categoryMap.get(recipeDetails.recipe.categoryId) || '—'}
                  </Badge>
                  {recipeDetails.recipe.isVeg !== null && (
                    <Badge variant={recipeDetails.recipe.isVeg ? 'default' : 'secondary'}>
                      {recipeDetails.recipe.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-4 gap-2 rounded-md bg-muted p-3 text-center text-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-semibold text-[10px]">Calories</div>
                  <div className="font-bold text-foreground mt-0.5">{recipeDetails.recipe.totals.caloriesKcal}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-semibold text-[10px]">Protein</div>
                  <div className="font-bold text-foreground mt-0.5">{recipeDetails.recipe.totals.proteinG}g</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-semibold text-[10px]">Carbs</div>
                  <div className="font-bold text-foreground mt-0.5">{recipeDetails.recipe.totals.carbsG}g</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-semibold text-[10px]">Fat</div>
                  <div className="font-bold text-foreground mt-0.5">{recipeDetails.recipe.totals.fatG}g</div>
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <h5 className="text-sm font-semibold">Ingredients ({recipeDetails.ingredients.length})</h5>
                <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                  {recipeDetails.ingredients.map((ing) => (
                    <div key={ing._id} className="flex justify-between px-3 py-2 text-sm">
                      <span className="font-medium text-foreground">{ing.rawIngredientName}</span>
                      <span className="text-muted-foreground">
                        {ing.rawQuantityStr || `${ing.quantity}${ing.unit}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              {recipeDetails.recipe.cookingDirections && recipeDetails.recipe.cookingDirections.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-sm font-semibold">Directions</h5>
                  <ol className="list-decimal pl-4 text-xs text-muted-foreground space-y-1">
                    {recipeDetails.recipe.cookingDirections.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Recipe details not found.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Active Users Tab ─────────────────────────────────────────────────────────

function ActiveUsersTab() {
  const [search, setSearch] = useState('')
  const { data: users = [], isLoading, isError, refetch } = useUsers()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? '').toLowerCase().includes(q)
    )
  }, [users, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Active Users</h3>
          <p className="text-sm text-muted-foreground">
            Fitflix users — search and open a profile
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <IconRefresh className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by username, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <SkeletonTable />
          ) : isError ? (
            <div className="py-8 text-center text-red-500">
              Failed to load users.{' '}
              <button className="underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<IconUsers className="h-10 w-10" />}
              title="No active users found"
              description={
                search ? 'No users match the search.' : 'No users to display.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const status = u.onboarded ? 'active' : 'pending'
                    return (
                      <TableRow key={u._id}>
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-muted-foreground">{u.phone || '—'}</TableCell>
                        <TableCell>
                          <StatusBadge status={status} size="sm" />
                        </TableCell>
                        <TableCell>
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/users/${u._id}`}>View</Link>
                          </Button>
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
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function NutritionDashboardContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') ?? 'overview'
  const reviewUserIdFromUrl = searchParams.get('review')
  const [activeTab, setActiveTab] = useState(() =>
    reviewUserIdFromUrl ? 'bookings' : initialTab
  )
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignUserId, setAssignUserId] = useState<string | undefined>()
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const { data: members = [], isLoading: membersLoading } = useNutritionMembers()
  const { data: plans = [], isLoading: plansLoading } = useNutritionPlans()

  const canCreate = useCanAccess('nutrition', 'create')
  const canDelete = useCanAccess('nutrition', 'delete')

  const today = new Date().toISOString().slice(0, 10)

  const todaysAppointments = useMemo(
    () => members.filter((m) => (m.bookingDate ?? '').slice(0, 10) === today),
    [members, today]
  )

  const handleAssign = (userId?: string) => {
    setAssignUserId(userId)
    setAssignOpen(true)
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Nutrition</h2>
        <p className="text-sm text-muted-foreground">
          Nutrition operations workspace — members, plans, and progress
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="overview" className="text-sm px-4 py-2">Overview</TabsTrigger>
          <TabsTrigger value="bookings" className="text-sm px-4 py-2">Bookings</TabsTrigger>
          <TabsTrigger value="my-nutrition" className="text-sm px-4 py-2">My Nutrition</TabsTrigger>
          <TabsTrigger value="diet-plans" className="text-sm px-4 py-2">Diet Plans</TabsTrigger>
          <TabsTrigger value="food-catalog" className="text-sm px-4 py-2">Food Catalog</TabsTrigger>
          <TabsTrigger value="appointments" className="text-sm px-4 py-2">Nutritionist Appointments</TabsTrigger>
          <TabsTrigger value="active-users" className="text-sm px-4 py-2">Active Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            members={members}
            plans={plans}
            membersLoading={membersLoading}
            plansLoading={plansLoading}
            todaysAppointments={todaysAppointments}
            onAssign={handleAssign}
            onSelectMember={(userId) => {
              setSelectedMemberId(userId)
              setActiveTab('my-nutrition')
            }}
          />
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          <BookingsTab
            onAssign={handleAssign}
            initialReviewUserId={reviewUserIdFromUrl}
          />
        </TabsContent>

        <TabsContent value="my-nutrition" className="mt-6">
          <MyNutritionDashboard
            selectedUserId={selectedMemberId}
            onSelectedUserIdChange={setSelectedMemberId}
          />
        </TabsContent>

        <TabsContent value="diet-plans" className="mt-6">
          <DietPlansTab
            onAssign={handleAssign}
            canCreate={canCreate}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="food-catalog" className="mt-6">
          <FoodCatalogTab canCreate={canCreate} />
        </TabsContent>

        <TabsContent value="appointments" className="mt-6">
          <NutritionistAppointmentsTab />
        </TabsContent>

        <TabsContent value="active-users" className="mt-6">
          <ActiveUsersTab />
        </TabsContent>
      </Tabs>

      <AssignPlanForm
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open)
          if (!open) setAssignUserId(undefined)
        }}
        userId={assignUserId}
      />
    </div>
  )
}

export default function NutritionDashboardPage() {
  return (
    <Suspense fallback={<div className="flex-1 space-y-6 p-8 pt-6">Loading nutrition dashboard...</div>}>
      <NutritionDashboardContent />
    </Suspense>
  )
}
