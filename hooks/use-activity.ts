import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { activityService } from '@/lib/services/activity.service'

/**
 * A lead's in-app activity, for the moment before someone calls them.
 *
 * Disabled without a linked app account: leads captured at the front desk or
 * from a form have no app to have been active in, and firing the request
 * anyway would just be a 400 per row.
 *
 * `retry: false` on purpose — this is a nice-to-have panel beside the phone
 * number. If it does not load, the salesperson still has everything they had
 * before; retrying three times only delays the screen they actually need.
 */
export function useInterestSummary(userId: string | undefined | null) {
  return useQuery({
    queryKey: queryKeys.activity.summary(userId ?? ''),
    queryFn: () => activityService.getInterestSummary(userId as string),
    enabled: !!userId,
    retry: false,
    // Behaviour arrives in batches from the app rather than live, so a short
    // stale window costs nothing and avoids refetching while someone reads.
    staleTime: 60_000,
  })
}
