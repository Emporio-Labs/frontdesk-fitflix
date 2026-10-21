import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@/lib/services/analytics.service'
import { useLocationScope } from '@/components/location-scope-provider'
import { queryKeys } from '@/lib/query-keys'

export interface AnalyticsRange {
  /** Inclusive window, `YYYY-MM-DD`. */
  from: string
  to: string
}

/**
 * FX-27 — sign-up + booking funnels for the branch the console has selected.
 *
 * The active branch is folded into the query key via `scopedKey`, so switching
 * branches serves a different cache entry rather than branch A's numbers under
 * branch B (FX-27.2). `selectedLocationId` is the *effective* branch: a concrete
 * id for everyone, or null only for a super admin viewing "All branches".
 */
export function useAnalyticsFunnels(range: AnalyticsRange, enabled = true) {
  const { selectedLocationId, scopedKey } = useLocationScope()

  return useQuery({
    queryKey: scopedKey([
      ...queryKeys.analytics.funnels({ from: range.from, to: range.to }),
    ]),
    queryFn: () =>
      analyticsService.getFunnels({
        locationId: selectedLocationId,
        from: range.from,
        to: range.to,
      }),
    enabled,
    // Funnels aggregate historical data; a minute of staleness is fine and
    // avoids refetching on every branch toggle back and forth.
    staleTime: 60 * 1000,
  })
}
