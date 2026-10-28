'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useLeadTeamAnalytics } from '@/hooks/use-leads'

const RANGES = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
] as const

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

/** Horizontal bars with the count printed at the end; reads well on a phone. */
function Bars({ rows, tone = 'bg-primary' }: { rows: Array<{ label: string; value: number; sub?: string }>; tone?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <p className="text-sm text-muted-foreground">Nothing in this period.</p>
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {r.value}
              {r.sub ? ` · ${r.sub}` : ''}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className={cn('h-2 rounded-full', tone)} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const hours = (h: number | null) => {
  if (h === null) return '—'
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 48) return `${Math.round(h * 10) / 10} h`
  return `${Math.round(h / 24)} days`
}

/** Funnel, outcomes and team numbers from GET /leads/analytics. */
export function LeadAnalytics({ locationId }: { locationId?: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('30')
  // No `to`: the backend counts up to the moment it answers, so work logged
  // after this tab opened still shows on the next refetch. `from` is rounded
  // to the hour to keep the query key stable.
  const params = useMemo(() => {
    const from = new Date(Date.now() - Number(range) * 86_400_000)
    from.setMinutes(0, 0, 0)
    return { from: from.toISOString(), ...(locationId ? { locationId } : {}) }
  }, [range, locationId])
  const { data, isLoading, isError } = useLeadTeamAnalytics(params)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Leads that came in, and work done, in the last {range} days.</p>
        <div className="inline-flex rounded-lg bg-muted p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={cn(
                'rounded-md px-3 py-1 text-sm',
                range === r.key ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-muted-foreground">Couldn't load analytics.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="New leads" value={String(data.totals.leads)} sub={`${data.totals.neverAttempted} never tried yet`} />
            <Stat label="Reached" value={`${data.totals.contactRate}%`} sub={`${data.totals.contacted} spoken to`} />
            <Stat label="Time to first contact" value={hours(data.totals.medianHoursToFirstContact)} sub="median" />
            <Stat label="Joined" value={`${data.totals.conversionRate}%`} sub={`${data.totals.converted} leads · ${data.totals.avgAttemptsPerLead ?? '—'} tries/lead`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Funnel</CardTitle>
                <CardDescription>How far this period's leads got</CardDescription>
              </CardHeader>
              <CardContent>
                <Bars
                  rows={data.funnel.map((f) => ({
                    label: f.stage,
                    value: f.count,
                    sub: data.totals.leads ? `${Math.round((f.count / data.totals.leads) * 100)}%` : undefined,
                  }))}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What happened on calls</CardTitle>
                <CardDescription>Every logged call, message and visit</CardDescription>
              </CardHeader>
              <CardContent>
                <Bars rows={data.outcomes.slice(0, 10).map((o) => ({ label: o.label, value: o.count }))} tone="bg-blue-500" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Why leads were lost</CardTitle>
              </CardHeader>
              <CardContent>
                <Bars rows={data.lostReasons.map((r) => ({ label: r.label, value: r.count }))} tone="bg-zinc-400" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Where leads come from</CardTitle>
              </CardHeader>
              <CardContent>
                <Bars
                  rows={data.bySource.map((s) => ({ label: s.source, value: s.leads, sub: `${s.conversionRate}% joined` }))}
                  tone="bg-emerald-500"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Team</CardTitle>
              <CardDescription>Joined counts leads each person owns that paid in this period</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
              {data.staff.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground sm:p-0">No calls logged in this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">Tries</TableHead>
                      <TableHead className="text-right">Reached</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Visits booked</TableHead>
                      <TableHead className="text-right">Lost</TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.staff.map((s) => (
                      <TableRow key={s.staffId}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.attempts}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.connectRate}%</TableCell>
                        <TableCell className="text-right tabular-nums">{s.leadsWorked}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.visitsBooked}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.lost}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.converted}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
