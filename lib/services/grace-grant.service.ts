import { apiClient } from '@/lib/api-client'

export type GrantableType = 'CREDIT' | 'PT_SESSION'

export interface GrantGracePayload {
  type: GrantableType
  amount: number
  reason: string
  expiryDays?: number
  locationId?: string
}

export interface GraceGrantResult {
  message: string
  grant: {
    membershipId: string
    type: GrantableType
    amount: number
    expiresAt: string
    locationId: string
  }
}

export const graceGrantService = {
  /**
   * Issues comped value as its own zero-price membership with an independent
   * expiry, rather than topping up something the member paid for — that keeps
   * comped value out of revenue reporting and lets it lapse on its own clock.
   */
  grant: async (userId: string, payload: GrantGracePayload) => {
    const { data } = await apiClient.post(
      `/api/v1/credits/users/${userId}/grant`,
      payload
    )
    return data as GraceGrantResult
  },
}
