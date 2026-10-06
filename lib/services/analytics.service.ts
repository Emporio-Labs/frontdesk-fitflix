import { apiClient } from '@/lib/api-client'

export interface FunnelStepResult {
  key: string
  label: string
  count: number
  conversionRate: number // % from step 0
  stepConversionRate: number // % from step n-1
  dropOffCount: number
  dropOffRate: number // % drop-off from step n-1
}

export interface FunnelSummary {
  steps: FunnelStepResult[]
  totalStarted: number
  totalConverted: number
  overallConversionRate: number
  biggestDropOffStep: {
    fromStep: string
    toStep: string
    lostCount: number
    dropOffRate: number
  } | null
  club: {
    id: string | null
    name: string | null
  } | null
}

export interface FunnelQueryParams {
  homeLocationId?: string
  classId?: string
  from?: string
  to?: string
}

export const analyticsService = {
  getSignupFunnel: async (params?: FunnelQueryParams): Promise<FunnelSummary> => {
    const { data } = await apiClient.get('/api/v1/analytics/funnels/signup', { params })
    return data?.funnel
  },

  getBookingFunnel: async (params?: FunnelQueryParams): Promise<FunnelSummary> => {
    const { data } = await apiClient.get('/api/v1/analytics/funnels/booking', { params })
    return data?.funnel
  },
}
