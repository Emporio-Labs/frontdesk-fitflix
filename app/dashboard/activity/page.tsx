'use client'

import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { IconActivity, IconLogin, IconClockHour4 } from '@tabler/icons-react'
import { formatDistanceToNow } from 'date-fns'
import { useMyGymVisits } from '@/hooks/use-gym-visits'

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default function MyActivityPage() {
  const { data: visits = [], isLoading } = useMyGymVisits(50)

  const lastVisit = visits[0]
  const stats = useMemo(() => {
    const closed = visits.filter((v) => v.durationMinutes != null)
    const totalMinutes = closed.reduce(
      (sum, v) => sum + (v.durationMinutes ?? 0),
      0
    )
    const avg = closed.length ? Math.round(totalMinutes / closed.length) : null
    return { count: visits.length, avg, totalMinutes }
  }, [visits])

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My gym visits</h2>
        <p className="text-muted-foreground">
          Every time the front desk marks you in and out. If something looks off,
          let staff know.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last visit</CardTitle>
            <IconLogin className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-40" />
            ) : lastVisit ? (
              <div>
                <div className="text-2xl font-bold">
                  {formatDistanceToNow(new Date(lastVisit.checkInAt), {
                    addSuffix: true,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastVisit.checkInAt).toLocaleString()} ·{' '}
                  <span className="capitalize">{lastVisit.visitType}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total visits</CardTitle>
            <IconActivity className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.count}</div>
            )}
            <p className="text-xs text-muted-foreground">in the last 50 records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg session</CardTitle>
            <IconClockHour4 className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{formatDuration(stats.avg)}</div>
            )}
            <p className="text-xs text-muted-foreground">across completed visits</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconActivity className="w-4 h-4" /> Visit history
          </CardTitle>
          <CardDescription>Your 50 most recent gym visits</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : visits.length === 0 ? (
            <EmptyState
              icon={<IconLogin className="w-8 h-8" />}
              title="No visits yet"
              description="Once the front desk checks you in, your history will show here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">In</th>
                    <th className="py-2 pr-4 font-medium">Out</th>
                    <th className="py-2 pr-4 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        {new Date(v.checkInAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">
                          {v.visitType}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {new Date(v.checkInAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {v.checkOutAt
                          ? new Date(v.checkOutAt).toLocaleTimeString()
                          : <span className="text-emerald-600 font-medium">Still inside</span>}
                      </td>
                      <td className="py-2 pr-4 font-medium">
                        {formatDuration(v.durationMinutes)}
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
