'use client'

import { useMemo, useState } from 'react'
import { IconChartFunnel, IconLock, IconRefresh } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/empty-state'
import { SkeletonCard } from '@/components/skeleton-loader'
import { FunnelCard } from '@/components/analytics/funnel-card'
import { useAnalyticsFunnels } from '@/hooks/use-analytics'
import { useCanAccess } from '@/hooks/use-auth'
import { useLocationScope } from '@/components/location-scope-provider'

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function AnalyticsPage() {
  // FX-27.4 — belt-and-braces with middleware + the sidebar: a role without
  // analytics access that reaches this page anyway sees a locked state, never
  // the numbers.
  const canRead = useCanAccess('analytics', 'read')

  const [rangeDays, setRangeDays] = useState<'7' | '30' | '90'>('30')

  // Stable per range: a fresh object every render would re-key the query and
  // refetch in a loop.
  const range = useMemo(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - Number(rangeDays))
    return { from: isoDay(from), to: isoDay(to) }
  }, [rangeDays])

  const { selectedLocation, selectedLocationId, isSingleLocation } = useLocationScope()
  const { data, isLoading, isError, refetch, isFetching } = useAnalyticsFunnels(
    range,
    canRead
  )

  // The branch these numbers belong to, for the page subtitle. Null id on a
  // multi-branch console means a super admin is viewing "All branches".
  const branchLabel = selectedLocation?.name
    ? selectedLocation.name
    : selectedLocationId || isSingleLocation
      ? 'this branch'
      : 'all branches'

  const funnels = data?.funnels ?? []
  const hasAnyData = funnels.some((f) => f.steps.some((s) => s.count > 0))

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Sign-up and booking funnels for{' '}
            <span className="font-medium text-foreground">{branchLabel}</span>. Switch
            branch from the selector in the top bar.
          </p>
        </div>
        {canRead && (
          <div className="flex items-center gap-2">
            <Select
              value={rangeDays}
              onValueChange={(v) => setRangeDays(v as '7' | '30' | '90')}
            >
              <SelectTrigger className="h-9 w-[150px]" aria-label="Select date range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh"
            >
              <IconRefresh className={isFetching ? 'size-4 animate-spin' : 'size-4'} />
            </Button>
          </div>
        )}
      </div>

      {!canRead ? (
        <EmptyState
          icon={<IconLock className="size-10" />}
          title="You don't have access to analytics"
          description="Branch funnels are available to club managers and administrators. Ask an administrator if you need access."
        />
      ) : isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<IconChartFunnel className="size-10" />}
          title="Couldn't load analytics"
          description="The analytics service didn't respond. Try again in a moment."
          action={
            <Button variant="outline" onClick={() => refetch()}>
              <IconRefresh className="mr-2 size-4" />
              Retry
            </Button>
          }
        />
      ) : data && data.configured === false ? (
        <EmptyState
          icon={<IconChartFunnel className="size-10" />}
          title="Analytics isn't connected yet"
          description="The analytics service hasn't been configured for this environment. Funnels will appear here once it's connected."
        />
      ) : !hasAnyData ? (
        <EmptyState
          icon={<IconChartFunnel className="size-10" />}
          title="No analytics for this branch yet"
          description="There's no sign-up or booking activity in the selected window. Try a wider date range or a different branch."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {funnels.map((funnel) => (
            <FunnelCard key={funnel.key} funnel={funnel} />
          ))}
        </div>
      )}
    </div>
  )
}
