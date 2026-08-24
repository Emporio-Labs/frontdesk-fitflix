'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton, SkeletonTable } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import {
  IconCalendarStats,
  IconRefresh,
  IconUsers,
  IconLogin,
  IconLogout,
  IconClockHour4,
  IconUserCheck,
  IconSearch,
  IconTrash,
  IconAlertTriangle,
} from '@tabler/icons-react'
import { useUsers } from '@/hooks/use-users'
import { useMemberships } from '@/hooks/use-memberships'
import { QrScannerDialog } from '@/components/attendance/qr-scanner-dialog'
import {
  useCheckIn,
  useCheckOut,
  useCurrentlyIn,
  useDeleteGymVisit,
  useGymVisitAnalytics,
  useGymVisits,
} from '@/hooks/use-gym-visits'
import {
  VISIT_TYPES,
  type VisitType,
  type GymVisit,
} from '@/lib/services/gym-visit.service'

const RANGE_OPTIONS = [
  { key: '1d', label: 'Today', days: 1 },
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
] as const

type RangeKey = (typeof RANGE_OPTIONS)[number]['key']

function isoStartOfDay(daysAgo: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (daysAgo - 1))
  return d.toISOString()
}

function isoEndOfNow(): string {
  return new Date().toISOString()
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
}

