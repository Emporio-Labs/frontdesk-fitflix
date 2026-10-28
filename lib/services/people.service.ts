import { isAxiosError } from 'axios'
import { apiClient } from '@/lib/api-client'
import type { Lead } from '@/lib/services/lead.service'
import type { Membership } from '@/lib/services/membership.service'
import type { User } from '@/lib/services/user.service'

// GET /people/lookup?q= — one phone/name search over members, open leads and
// unpaid sale invoices in every branch, so the New sale flow finds a person
// before it creates anyone.

export interface LookupMembership {
  _id: string
  planId: string
  planName: string
  status: string
  startDate: string
  endDate: string
  locationId: string
}

export interface LookupMember {
  _id: string
  username: string
  phone: string
  email: string
  homeLocationId: string
  currentMembership: LookupMembership | null
}

export interface LookupLead {
  _id: string
  name: string
  phone: string
  email: string
  status: string
  locationId: string
  interestedIn: string
  pendingInvoiceId: string
}

export interface LookupPendingInvoice {
  _id: string
  invoiceNumber: string
  total: number
  userId: string
  leadId: string
  locationId: string
}

export interface PeopleLookupResult {
  members: LookupMember[]
  leads: LookupLead[]
  pendingInvoices: LookupPendingInvoice[]
  /** True when the result was built client-side because the endpoint is missing. */
  fallback?: boolean
}

const str = (v: unknown) => (v == null ? '' : String(v))
const ref = (v: any) => (v && typeof v === 'object' ? str(v._id ?? v.id) : str(v))

/** Last ten digits: "+91 98480-14521" and "9848014521" are the same phone. */
export function phoneKey(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

function normalizeMembership(raw: any): LookupMembership | null {
  if (!raw) return null
  return {
    _id: ref(raw._id ?? raw.id),
    planId: ref(raw.planId),
    planName: str(raw.planName),
    status: str(raw.status),
    startDate: str(raw.startDate),
    endDate: str(raw.endDate),
    locationId: ref(raw.locationId),
  }
}

function normalizeResult(data: any): PeopleLookupResult {
  const body = data?.data ?? data
  return {
    members: (Array.isArray(body?.members) ? body.members : []).map((m: any) => ({
      _id: ref(m._id ?? m.id),
      username: str(m.username ?? m.name),
      phone: str(m.phone),
      email: str(m.email),
      homeLocationId: ref(m.homeLocationId ?? m.homeClubId),
      currentMembership: normalizeMembership(m.currentMembership),
    })),
    leads: (Array.isArray(body?.leads) ? body.leads : []).map((l: any) => ({
      _id: ref(l._id ?? l.id),
      name: str(l.name ?? l.leadName),
      phone: str(l.phone),
      email: str(l.email),
      status: str(l.status).toLowerCase(),
      locationId: ref(l.locationId),
      interestedIn: str(l.interestedIn),
      pendingInvoiceId: ref(l.pendingInvoiceId),
    })),
    pendingInvoices: (Array.isArray(body?.pendingInvoices) ? body.pendingInvoices : []).map((i: any) => ({
      _id: ref(i._id ?? i.id),
      invoiceNumber: str(i.invoiceNumber),
      total: Number(i.total ?? 0),
      userId: ref(i.userId),
      leadId: ref(i.leadId),
      locationId: ref(i.locationId),
    })),
  }
}

/** 404/405/501: the backend has no lookup endpoint yet. */
export function isLookupUnsupported(error: unknown): boolean {
  if (!isAxiosError(error)) return false
  const status = error.response?.status
  return status === 404 || status === 405 || status === 501
}

const CURRENT_STATUSES = new Set(['Active', 'Upcoming', 'Paused'])

/**
 * Client-side stand-in for /people/lookup, built from the users, leads and
 * memberships lists: phone matches on the last ten digits, names on a
 * case-insensitive substring. Pending invoices are not derivable here.
 */
export function buildLookupFallback(
  q: string,
  users: User[],
  leads: Lead[],
  memberships: Membership[]
): PeopleLookupResult {
  const query = q.trim().toLowerCase()
  const digits = query.replace(/\D/g, '')
  const byPhone = digits.length >= 4
  const matches = (name: string, phone: string) =>
    byPhone ? phoneKey(phone).includes(digits.slice(-10)) : name.toLowerCase().includes(query)

  const latestByUser = new Map<string, Membership>()
  for (const m of memberships) {
    if (!CURRENT_STATUSES.has(m.status)) continue
    const prev = latestByUser.get(m.userId)
    if (!prev || m.endDate > prev.endDate) latestByUser.set(m.userId, m)
  }

  return {
    members: users
      .filter((u) => matches(u.username || '', u.phone || ''))
      .slice(0, 10)
      .map((u) => {
        const m = latestByUser.get(u.id)
        return {
          _id: u.id,
          username: u.username,
          phone: u.phone,
          email: u.email,
          homeLocationId: u.homeClubId ?? '',
          currentMembership: m
            ? {
                _id: m.id,
                planId: m.planId ?? '',
                planName: m.planName,
                status: m.status,
                startDate: m.startDate,
                endDate: m.endDate,
                locationId: m.locationId ?? '',
              }
            : null,
        }
      }),
    leads: leads
      .filter((l) => l.status !== 'converted' && matches(l.name, l.phone))
      .slice(0, 10)
      .map((l) => ({
        _id: l.id,
        name: l.name,
        phone: l.phone,
        email: l.email,
        status: l.status,
        locationId: l.locationId,
        interestedIn: l.interestedIn,
        pendingInvoiceId: l.pendingInvoiceId,
      })),
    pendingInvoices: [],
    fallback: true,
  }
}

export const peopleService = {
  lookup: async (q: string): Promise<PeopleLookupResult> => {
    const { data } = await apiClient.get('/people/lookup', { params: { q } })
    return normalizeResult(data)
  },
}
