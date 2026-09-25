import { useQuery } from '@tanstack/react-query'
import {
  nutritionistBookingService,
  NotYourClientError,
} from '@/lib/services/nutritionist-booking.service'
import { queryKeys } from '@/lib/query-keys'

/**
 * Returns the list of members assigned to the signed-in nutritionist.
 * Calls GET /nutritionist/me/members (FX-06.1).
 */
export function useMyNutritionistClients() {
  return useQuery({
    queryKey: queryKeys.nutritionists.myClients(),
    queryFn: async () => {
      const res = await nutritionistBookingService.getMyClients()
      return res.members ?? []
    },
  })
}

/**
 * Returns a single member scoped to the signed-in nutritionist.
 * Calls GET /nutritionist/me/members/:userId (FX-06.3).
 *
 * `isForbidden` is true when the backend returns 403 — the member exists
 * but belongs to a different nutritionist. No member data is exposed.
 */
export function useMyNutritionistClient(userId: string) {
  const query = useQuery({
    queryKey: queryKeys.nutritionists.myClient(userId),
    queryFn: () => nutritionistBookingService.getMyClientById(userId),
    enabled: !!userId,
    retry: (failureCount, error) => {
      // Never retry a 403 — the answer will not change.
      if (error instanceof NotYourClientError) return false
      return failureCount < 3
    },
  })

  const isForbidden = query.error instanceof NotYourClientError

  return { ...query, isForbidden }
}
