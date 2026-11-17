import { apiClient } from '@/lib/api-client'
import type { MemberWearablesResponse } from '@/types/wearables'

export const wearableService = {
  /**
   * The backend enforces both checks: the member shared with their coach,
   * and the caller is that coach (trainer/nutritionist roster) or an admin.
   */
  getMemberDaily: async (userId: string, days = 14): Promise<MemberWearablesResponse> => {
    const { data } = await apiClient.get(
      `/api/v1/wearables/members/${userId}/daily?days=${days}`,
    )
    return (data?.data ?? data) as MemberWearablesResponse
  },
}
