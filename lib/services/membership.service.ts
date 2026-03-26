import { apiClient } from '@/lib/api-client'
import { mockMemberships } from '@/lib/mock-data'

export type MembershipPlanType = 'basic' | 'standard' | 'premium'
export type MembershipStatus = 'active' | 'inactive' | 'expired'

export interface Membership {
  id: string
  userId: string
  planType: MembershipPlanType
  price: number
  startDate: string
  endDate: string
  status: MembershipStatus
  notes: string
}

export interface CreateMembershipPayload {
  userId: string
  planType: MembershipPlanType
  price: number
  startDate: string
  endDate: string
  notes?: string
}

export interface UpdateMembershipPayload {
  userId?: string
  planType?: MembershipPlanType
  price?: number
  startDate?: string
  endDate?: string
  status?: MembershipStatus
  notes?: string
}

let fallbackStore: Membership[] = [...mockMemberships]

function normalizeMembership(raw: any): Membership {
  return {
    id: raw?.id || raw?._id || '',
    userId: raw?.userId || raw?.user || '',
    planType: raw?.planType || 'standard',
    price: Number(raw?.price ?? 0),
    startDate: raw?.startDate || '',
    endDate: raw?.endDate || '',
    status: raw?.status || 'active',
    notes: raw?.notes || '',
  }
}

function nextFallbackId() {
  return `m${fallbackStore.length + 1}`
}

export const membershipService = {
  getAll: async (): Promise<{ memberships: Membership[] }> => {
    try {
      const { data } = await apiClient.get('/memberships')
      if (Array.isArray(data?.memberships)) {
        return { memberships: data.memberships.map(normalizeMembership) }
      }
      if (Array.isArray(data)) {
        return { memberships: data.map(normalizeMembership) }
      }
      return { memberships: [] }
    } catch {
      return { memberships: [...fallbackStore] }
    }
  },

  getById: async (id: string): Promise<{ membership: Membership }> => {
    try {
      const { data } = await apiClient.get(`/memberships/${id}`)
      return { membership: normalizeMembership(data?.membership || data) }
    } catch {
      const membership = fallbackStore.find((m) => m.id === id)
      if (!membership) throw new Error('Membership not found')
      return { membership }
    }
  },

  create: async (payload: CreateMembershipPayload): Promise<{ message: string; membership: Membership }> => {
    try {
      const { data } = await apiClient.post('/memberships', payload)
      return {
        message: data?.message || 'Membership created successfully',
        membership: normalizeMembership(data?.membership || data),
      }
    } catch {
      const membership: Membership = {
        id: nextFallbackId(),
        userId: payload.userId,
        planType: payload.planType,
        price: payload.price,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: 'active',
        notes: payload.notes || '',
      }
      fallbackStore = [membership, ...fallbackStore]
      return { message: 'Membership created locally', membership }
    }
  },

  update: async (id: string, payload: UpdateMembershipPayload): Promise<{ message: string; membership: Membership }> => {
    try {
      const { data } = await apiClient.patch(`/memberships/${id}`, payload)
      return {
        message: data?.message || 'Membership updated successfully',
        membership: normalizeMembership(data?.membership || data),
      }
    } catch {
      const current = fallbackStore.find((m) => m.id === id)
      if (!current) throw new Error('Membership not found')
      const updated: Membership = { ...current, ...payload }
      fallbackStore = fallbackStore.map((m) => (m.id === id ? updated : m))
      return { message: 'Membership updated locally', membership: updated }
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    try {
      const { data } = await apiClient.delete(`/memberships/${id}`)
      return { message: data?.message || 'Membership deleted successfully' }
    } catch {
      fallbackStore = fallbackStore.filter((m) => m.id !== id)
      return { message: 'Membership deleted locally' }
    }
  },
}
