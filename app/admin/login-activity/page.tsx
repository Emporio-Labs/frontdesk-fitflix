'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  IconCalendarStats,
  IconClock,
  IconLogin,
  IconShieldLock,
  IconUsers,
} from '@tabler/icons-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { Skeleton, SkeletonTable } from '@/components/skeleton-loader'
import { useCanAccess } from '@/hooks/use-auth'
import { useLoginActivity } from '@/hooks/use-login-activity'
import type { LoginEvent, LoginRoleFilter } from '@/lib/services/login-activity.service'

const IST = 'Asia/Kolkata'
const MAX_RANGE_DAYS = 92 // backend limit
const RECENT_LIMIT = 100

const istParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

/** Calendar day (YYYY-MM-DD) and hour (0-23) of an instant, in IST. */
function toIst(iso: string) {
  const p = Object.fromEntries(istParts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) }
}

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`

const formatIst = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

const shortDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  })

const branchOf = (e: LoginEvent) => e.locationId?.name ?? '—'

interface PersonRow {
  key: string
  name: string
  role: string
  branch: string
  logins: number
  days: Set<string>
  first: string
  last: string
  hours: Map<number, number>
}

export default function LoginActivityPage() {
  const canView = useCanAccess('login_activity', 'read')

  const today = toIst(new Date().toISOString()).day
  const [from, setFrom] = useState(addDays(today, -13))
  const [to, setTo] = useState(today)
  const [role, setRole] = useState<LoginRoleFilter>('staff')
  const [branch, setBranch] = useState('all')

  const rangeError =
    !from || !to
      ? 'Choose a start and end date.'
      : from > to
        ? 'Start date must not be after the end date.'
        : daysBetween(from, to) > MAX_RANGE_DAYS
          ? `Date range cannot exceed ${MAX_RANGE_DAYS} days.`
          : null

  const { data, isLoading, isError, error } = useLoginActivity(
    { from, to, role },
    canView && !rangeError
  )

  const allEvents = data?.items ?? []

  const branches = useMemo(
    () =>
      Array.from(new Set(allEvents.map(branchOf).filter((b) => b !== '—'))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [allEvents]
  )
  const activeBranch = branches.includes(branch) ? branch : 'all'

  const events = useMemo(
    () => (activeBranch === 'all' ? allEvents : allEvents.filter((e) => branchOf(e) === activeBranch)),
    [allEvents, activeBranch]
  )

  const stats = useMemo(() => {
    const perDay = new Map<string, number>()
    const perHour = new Map<number, number>()
    const people = new Map<string, PersonRow>()

    for (const e of events) {
      const { day, hour } = toIst(e.createdAt)
      perDay.set(day, (perDay.get(day) ?? 0) + 1)
      perHour.set(hour, (perHour.get(hour) ?? 0) + 1)

      const key = e.accountId
      let p = people.get(key)
      if (!p) {
        p = {
          key,
          name: e.name || e.email || 'Unknown',
          role: e.role,
          branch: branchOf(e),
          logins: 0,
          days: new Set(),
          first: e.createdAt,
          last: e.createdAt,
          hours: new Map(),
        }
        people.set(key, p)
      }
      p.logins += 1
      p.days.add(day)
      p.hours.set(hour, (p.hours.get(hour) ?? 0) + 1)
      if (e.createdAt < p.first) p.first = e.createdAt
      if (e.createdAt > p.last) p.last = e.createdAt
    }

    // Every day in range, including zero-login days, so gaps are visible.
    const chart: { day: string; label: string; logins: number }[] = []
    if (!rangeError) {
      for (let d = from; d <= to; d = addDays(d, 1)) {
        chart.push({ day: d, label: shortDay(d), logins: perDay.get(d) ?? 0 })
      }
    }

    const busiest = [...perHour.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]
    const peopleRows = [...people.values()].sort(
      (a, b) => b.logins - a.logins || a.name.localeCompare(b.name)
    )

    return { chart, busiest, peopleRows, activeDays: perDay.size }
  }, [events, from, to, rangeError])

  if (!canView) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<IconShieldLock size={40} />}
          title="Admins only"
          description="Login activity is only available to administrators."
        />
      </div>
    )
  }

  const recent = events.slice(0, RECENT_LIMIT)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Login Activity</h1>
        <p className="text-sm text-muted-foreground">
          Who signed in to Fitflix, when and from which branch. Days and hours are in IST.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="la-from">From</label>
            <Input id="la-from" type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="la-to">To</label>
            <Input id="la-to" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Role</span>
            <Select value={role} onValueChange={(v) => setRole(v as LoginRoleFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff only</SelectItem>
                <SelectItem value="all">All (incl. members)</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="trainer">Trainer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {branches.length > 1 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Branch</span>
              <Select value={activeBranch} onValueChange={setBranch}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        {rangeError && <p className="px-6 pb-4 text-sm text-destructive">{rangeError}</p>}
      </Card>

      {data?.truncated && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          This range has more logins than can be shown. Totals cover only the newest events — narrow the dates.
        </p>
      )}

      {rangeError ? null : isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
          <SkeletonTable />
        </div>
      ) : isError ? (
        <EmptyState
          title="Could not load login activity"
          description={(error as any)?.response?.data?.message || (error as any)?.response?.data?.error || 'Please try again.'}
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<IconLogin size={40} />}
          title="No logins in this range"
          description="Try a wider date range or a different role or branch filter."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={<IconLogin size={18} />} label="Total logins" value={events.length.toLocaleString()} />
            <Kpi icon={<IconUsers size={18} />} label="Unique people" value={stats.peopleRows.length.toLocaleString()} />
            <Kpi
              icon={<IconCalendarStats size={18} />}
              label="Active days"
              value={`${stats.activeDays} / ${stats.chart.length}`}
            />
            <Kpi
              icon={<IconClock size={18} />}
              label="Busiest hour"
              value={stats.busiest ? hourLabel(stats.busiest[0]) : '—'}
              hint={stats.busiest ? `${stats.busiest[1]} logins` : undefined}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Logins per day</CardTitle>
              <CardDescription>{shortDay(from)} – {shortDay(to)}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.chart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="logins" name="Logins" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By person</CardTitle>
              <CardDescription>Most active first</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Logins</TableHead>
                    <TableHead className="text-right">Days active</TableHead>
                    <TableHead>First login</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead>Usual hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.peopleRows.map((p) => (
                    <TableRow key={p.key}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{p.role}</Badge></TableCell>
                      <TableCell>{p.branch}</TableCell>
                      <TableCell className="text-right">{p.logins}</TableCell>
                      <TableCell className="text-right">{p.days.size}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatIst(p.first)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatIst(p.last)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {[...p.hours.entries()]
                          .sort((a, b) => b[1] - a[1] || a[0] - b[0])
                          .slice(0, 2)
                          .map(([h]) => hourLabel(h))
                          .join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent logins</CardTitle>
              <CardDescription>
                Latest {Math.min(RECENT_LIMIT, events.length)} of {events.length.toLocaleString()} (IST)
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time (IST)</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">{formatIst(e.createdAt)}</TableCell>
                      <TableCell className="font-medium">{e.name || e.email || 'Unknown'}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{e.role}</Badge></TableCell>
                      <TableCell>{branchOf(e)}</TableCell>
                      <TableCell className="font-mono text-xs">{e.ip || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )
}
