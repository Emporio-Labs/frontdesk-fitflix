import axios from 'axios'
import { getStoredToken } from '@/lib/api-client'

// Membership plans are served by in-app Next.js API routes.
const membershipPlanClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach authorization token to all outgoing requests
membershipPlanClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export type MembershipPlanStatus = 'Active' | 'Inactive'

export interface MembershipPlanBenefits {
  credits?: number
  pauseDays?: number
  trainerSessions?: number
  transferSessions?: number
  transferWindowDays?: number
  [key: string]: number | string | boolean | undefined
}

export interface MembershipPlan {
  id: string
  gymId: string
  planName: string
  durationMonths: number
  totalPrice: number
  currency: string
  status: MembershipPlanStatus
  features: string[]
  benefits: MembershipPlanBenefits
  createdAt: string
  updatedAt?: string
}

export interface CreateMembershipPlanPayload {
  gymId: string
  planName: string
  durationMonths: number
  totalPrice: number
  currency: string
  status: MembershipPlanStatus
  features?: string[]
  benefits?: MembershipPlanBenefits
}

export type UpdateMembershipPlanPayload = Partial<CreateMembershipPlanPayload>

function parseNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizePlan(raw: any): MembershipPlan {
<<<<<<< Updated upstream
  const benefits = raw?.benefits && typeof raw.benefits === 'object' ? raw.benefits : {}
  const rawStatus = String(raw?.status || 'active').toLowerCase()
  const status: MembershipPlanStatus = rawStatus === 'inactive' ? 'Inactive' : 'Active'
  const totalPrice = parseNumber(raw?.total_price ?? raw?.totalPrice ?? raw?.price, 0)
  const durationMonths = parseNumber(raw?.duration_months ?? raw?.durationMonths ?? raw?.duration, 1)

  return {
    id: raw?.plan_id || raw?._id || raw?.id || '',
    gymId: raw?.gym_id || raw?.gymId || '',
    planName: raw?.plan_name || raw?.planName || raw?.name || 'Custom',
    durationMonths,
    totalPrice,
=======
  const benefits: MembershipPlanBenefits =
    raw?.benefits && typeof raw.benefits === 'object' ? { ...raw.benefits } : {}
  if (benefits.credits === undefined && raw?.creditsIncluded !== undefined) {
    benefits.credits = parseNumber(raw.creditsIncluded, 0)
  }

  const status: MembershipPlanStatus =
    typeof raw?.active === 'boolean'
      ? raw.active
        ? 'Active'
        : 'Inactive'
      : String(raw?.status || 'active').toLowerCase() === 'inactive'
        ? 'Inactive'
        : 'Active'

  const rawDurationDays = raw?.duration_days ?? raw?.durationDays
  const durationDays = rawDurationDays !== undefined && rawDurationDays !== null
    ? parseNumber(rawDurationDays, 0) || undefined
    : undefined

  return {
    id: raw?._id || raw?.id || raw?.plan_id || '',
    gymId: raw?.gymId || raw?.gym_id || '',
    planName: raw?.name || raw?.planName || raw?.plan_name || 'Custom',
    durationMonths: parseNumber(raw?.durationMonths ?? raw?.duration_months ?? raw?.duration, 1),
    durationDays,
    totalPrice: parseNumber(raw?.price ?? raw?.totalPrice ?? raw?.total_price, 0),
>>>>>>> Stashed changes
    currency: String(raw?.currency || 'USD').toUpperCase(),
    status,
    features: Array.isArray(raw?.features) ? raw.features.filter(Boolean) : [],
    benefits,
    createdAt: raw?.created_at || raw?.createdAt || '',
    updatedAt: raw?.updated_at || raw?.updatedAt || undefined,
  }
}

<<<<<<< Updated upstream
=======
function toBackendPayload(payload: UpdateMembershipPlanPayload) {
  const body: Record<string, unknown> = {}
  if (payload.planName !== undefined) body.name = payload.planName
  if (payload.totalPrice !== undefined) body.price = payload.totalPrice
  if (payload.currency !== undefined) body.currency = payload.currency
  if (payload.durationMonths !== undefined) body.durationMonths = payload.durationMonths
  if (payload.durationDays !== undefined) body.durationDays = payload.durationDays
  if (payload.features !== undefined) body.features = payload.features
  if (payload.gymId !== undefined) body.gymId = payload.gymId
  if (payload.status !== undefined) body.active = payload.status !== 'Inactive'
  if (payload.benefits !== undefined) {
    body.benefits = payload.benefits
    if (payload.benefits.credits !== undefined) {
      body.creditsIncluded = parseNumber(payload.benefits.credits, 0)
    }
  }
  return body
}

>>>>>>> Stashed changes
export const membershipPlanService = {
  getAll: async (gymId: string): Promise<{ plans: MembershipPlan[] }> => {
    const { data } = await membershipPlanClient.get('/api/membership-plans', { params: { gym_id: gymId } })
    if (Array.isArray(data?.plans)) {
      return { plans: data.plans.map(normalizePlan) }
    }
    if (Array.isArray(data)) {
      return { plans: data.map(normalizePlan) }
    }
    return { plans: [] }
  },

  getById: async (id: string): Promise<{ plan: MembershipPlan }> => {
    const { data } = await membershipPlanClient.get(`/api/membership-plans/${id}`)
    return { plan: normalizePlan(data?.plan || data) }
  },

  create: async (payload: CreateMembershipPlanPayload): Promise<{ message: string; plan: MembershipPlan }> => {
<<<<<<< Updated upstream
    const { data } = await membershipPlanClient.post('/api/membership-plans', {
      gym_id: payload.gymId,
      plan_name: payload.planName,
      duration_months: payload.durationMonths,
      total_price: payload.totalPrice,
      currency: payload.currency,
      features: payload.features,
      benefits: payload.benefits,
      status: payload.status === 'Inactive' ? 'inactive' : 'active',
    })
=======
    const { data } = await apiClient.post('/membership-plans', toBackendPayload(payload))
>>>>>>> Stashed changes
    return {
      message: data?.message || 'Membership plan created successfully',
      plan: normalizePlan(data?.plan || data),
    }
  },

  update: async (id: string, payload: UpdateMembershipPlanPayload): Promise<{ message: string; plan: MembershipPlan }> => {
<<<<<<< Updated upstream
    const { data } = await membershipPlanClient.put(`/api/membership-plans/${id}`, {
      plan_name: payload.planName,
      duration_months: payload.durationMonths,
      total_price: payload.totalPrice,
      currency: payload.currency,
      features: payload.features,
      benefits: payload.benefits,
      status: payload.status ? (payload.status === 'Inactive' ? 'inactive' : 'active') : undefined,
    })
=======
    const { data } = await apiClient.patch(`/membership-plans/${id}`, toBackendPayload(payload))
>>>>>>> Stashed changes
    return {
      message: data?.message || 'Membership plan updated successfully',
      plan: normalizePlan(data?.plan || data),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await membershipPlanClient.delete(`/api/membership-plans/${id}`)
    return { message: data?.message || 'Membership plan deleted successfully' }
  },
}
