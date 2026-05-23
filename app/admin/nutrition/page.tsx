'use client'

import { useState, useMemo } from 'react'
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
} from '@tabler/icons-react'
import {
  useNutritionMembers,
  useNutritionPlans,
  useFoods,
  useDeletePlan,
  useDeleteFood,
} from '@/hooks/use-nutrition'
import { useCanAccess } from '@/hooks/use-auth'
import { useUsers } from '@/hooks/use-users'
import { NUTRITION_GOAL_LABELS } from '@/lib/types/nutrition'
import type { NutritionDashboardMember, FoodItem, UserNutritionPlan } from '@/lib/types/nutrition'
import { onboardingStepLabel } from '@/components/onboarding-timeline'

// ── Helpers ──────────────────────────────────────────────────────────────────

function memberDisplayName(m?: NutritionDashboardMember['member']): string {
  if (!m) return 'Unknown User'
  return m.username || m.fullName || m.email || 'Unknown User'
}

function planMemberName(p: UserNutritionPlan): string {
  return p.member?.username || p.member?.fullName || p.member?.email || p.userName || 'Unknown User'
}

function matchesSearch(m: NutritionDashboardMember, q: string): boolean {
  if (!q) return true
  const lower = q.toLowerCase()
  const { member } = m
  return (
    (member.username?.toLowerCase().includes(lower) ?? false) ||
    (member.email?.toLowerCase().includes(lower) ?? false) ||
    (member.phone?.toLowerCase().includes(lower) ?? false)
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
}: {
  members: NutritionDashboardMember[]
  plans: UserNutritionPlan[]
  membersLoading: boolean
  plansLoading: boolean
  todaysAppointments: NutritionDashboardMember[]
  onAssign: (userId?: string) => void
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPlans.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="text-sm">{planMemberName(p)}</TableCell>
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

function BookingsTab() {
  const [rosterSegment, setRosterSegment] = useState<'pending' | 'booked' | 'all'>('pending')
  const [rosterSearch, setRosterSearch] = useState('')
  const {
    data: members = [],
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useNutritionMembers()

  const isBooked = (m: NutritionDashboardMember) =>
    (m.bookingStatus ?? '').toLowerCase() === 'booked'

  const rosterCounts = useMemo(() => {
    const booked = members.filter(isBooked).length
    return { booked, pending: members.length - booked, total: members.length }
  }, [members])

  const rosterFiltered = useMemo(() => {
    let list: NutritionDashboardMember[] = members
    if (rosterSegment === 'booked') list = list.filter(isBooked)
    if (rosterSegment === 'pending') list = list.filter((m) => !isBooked(m))
    if (rosterSearch.trim()) {
      list = list.filter((m) => matchesSearch(m, rosterSearch))
    }
    return list
  }, [members, rosterSegment, rosterSearch])

  const rosterEmptyMessage =
    rosterSegment === 'booked'
      ? 'No members have booked the nutritionist yet.'
      : rosterSegment === 'pending'
      ? 'No members are pending the nutritionist step.'
      : 'No members found.'

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">Nutritionist Onboarding Roster</CardTitle>
          <CardDescription className="text-sm">
            Members segmented by nutritionist booking status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 pt-0">
            {/* Stat chips */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-4">
                  <CardDescription className="text-sm">Booked</CardDescription>
                  <CardTitle className="text-xl">
                    {usersLoading ? '—' : rosterCounts.booked}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-4">
                  <CardDescription className="text-sm">Pending</CardDescription>
                  <CardTitle className="text-xl">
                    {usersLoading ? '—' : rosterCounts.pending}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-4">
                  <CardDescription className="text-sm">Total Members</CardDescription>
                  <CardTitle className="text-xl">
                    {usersLoading ? '—' : rosterCounts.total}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 rounded-md border p-1">
                {(['pending', 'booked', 'all'] as const).map((seg) => (
                  <button
                    key={seg}
                    onClick={() => setRosterSegment(seg)}
                    className={`rounded px-3 py-1 text-sm capitalize transition-colors ${
                      rosterSegment === seg
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {seg}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by username, email, or phone…"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" className="text-sm" onClick={() => refetchUsers()}>
                <IconRefresh className="mr-1 h-4 w-4" />
                Refresh
              </Button>
            </div>

            {/* Roster table */}
            {usersError ? (
              <div className="py-8 text-center text-red-500">
                Failed to load members.{' '}
                <button className="underline" onClick={() => refetchUsers()}>
                  Retry
                </button>
              </div>
            ) : usersLoading ? (
              <SkeletonTable />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm">Username</TableHead>
                      <TableHead className="text-sm">Email</TableHead>
                      <TableHead className="text-sm">Phone</TableHead>
                      <TableHead className="text-sm">Onboarding Step</TableHead>
                      <TableHead className="text-sm">Nutritionist</TableHead>
                      <TableHead className="text-right text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosterFiltered.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-muted-foreground"
                        >
                          {rosterEmptyMessage}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rosterFiltered.map((m) => {
                        const booked = isBooked(m)
                        const step = onboardingStepLabel(m.onboardingStep)
                        return (
                          <TableRow key={m._id}>
                            <TableCell className="text-sm font-medium">
                              {memberDisplayName(m.member)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {m.member.email ?? '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {m.member.phone || '—'}
                            </TableCell>
                            <TableCell className="text-sm">{step}</TableCell>
                            <TableCell>
                              <StatusBadge
                                status={booked ? 'booked' : 'pending'}
                                size="sm"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/admin/users/${m.member._id}`}>
                                  View User
                                </Link>
                              </Button>
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
                        {p.startDate
                          ? new Date(p.startDate).toLocaleDateString()
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

  const { data: foods = [], isLoading, isError, refetch } = useFoods(search || undefined)
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Food Catalog</h3>
          <p className="text-sm text-muted-foreground">
            Reusable foods with per-serving macros for nutrition plans
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <IconRefresh className="h-4 w-4" />
          </Button>
          {canCreate && (
            <Button onClick={openCreate}>
              <IconPlus className="mr-2 h-4 w-4" />
              Add Food
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search foods…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

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
                    <TableHead>Brand</TableHead>
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
                      <TableCell>{food.brand || '—'}</TableCell>
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
        </CardContent>
      </Card>

      <FoodForm open={dialogOpen} onOpenChange={setDialogOpen} food={editing} />
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

export default function NutritionDashboardPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') ?? 'overview')
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignUserId, setAssignUserId] = useState<string | undefined>()

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
          />
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          <BookingsTab />
        </TabsContent>

        <TabsContent value="my-nutrition" className="mt-6">
          <MyNutritionDashboard />
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
