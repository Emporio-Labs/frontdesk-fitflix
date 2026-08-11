import { apiClient } from '@/lib/api-client'

export const VISIT_TYPES = ['workout', 'class', 'consultation', 'other'] as const
export type VisitType = (typeof VISIT_TYPES)[number]

export interface GymVisit {
  id: string
  userId: string
  username: string | null
  email: string | null
  checkInAt: string
  checkOutAt: string | null
  durationMinutes: number | null
  visitType: VisitType
  notes: string | null
  checkedInByAdminId: string | null
  checkedOutByAdminId: string | null
  createdAt: string
  updatedAt: string
}

export interface GymVisitAnalyticsPoint {
  date: string
  visits: number
  uniqueUsers: number
  avgDurationMinutes: number | null
}

export interface GymVisitAnalytics {
  from: string
  to: string
  totalVisits: number
  uniqueUsers: number
  closedVisits: number
  avgDurationMinutes: number | null
  byDay: GymVisitAnalyticsPoint[]
}

export interface GymVisitFilters {
  userId?: string
  visitType?: VisitType
  from?: string
  to?: string
  status?: 'open' | 'closed'
  limit?: number
  offset?: number
}

export interface CheckInPayload {
  userId: string
  visitType?: VisitType
  notes?: string
}

export interface CheckOutPayload {
  notes?: string
}

function toParams(input?: Record<string, unknown>): Record<string, string> {
  if (!input) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null || v === '') continue
    out[k] = String(v)
  }
  return out
}

export const gymVisitService = {
  checkIn: async (
    payload: CheckInPayload,
  ): Promise<{ message: string; visit: GymVisit }> => {
    const { data } = await apiClient.post('/gym-visits/check-in', payload)
    return {
      message: data?.message || 'Member checked in',
      visit: data?.visit as GymVisit,
    }
  },

  checkOut: async (
    id: string,
    payload: CheckOutPayload = {},
  ): Promise<{ message: string; visit: GymVisit }> => {
    const { data } = await apiClient.patch(`/gym-visits/${id}/check-out`, payload)
    return {
      message: data?.message || 'Member checked out',
      visit: data?.visit as GymVisit,
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/gym-visits/${id}`)
    return {
      message: data?.message || 'Visit deleted successfully',
    }
  },

  list: async (
    filters: GymVisitFilters = {},
  ): Promise<{ items: GymVisit[]; total: number; limit: number; offset: number }> => {
    const { data } = await apiClient.get('/gym-visits', {
      params: toParams(filters as Record<string, unknown>),
    })
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: Number(data?.total ?? 0),
      limit: Number(data?.limit ?? 0),
      offset: Number(data?.offset ?? 0),
    }
  },

  currentlyIn: async (): Promise<{ items: GymVisit[] }> => {
    const { data } = await apiClient.get('/gym-visits/currently-in')
    return { items: Array.isArray(data?.items) ? data.items : [] }
  },

  getMine: async (limit?: number): Promise<{ items: GymVisit[] }> => {
    const { data } = await apiClient.get('/gym-visits/me', {
      params: toParams({ limit }),
    })
    return { items: Array.isArray(data?.items) ? data.items : [] }
  },

  getAnalytics: async (
    range: { from?: string; to?: string } = {},
  ): Promise<GymVisitAnalytics> => {
    const { data } = await apiClient.get('/gym-visits/analytics', {
      params: toParams(range as Record<string, unknown>),
    })
    return {
      from: String(data?.from ?? ''),
      to: String(data?.to ?? ''),
      totalVisits: Number(data?.totalVisits ?? 0),
      uniqueUsers: Number(data?.uniqueUsers ?? 0),
      closedVisits: Number(data?.closedVisits ?? 0),
      avgDurationMinutes:
        data?.avgDurationMinutes == null ? null : Number(data.avgDurationMinutes),
      byDay: Array.isArray(data?.byDay) ? data.byDay : [],
    }
  },
}