export default function AttendancePage() {
  const [rangeKey, setRangeKey] = useState<RangeKey>('7d')
  const days = RANGE_OPTIONS.find((r) => r.key === rangeKey)!.days
  const range = useMemo(
    () => ({ from: isoStartOfDay(days), to: isoEndOfNow() }),
    [days]
  )

  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useGymVisitAnalytics(range)

  const {
    data: currentlyIn = [],
    isLoading: currentlyInLoading,
    refetch: refetchCurrent,
  } = useCurrentlyIn()

  const {
    data: recentData,
    isLoading: recentLoading,
    refetch: refetchRecent,
  } = useGymVisits({ status: 'closed', limit: 50 })

  const deleteVisit = useDeleteGymVisit()

  const recent = recentData?.items ?? []

  const todayIso = new Date().toISOString().slice(0, 10)
  const todayPoint = analytics?.byDay.find((d) => d.date === todayIso)
  const visitsToday = todayPoint?.visits ?? 0
  const uniqueToday = todayPoint?.uniqueUsers ?? 0

  const handleRefresh = () => {
    refetchAnalytics()
    refetchCurrent()
    refetchRecent()
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Mark members present when they arrive and out when they leave.
            Only members with an active membership plan can be checked in.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <QrScannerDialog />
          <div className="flex rounded-md border">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRangeKey(opt.key)}
                className={`px-3 py-1.5 text-sm ${
                  rangeKey === opt.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Currently in gym"
          value={currentlyIn.length}
          sub="members not yet checked out"
          icon={<IconUserCheck className="w-4 h-4 text-emerald-500" />}
          loading={currentlyInLoading}
        />
        <KpiCard
          title="Visits today"
          value={visitsToday}
          sub="total check-ins today"
          icon={<IconLogin className="w-4 h-4 text-blue-500" />}
          loading={analyticsLoading}
        />
        <KpiCard
          title="Unique members today"
          value={uniqueToday}
          sub="distinct members today"
          icon={<IconUsers className="w-4 h-4 text-violet-500" />}
          loading={analyticsLoading}
        />
        <KpiCard
          title={`Avg duration (${RANGE_OPTIONS.find((r) => r.key === rangeKey)!.label})`}
          value={formatDuration(
            analytics?.avgDurationMinutes
              ? Math.round(analytics.avgDurationMinutes)
              : null
          )}
          sub={`across ${analytics?.closedVisits ?? 0} completed visits`}
          icon={<IconClockHour4 className="w-4 h-4 text-amber-500" />}
          loading={analyticsLoading}
        />
      </div>

      {/* Check-in + currently-in */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CheckInCard />
        <CurrentlyInCard visits={currentlyIn} loading={currentlyInLoading} />
      </div>

      {/* Visits chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendarStats className="w-4 h-4" /> Visits over time
          </CardTitle>
          <CardDescription>
            Daily gym visits and unique members for the selected range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : !analytics || analytics.byDay.length === 0 ? (
            <EmptyState
              icon={<IconCalendarStats className="w-8 h-8" />}
              title="No visits in this range"
              description="Check members in to see activity here."
            />
          ) : (
            <VisitsBarList data={analytics.byDay} />
          )}
        </CardContent>
      </Card>

      {/* Recent completed visits */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent completed visits</CardTitle>
            <CardDescription>Last 50 checkout-completed visits</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users">View members →</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <SkeletonTable />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<IconUsers className="w-8 h-8" />}
              title="No completed visits yet"
              description="Once you check members out, they appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Member</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">In</th>
                    <th className="py-2 pr-4 font-medium">Out</th>
                    <th className="py-2 pr-4 font-medium">Duration</th>
                    <th className="py-2 pr-4 font-medium">Notes</th>
                    <th className="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((v) => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        {v.username ? (
                          <Link
                            href={`/admin/users/${v.userId}`}
                            className="font-medium hover:underline"
                          >
                            {v.username}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">
                          {v.visitType}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {new Date(v.checkInAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {v.checkOutAt
                          ? new Date(v.checkOutAt).toLocaleString()
                          : '—'}
                      </td>
                      <td className="py-2 pr-4 font-medium">
                        {formatDuration(v.durationMinutes)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground truncate max-w-[180px]">
                        {v.notes ?? '—'}
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (
                              confirm(
                                `Delete visit record for ${
                                  v.username || 'this member'
                                }?`
                              )
                            ) {
                              deleteVisit.mutate(v.id)
                            }
                          }}
                          disabled={deleteVisit.isPending}
                          title="Delete visit record"
                        >
                          <IconTrash className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  title,
  value,
  sub,
  icon,
  loading,
}: {
  title: string
  value: number | string
  sub: string
  icon: React.ReactNode
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16 mb-1" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

function CheckInCard() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<{
    id: string
    label: string
    hasActiveMembership: boolean
    isCurrentlyIn: boolean
  } | null>(null)
  const [visitType, setVisitType] = useState<VisitType>('workout')
  const [notes, setNotes] = useState('')

  const { data: users = [], isLoading: usersLoading } = useUsers()
  const { data: memberships = [] } = useMemberships()
  const { data: currentlyIn = [] } = useCurrentlyIn()
  const checkIn = useCheckIn()

  const activeUserIds = useMemo(() => {
    const now = new Date()
    const activeSet = new Set<string>()
    for (const m of memberships) {
      if (m.status === 'Active') {
        const start = m.startDate ? new Date(m.startDate) : null
        const end = m.endDate ? new Date(m.endDate) : null
        if ((!start || start <= now) && (!end || end >= now)) {
          activeSet.add(String(m.userId))
        }
      }
    }
    return activeSet
  }, [memberships])

  const currentlyInUserIds = useMemo(() => {
    return new Set(currentlyIn.map((v) => String(v.userId)))
  }, [currentlyIn])

  const matches = useMemo(() => {
    if (!search.trim() || selected) return []
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => {
        return (
          (u.username || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q)
        )
      })
      .slice(0, 6)
  }, [users, search, selected])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (!selected.hasActiveMembership || selected.isCurrentlyIn) return

    checkIn.mutate(
      {
        userId: selected.id,
        visitType,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSearch('')
          setSelected(null)
          setNotes('')
          setVisitType('workout')
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconLogin className="w-4 h-4" /> Check a member in
        </CardTitle>
        <CardDescription>
          Mark a member present when they arrive at the gym. Check-in is only allowed for members with an active membership plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="member-search">Member</Label>
            {selected ? (
              <div className="mt-1 flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{selected.label}</span>
                  {selected.hasActiveMembership ? (
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px] px-1.5 py-0">
                      Active Membership
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-[10px] px-1.5 py-0">
                      No Active Membership
                    </Badge>
                  )}
                  {selected.isCurrentlyIn && (
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px] px-1.5 py-0">
                      Already Checked In
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setSelected(null)}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  id="member-search"
                  placeholder={
                    usersLoading ? 'Loading members…' : 'Search name, email, or phone'
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={usersLoading}
                  className="pl-8"
                  autoComplete="off"
                />
                {matches.length > 0 && (
                  <div className="mt-1 max-h-56 overflow-auto rounded-md border bg-popover shadow-sm divide-y">
                    {matches.map((u) => {
                      const hasActive = activeUserIds.has(u.id)
                      const isCurrentlyIn = currentlyInUserIds.has(u.id)
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() =>
                            setSelected({
                              id: u.id,
                              label: u.username || u.email || u.id,
                              hasActiveMembership: hasActive,
                              isCurrentlyIn,
                            })
                          }
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">
                              {u.username || 'Unnamed'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {hasActive ? (
                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px] px-1.5 py-0">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-[10px] px-1.5 py-0">
                                  No Active Membership
                                </Badge>
                              )}
                              {isCurrentlyIn && (
                                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px] px-1.5 py-0">
                                  In Gym
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {u.email || u.phone || u.id}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {selected && !selected.hasActiveMembership && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              <IconAlertTriangle className="h-4 w-4 shrink-0" />
              <span>Cannot check in: Member does not have an active membership plan.</span>
            </div>
          )}

          {selected && selected.isCurrentlyIn && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-600">
              <IconAlertTriangle className="h-4 w-4 shrink-0" />
              <span>Cannot check in: Member is already checked in. Check them out first.</span>
            </div>
          )}

          <div>
            <Label htmlFor="visit-type">Visit type</Label>
            <Select
              value={visitType}
              onValueChange={(v) => setVisitType(v as VisitType)}
            >
              <SelectTrigger id="visit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. First session after break"
            />
          </div>

          <Button
            type="submit"
            disabled={
              !selected ||
              !selected.hasActiveMembership ||
              selected.isCurrentlyIn ||
              checkIn.isPending
            }
            className="w-full"
          >
            {checkIn.isPending ? 'Checking in…' : 'Mark present'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CurrentlyInCard({
  visits,
  loading,
}: {
  visits: GymVisit[]
  loading: boolean
}) {
  const checkOut = useCheckOut()
  const deleteVisit = useDeleteGymVisit()

  const userCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const v of visits) {
      counts.set(v.userId, (counts.get(v.userId) || 0) + 1)
    }
    return counts
  }, [visits])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconUserCheck className="w-4 h-4" /> Currently in gym
        </CardTitle>
        <CardDescription>
          Members present now. Check out to close the visit and record duration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <EmptyState
            icon={<IconUserCheck className="w-8 h-8" />}
            title="No one is currently in the gym"
            description="Check a member in from the left to get started."
          />
        ) : (
          <div className="space-y-2">
            {visits.map((v) => {
              const isDuplicate = (userCounts.get(v.userId) || 0) > 1
              return (
                <div
                  key={v.id}
                  className={`flex items-center justify-between rounded-md border p-3 ${
                    isDuplicate ? 'border-amber-500/50 bg-amber-500/5' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {v.username || 'Unknown member'}
                      </span>
                      {isDuplicate && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 text-amber-600 text-[10px] px-1.5 py-0"
                        >
                          Duplicate Check-in
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      In {new Date(v.checkInAt).toLocaleTimeString()} ·{' '}
                      {formatDuration(minutesSince(v.checkInAt))} so far ·{' '}
                      <span className="capitalize">{v.visitType}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => checkOut.mutate({ id: v.id })}
                      disabled={checkOut.isPending}
                    >
                      <IconLogout className="w-4 h-4 mr-1" /> Check out
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete visit entry for ${
                              v.username || 'this member'
                            }? This removes the check-in.`
                          )
                        ) {
                          deleteVisit.mutate(v.id)
                        }
                      }}
                      disabled={deleteVisit.isPending}
                      title="Delete / Remove check-in"
                    >
                      <IconTrash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function VisitsBarList({
  data,
}: {
  data: Array<{ date: string; visits: number; uniqueUsers: number }>
}) {
  const max = Math.max(1, ...data.map((d) => d.visits))
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.date} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {new Date(d.date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <div className="h-6 rounded bg-muted">
            <div
              className="h-full rounded bg-blue-500"
              style={{ width: `${(d.visits / max) * 100}%` }}
            />
          </div>
          <span className="text-xs tabular-nums">
            {d.visits} visits · {d.uniqueUsers} members
          </span>
        </div>
      ))}
    </div>
  )
}

