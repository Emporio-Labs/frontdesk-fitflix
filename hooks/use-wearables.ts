import { useQuery } from '@tanstack/react-query'
import { wearableService } from '@/lib/services/wearable.service'
import { queryKeys } from '@/lib/query-keys'

export function useMemberWearables(userId: string, days = 14, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.wearables(userId, days),
    queryFn: () => wearableService.getMemberDaily(userId, days),
    enabled: !!userId && enabled,
    // 403 means "not your member": retrying won't change that.
    retry: false,
  })
}
