import { apiClient } from '@/lib/api-client'

export type MembershipStatus = 'Active' | 'Paused' | 'Cancelled' | 'Expired'

export interface Membership {
  id: string
  userId: string
  planName: string
  price: number
  currency: string
  status: MembershipStatus
  startDate: string
  endDate: string
  features: string[]
  notes: string
}

export interface CreateMembershipPayload {
  userId: string
  planName: string
  price: number
  currency: string
  status: MembershipStatus
  startDate: string
  endDate: string
  features?: string[]
  notes?: string
}

export interface UpdateMembershipPayload {
  userId?: string
  planName?: string
  price?: number
  currency?: string
  status?: MembershipStatus
  startDate?: string
  endDate?: string
  features?: string[]
  notes?: string
}

function normalizeMembership(raw: any): Membership {
  const legacyPlan = raw?.planType || 'Standard Plan'
  const normalizedStatus = String(raw?.status || 'Active')

  return {
    id: raw?._id || raw?.id || '',
    userId: raw?.userId || raw?.user || '',
    planName: raw?.planName || legacyPlan,
    price: Number(raw?.price ?? 0),
    currency: raw?.currency || 'USD',
    status: (['Active', 'Paused', 'Cancelled', 'Expired'].includes(normalizedStatus)
      ? normalizedStatus
      : 'Active') as MembershipStatus,
    startDate: raw?.startDate || '',
    endDate: raw?.endDate || '',
    features: Array.isArray(raw?.features) ? raw.features : [],
    notes: raw?.notes || '',
  }
}

export const membershipService = {
  getAll: async (): Promise<{ memberships: Membership[] }> => {
    const { data } = await apiClient.get('/memberships')
    if (Array.isArray(data?.memberships)) {
      return { memberships: data.memberships.map(normalizeMembership) }
    }
    if (Array.isArray(data)) {
      return { memberships: data.map(normalizeMembership) }
    }
    return { memberships: [] }
  },

  getById: async (id: string): Promise<{ membership: Membership }> => {
    const { data } = await apiClient.get(`/memberships/${id}`)
    return { membership: normalizeMembership(data?.membership || data) }
  },

  create: async (payload: CreateMembershipPayload): Promise<{ message: string; membership: Membership }> => {
    const { data } = await apiClient.post('/memberships', payload)
    return {
      message: data?.message || 'Membership created successfully',
      membership: normalizeMembership(data?.membership || data),
    }
  },

  update: async (id: string, payload: UpdateMembershipPayload): Promise<{ message: string; membership: Membership }> => {
    const { data } = await apiClient.patch(`/memberships/${id}`, payload)
    return {
      message: data?.message || 'Membership updated successfully',
      membership: normalizeMembership(data?.membership || data),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/memberships/${id}`)
    return { message: data?.message || 'Membership deleted successfully' }
  },
}
