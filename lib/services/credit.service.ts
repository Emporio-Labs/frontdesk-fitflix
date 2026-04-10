import { apiClient } from '@/lib/api-client'

export type CreditTransactionType = 'Consume' | 'Refund' | 'AdminTopUp' | 'Void'
export type CreditTransactionSource = 'Booking' | 'Appointment' | 'Admin'

export interface CreditMembershipBalance {
  id: string
  planName: string
  creditsIncluded: number
  creditsRemaining: number
  endDate: string
}

export interface CreditBalance {
  userId: string
  totalIncluded: number
  totalRemaining: number
  memberships: CreditMembershipBalance[]
}

export interface CreditTransaction {
  id: string
  membershipId: string
  amount: number
  type: CreditTransactionType
  sourceType: CreditTransactionSource
  sourceId: string
  reason: string
  actorId: string
  actorRole: string
  createdAt: string
}

export interface CreditHistory {
  userId: string
  count: number
  transactions: CreditTransaction[]
}

export interface CreditHistoryQuery {
  limit?: number
  sourceType?: CreditTransactionSource
}

export interface TopUpCreditsPayload {
  membershipId?: string
  amount: number
  reason?: string
}

export interface TopUpCreditsResponse {
  message: string
  membershipId: string
  toppedUp: number
  creditsRemaining: number
}

function parseNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeTransactionType(value: unknown): CreditTransactionType {
  const normalized = String(value || '')
  if (normalized === 'Refund') return 'Refund'
  if (normalized === 'AdminTopUp') return 'AdminTopUp'
  if (normalized === 'Void') return 'Void'
  return 'Consume'
}

function normalizeTransactionSource(value: unknown): CreditTransactionSource {
  const normalized = String(value || '')
  if (normalized === 'Booking') return 'Booking'
  if (normalized === 'Appointment') return 'Appointment'
  return 'Admin'
}

function normalizeMembershipBalance(raw: any): CreditMembershipBalance {
  return {
    id: String(raw?.id || raw?._id || raw?.membershipId || ''),
    planName: String(raw?.planName || 'Plan'),
    creditsIncluded: parseNumber(raw?.creditsIncluded, 0),
    creditsRemaining: parseNumber(raw?.creditsRemaining, 0),
    endDate: String(raw?.endDate || ''),
  }
}

function normalizeBalance(raw: any): CreditBalance {
  const memberships = Array.isArray(raw?.memberships)
    ? raw.memberships.map(normalizeMembershipBalance)
    : []

  return {
    userId: String(raw?.userId || raw?.user || ''),
    totalIncluded: parseNumber(raw?.totalIncluded, 0),
    totalRemaining: parseNumber(raw?.totalRemaining, 0),
    memberships,
  }
}

function normalizeTransaction(raw: any): CreditTransaction {
  return {
    id: String(raw?.id || raw?._id || ''),
    membershipId: String(raw?.membershipId || raw?.membership || ''),
    amount: parseNumber(raw?.amount, 0),
    type: normalizeTransactionType(raw?.type),
    sourceType: normalizeTransactionSource(raw?.sourceType),
    sourceId: String(raw?.sourceId || ''),
    reason: String(raw?.reason || ''),
    actorId: String(raw?.actorId || ''),
    actorRole: String(raw?.actorRole || ''),
    createdAt: String(raw?.createdAt || ''),
  }
}

function normalizeHistory(raw: any): CreditHistory {
  const transactions = Array.isArray(raw?.transactions)
    ? raw.transactions.map(normalizeTransaction)
    : []

  return {
    userId: String(raw?.userId || raw?.user || ''),
    count: parseNumber(raw?.count, transactions.length),
    transactions,
  }
}

export const creditService = {
  getMyBalance: async (): Promise<CreditBalance> => {
    const { data } = await apiClient.get('/credits/me/balance')
    return normalizeBalance(data)
  },

  getMyHistory: async (query?: CreditHistoryQuery): Promise<CreditHistory> => {
    const { data } = await apiClient.get('/credits/me/history', { params: query })
    return normalizeHistory(data)
  },

  getUserBalance: async (userId: string): Promise<CreditBalance> => {
    const { data } = await apiClient.get(`/credits/users/${userId}/balance`)
    return normalizeBalance(data)
  },

  getUserHistory: async (userId: string, query?: CreditHistoryQuery): Promise<CreditHistory> => {
    const { data } = await apiClient.get(`/credits/users/${userId}/history`, { params: query })
    return normalizeHistory(data)
  },

  topUpUserCredits: async (userId: string, payload: TopUpCreditsPayload): Promise<TopUpCreditsResponse> => {
    const { data } = await apiClient.post(`/credits/users/${userId}/topup`, payload)
    return {
      message: String(data?.message || 'Credits topped up'),
      membershipId: String(data?.membershipId || payload.membershipId || ''),
      toppedUp: parseNumber(data?.toppedUp, payload.amount),
      creditsRemaining: parseNumber(data?.creditsRemaining, 0),
    }
  },
}
