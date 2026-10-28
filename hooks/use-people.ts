import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  peopleService,
  buildLookupFallback,
  isLookupUnsupported,
} from '@/lib/services/people.service'
import { userService } from '@/lib/services/user.service'
import { leadService } from '@/lib/services/lead.service'
import { membershipService } from '@/lib/services/membership.service'

/**
 * Phone/name search for the New sale flow. Pass an already-debounced query;
 * fewer than 3 characters disables it. When the backend has no
 * /people/lookup yet, falls back to filtering the users, leads and
 * memberships lists (shared with their own caches).
 */
export function usePeopleLookup(q: string) {
  const qc = useQueryClient()
  const query = q.trim()

  return useQuery({
    queryKey: queryKeys.people.lookup(query),
    enabled: query.length >= 3,
    staleTime: 10_000,
    retry: false,
    queryFn: async () => {
      try {
        return await peopleService.lookup(query)
      } catch (err) {
        if (!isLookupUnsupported(err)) throw err
        const [users, leads, memberships] = await Promise.all([
          qc.fetchQuery({ queryKey: queryKeys.users.all(), queryFn: userService.getAll, staleTime: 60_000 }),
          qc.fetchQuery({ queryKey: queryKeys.leads.all(), queryFn: () => leadService.getAll(10), staleTime: 60_000 }),
          qc.fetchQuery({ queryKey: queryKeys.memberships.all(), queryFn: membershipService.getAll, staleTime: 60_000 }),
        ])
        return buildLookupFallback(query, users.users, leads.leads, memberships.memberships)
      }
    },
  })
}
