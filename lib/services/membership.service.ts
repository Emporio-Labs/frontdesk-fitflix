import { apiClient } from '@/lib/api-client'

export type MembershipStatus = 'Active' | 'Paused' | 'Cancelled' | 'Expired'

export interface Membership {
  id: string
  userId: string
  planId?: string
  planName: string
  creditsIncluded: number
  creditsRemaining: number
  price: number
  currency: string
  status: MembershipStatus
  startDate: string
  endDate: string
  features: string[]
  notes: string
  createdAt?: string
}

export interface CreateMembershipPayload {
  userId: string
  planId?: string
  planName: string
  creditsIncluded?: number
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
  planId?: string
  planName?: string
  creditsIncluded?: number
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
  const userRef = raw?.userId || raw?.user
  const userId = typeof userRef === 'object' ? String(userRef?._id || userRef?.id || '') : String(userRef || '')
  const creditsIncluded = Number(raw?.creditsIncluded ?? 0)
  const creditsRemaining = Number(raw?.creditsRemaining ?? raw?.creditsIncluded ?? 0)

  return {
    id: raw?._id || raw?.id || '',
    userId,
    planId: raw?.planId || raw?.plan?._id || raw?.plan || undefined,
    planName: raw?.planName || legacyPlan,
    creditsIncluded: Number.isFinite(creditsIncluded) ? creditsIncluded : 0,
    creditsRemaining: Number.isFinite(creditsRemaining) ? creditsRemaining : 0,
    price: Number(raw?.price ?? 0),
    currency: raw?.currency || 'INR',
    status: (['Active', 'Paused', 'Cancelled', 'Expired'].includes(normalizedStatus)
      ? normalizedStatus
      : 'Active') as MembershipStatus,
    startDate: raw?.startDate || '',
    endDate: raw?.endDate || '',
    features: Array.isArray(raw?.features) ? raw.features : [],
    notes: raw?.notes || '',
    createdAt: raw?.createdAt || '',
  }
}

// --- Renewal reminders (client-side derivation, no dedicated backend endpoint) ---

const IST_TIMEZONE = 'Asia/Kolkata'
const IST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export type RenewalBucket = 'overdue' | 'dueThisWeek' | 'upcoming'

export interface RenewalTarget {
  membershipId: string
  userId: string
  memberName: string
  phone: string
  email: string
  planName: string
  price: number
  currency: string
  status: MembershipStatus
  endDate: string
  /** IST date-only string (YYYY-MM-DD) the membership ends. */
  endDateIst: string
  /** Whole IST days from today until expiry. Negative = already expired. */
  daysUntilExpiry: number
  bucket: RenewalBucket
  /** True when we could not resolve the member behind the membership. */
  memberUnknown: boolean
}

export interface RenewalRemindersResponse {
  overdue: RenewalTarget[]
  dueThisWeek: RenewalTarget[]
  upcoming: RenewalTarget[]
  total: number
  monthLabel: string
  generatedAt: string
  timezone: string
}

/** Parse a date-like value to an IST date-only string, or undefined if invalid. */
function toIstDateOnly(value?: string): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    // Fall back to a leading YYYY-MM-DD slice for already date-only strings.
    const slice = String(value).slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : undefined
  }
  return IST_DATE_FORMATTER.format(parsed)
}

/** Whole days between two IST date-only strings (YYYY-MM-DD). */
function istDayDiff(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`)
  const to = new Date(`${toIso}T00:00:00Z`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
}

interface RenewalUserLike {
  id?: string
  _id?: string
  username?: string
  email?: string
  phone?: string
}

/**
 * Derive the list of members whose membership expires in the current IST month
 * and therefore need a renewal call. Cancelled memberships are excluded; Expired
 * ones are kept only when the expiry falls in the current month (they still need
 * a call). Memberships without a valid end date are skipped.
 */
export function buildRenewalReminders(
  memberships: Membership[],
  users: RenewalUserLike[] = []
): RenewalRemindersResponse {
  const todayIst = IST_DATE_FORMATTER.format(new Date())
  const currentMonth = todayIst.slice(0, 7) // YYYY-MM

  const userById = new Map<string, RenewalUserLike>()
  for (const user of users) {
    const key = String(user?.id || user?._id || '')
    if (key) userById.set(key, user)
  }

  const targets: RenewalTarget[] = []

  for (const membership of memberships) {
    if (membership.status === 'Cancelled') continue

    const endDateIst = toIstDateOnly(membership.endDate)
    if (!endDateIst) continue
    if (endDateIst.slice(0, 7) !== currentMonth) continue

    const daysUntilExpiry = istDayDiff(todayIst, endDateIst)
    const bucket: RenewalBucket =
      daysUntilExpiry < 0 ? 'overdue' : daysUntilExpiry <= 7 ? 'dueThisWeek' : 'upcoming'

    const user = userById.get(String(membership.userId || ''))

    targets.push({
      membershipId: membership.id,
      userId: membership.userId,
      memberName: user?.username?.trim() || 'Unknown member',
      phone: user?.phone?.trim() || '',
      email: user?.email?.trim() || '',
      planName: membership.planName,
      price: membership.price,
      currency: membership.currency,
      status: membership.status,
      endDate: membership.endDate,
      endDateIst,
      daysUntilExpiry,
      bucket,
      memberUnknown: !user,
    })
  }

  const byEndDate = (a: RenewalTarget, b: RenewalTarget) =>
    a.endDateIst.localeCompare(b.endDateIst)

  const overdue = targets.filter((t) => t.bucket === 'overdue').sort(byEndDate)
  const dueThisWeek = targets.filter((t) => t.bucket === 'dueThisWeek').sort(byEndDate)
  const upcoming = targets.filter((t) => t.bucket === 'upcoming').sort(byEndDate)

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return {
    overdue,
    dueThisWeek,
    upcoming,
    total: targets.length,
    monthLabel,
    generatedAt: new Date().toISOString(),
    timezone: IST_TIMEZONE,
  }
}

export const membershipService = {
  getMine: async (): Promise<{ memberships: Membership[] }> => {
    const { data } = await apiClient.get('/memberships/me')
    if (Array.isArray(data?.memberships)) {
      return { memberships: data.memberships.map(normalizeMembership) }
    }
    if (Array.isArray(data)) {
      return { memberships: data.map(normalizeMembership) }
    }
    return { memberships: [] }
  },

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

  // Freezing stops access immediately; the frozen days are added back to the
  // expiry on resume, capped by the branch's pauseMaxDaysPerTerm.
  pause: async (id: string, reason?: string) => {
    const { data } = await apiClient.post(`/memberships/${id}/pause`, { reason })
    return data as {
      message: string
      membership: Membership
      daysRemainingInAllowance: number | null
    }
  },

  resume: async (id: string) => {
    const { data } = await apiClient.post(`/memberships/${id}/resume`)
    return data as {
      message: string
      membership: Membership
      pausedDays: number
      creditedDays: number
      cappedBy: number | null
      previousEndDate: string | null
      newEndDate: string | null
    }
  },
}
