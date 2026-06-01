import { apiClient } from '@/lib/api-client'

// ── Response types ────────────────────────────────────────────────────────────
// ASSUMPTION: GET /dashboard/metrics returns the shape below.
// Field names inferred from the described payload (Total/Paid/Pending Invoices,
// Revenue, Recent Leads, Membership Metrics, Onboarding Visibility).
// Adjust field names here (only) if the live API differs — hooks and components
// read from this type and will stay stable.

export interface DashboardInvoiceMetrics {
  total: number
  paid: number
  pending: number
  draft: number
  failed: number
  cancelled: number
  revenue: number
}

export interface DashboardLeadMetrics {
  total: number
  new: number
  contacted: number
  qualified: number
  converted: number
  lost: number
}

export interface DashboardMembershipMetrics {
  total: number
  active: number
  expired: number
  paused: number
  cancelled: number
}

export interface DashboardOnboardingMetrics {
  total: number
  completed: number
  inProgress: number
  notStarted: number
}

export interface DashboardRecentInvoice {
  id: string
  invoiceNumber: string
  memberName: string
  memberEmail: string
  total: number
  paymentStatus: string
  issuedAt: string
  paidAt?: string
}

export interface DashboardRecentLead {
  id: string
  name: string
  email: string
  phone: string
  status: string
  source: string
  createdAt: string
}

export interface DashboardMetrics {
  invoices: DashboardInvoiceMetrics
  leads: DashboardLeadMetrics
  memberships: DashboardMembershipMetrics
  onboarding: DashboardOnboardingMetrics
  recentInvoices: DashboardRecentInvoice[]
  recentLeads: DashboardRecentLead[]
  generatedAt?: string
}

// ── Safe fallback — returned when the backend is unreachable or the response
// shape doesn't match expectations. The dashboard renders 0s instead of crashing.
const EMPTY_METRICS: DashboardMetrics = {
  invoices: { total: 0, paid: 0, pending: 0, draft: 0, failed: 0, cancelled: 0, revenue: 0 },
  leads: { total: 0, new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 },
  memberships: { total: 0, active: 0, expired: 0, paused: 0, cancelled: 0 },
  onboarding: { total: 0, completed: 0, inProgress: 0, notStarted: 0 },
  recentInvoices: [],
  recentLeads: [],
}

function normalizeInvoiceMetrics(raw: any): DashboardInvoiceMetrics {
  return {
    total: Number(raw?.total ?? raw?.totalInvoices ?? 0),
    paid: Number(raw?.paid ?? raw?.paidInvoices ?? 0),
    pending: Number(raw?.pending ?? raw?.pendingInvoices ?? 0),
    draft: Number(raw?.draft ?? raw?.draftInvoices ?? 0),
    failed: Number(raw?.failed ?? raw?.failedInvoices ?? 0),
    cancelled: Number(raw?.cancelled ?? raw?.cancelledInvoices ?? 0),
    revenue: Number(raw?.revenue ?? raw?.totalRevenue ?? raw?.revenueCollected ?? 0),
  }
}

function normalizeLeadMetrics(raw: any): DashboardLeadMetrics {
  return {
    total: Number(raw?.total ?? raw?.totalLeads ?? 0),
    new: Number(raw?.new ?? raw?.newLeads ?? 0),
    contacted: Number(raw?.contacted ?? raw?.contactedLeads ?? 0),
    qualified: Number(raw?.qualified ?? raw?.qualifiedLeads ?? 0),
    converted: Number(raw?.converted ?? raw?.convertedLeads ?? 0),
    lost: Number(raw?.lost ?? raw?.lostLeads ?? 0),
  }
}

function normalizeMembershipMetrics(raw: any): DashboardMembershipMetrics {
  return {
    total: Number(raw?.total ?? raw?.totalMemberships ?? 0),
    active: Number(raw?.active ?? raw?.activeMemberships ?? 0),
    expired: Number(raw?.expired ?? raw?.expiredMemberships ?? 0),
    paused: Number(raw?.paused ?? raw?.pausedMemberships ?? 0),
    cancelled: Number(raw?.cancelled ?? raw?.cancelledMemberships ?? 0),
  }
}

function normalizeOnboardingMetrics(raw: any): DashboardOnboardingMetrics {
  return {
    total: Number(raw?.total ?? raw?.totalUsers ?? 0),
    completed: Number(raw?.completed ?? raw?.completedOnboarding ?? 0),
    inProgress: Number(raw?.inProgress ?? raw?.in_progress ?? 0),
    notStarted: Number(raw?.notStarted ?? raw?.not_started ?? 0),
  }
}

function normalizeRecentInvoice(raw: any): DashboardRecentInvoice {
  const userRef = raw?.userId ?? raw?.user ?? {}
  return {
    id: String(raw?._id || raw?.id || ''),
    invoiceNumber: String(raw?.invoiceNumber || ''),
    memberName: String(userRef?.name ?? raw?.memberName ?? ''),
    memberEmail: String(userRef?.email ?? raw?.memberEmail ?? ''),
    total: Number(raw?.total ?? 0),
    paymentStatus: String(raw?.paymentStatus || 'DRAFT'),
    issuedAt: String(raw?.issuedAt || raw?.createdAt || ''),
    paidAt: raw?.paidAt ? String(raw.paidAt) : undefined,
  }
}

function normalizeRecentLead(raw: any): DashboardRecentLead {
  return {
    id: String(raw?._id || raw?.id || ''),
    name: String(raw?.leadName || raw?.name || ''),
    email: String(raw?.email || ''),
    phone: String(raw?.phone || ''),
    status: String(raw?.status || 'new').toLowerCase(),
    source: String(raw?.source || 'other'),
    createdAt: String(raw?.createdAt || ''),
  }
}

function normalizeDashboardMetrics(raw: any): DashboardMetrics {
  if (!raw || typeof raw !== 'object') return EMPTY_METRICS

  // Backend may nest under a `metrics`, `data`, or `dashboard` key
  const m = raw?.metrics ?? raw?.data ?? raw?.dashboard ?? raw

  return {
    invoices: normalizeInvoiceMetrics(m?.invoices ?? m?.invoice ?? {}),
    leads: normalizeLeadMetrics(m?.leads ?? m?.lead ?? {}),
    memberships: normalizeMembershipMetrics(m?.memberships ?? m?.membership ?? {}),
    onboarding: normalizeOnboardingMetrics(m?.onboarding ?? {}),
    recentInvoices: Array.isArray(m?.recentInvoices ?? m?.recent_invoices)
      ? (m?.recentInvoices ?? m?.recent_invoices).map(normalizeRecentInvoice)
      : [],
    recentLeads: Array.isArray(m?.recentLeads ?? m?.recent_leads)
      ? (m?.recentLeads ?? m?.recent_leads).map(normalizeRecentLead)
      : [],
    generatedAt: m?.generatedAt ? String(m.generatedAt) : undefined,
  }
}

export const dashboardService = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    const { data } = await apiClient.get('/dashboard/metrics')
    return normalizeDashboardMetrics(data)
  },
}
