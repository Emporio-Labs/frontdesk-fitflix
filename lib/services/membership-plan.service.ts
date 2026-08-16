import { apiClient } from '@/lib/api-client'

// Membership plans are served by the backend (`/membership-plans`), which is
// the same store the mobile/user apps read. Backend model fields:
// { _id, name, description, price, currency, creditsIncluded, features,
//   active, gymId, durationMonths, benefits, createdAt, updatedAt }

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
  /** When set, duration is expressed in days (overrides durationMonths for end-date calculation) */
  durationDays?: number | null
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
  /** Optional day-level duration. When provided, takes priority over months for scheduling. */
  durationDays?: number | null
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
  const benefits: MembershipPlanBenefits =
    raw?.benefits && typeof raw.benefits === 'object' ? { ...raw.benefits } : {}
  if (benefits.credits === undefined && raw?.creditsIncluded !== undefined) {
    benefits.credits = parseNumber(raw.creditsIncluded, 0)
  }

  // Backend uses an `active` boolean; older records may carry a status string.
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
    durationMonths: parseNumber(raw?.durationMonths ?? raw?.duration_months, 1),
    durationDays,
    totalPrice: parseNumber(raw?.price ?? raw?.totalPrice ?? raw?.total_price, 0),
    currency: String(raw?.currency || 'USD').toUpperCase(),
    status,
    features: Array.isArray(raw?.features) ? raw.features.filter(Boolean) : [],
    benefits,
    createdAt: raw?.createdAt || raw?.created_at || '',
    updatedAt: raw?.updatedAt || raw?.updated_at || undefined,
  }
}

function toBackendPayload(payload: UpdateMembershipPlanPayload) {
  const body: Record<string, unknown> = {}
  if (payload.planName !== undefined) body.name = payload.planName
  if (payload.totalPrice !== undefined) body.price = payload.totalPrice
  if (payload.currency !== undefined) body.currency = payload.currency
  if (payload.durationMonths !== undefined) body.durationMonths = payload.durationMonths
  // Check `undefined`, not truthiness: an explicit `null` must be forwarded — it's the
  // signal that clears a day-based duration so durationMonths takes over.
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

export const membershipPlanService = {
  // gymId kept for call-site compatibility; the backend list is not gym-scoped.
  getAll: async (_gymId?: string): Promise<{ plans: MembershipPlan[] }> => {
    const { data } = await apiClient.get('/membership-plans')
    const plans = Array.isArray(data?.plans) ? data.plans : Array.isArray(data) ? data : []
    return { plans: plans.map(normalizePlan) }
  },

  getById: async (id: string): Promise<{ plan: MembershipPlan }> => {
    const { data } = await apiClient.get(`/membership-plans/${id}`)
    return { plan: normalizePlan(data?.plan || data) }
  },

  create: async (payload: CreateMembershipPlanPayload): Promise<{ message: string; plan: MembershipPlan }> => {
    const { data } = await apiClient.post('/membership-plans', toBackendPayload(payload))
    return {
      message: data?.message || 'Membership plan created successfully',
      plan: normalizePlan(data?.plan || data),
    }
  },

  update: async (id: string, payload: UpdateMembershipPlanPayload): Promise<{ message: string; plan: MembershipPlan }> => {
    const { data } = await apiClient.patch(`/membership-plans/${id}`, toBackendPayload(payload))
    return {
      message: data?.message || 'Membership plan updated successfully',
      plan: normalizePlan(data?.plan || data),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/membership-plans/${id}`)
    return { message: data?.message || 'Membership plan deleted successfully' }
  },
}
