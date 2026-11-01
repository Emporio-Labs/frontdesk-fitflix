import type { MembershipPlan } from '@/lib/services/membership-plan.service'
import type { Location } from '@/lib/services/location.service'
import type { LookupMembership } from '@/lib/services/people.service'
import type { Invoice, InvoicePaymentMethod } from '@/lib/services/invoice.service'

// Shared state and helpers for the New sale stepper (app/admin/sales/new).

export type SaleStep = 1 | 2 | 3 | 4 | 5

export type SalePerson =
  | {
      kind: 'member'
      userId: string
      name: string
      phone: string
      email: string
      homeLocationId: string
      currentMembership: LookupMembership | null
    }
  | {
      kind: 'lead'
      leadId: string
      name: string
      phone: string
      email: string
      locationId: string
      interestedIn: string
      /** Account already linked to this lead (same phone, or converted earlier). */
      userId?: string
      pendingInvoiceId?: string
    }
  | { kind: 'new'; name: string; phone: string; email: string }

export type StartMode = 'today' | 'after' | 'opening' | 'pick'

export interface SalePlanState {
  locationId: string | null
  planId: string | null
  startMode: StartMode
  /** YYYY-MM-DD */
  startDate: string
  discount: string
  discountReason: string
  /** Staff confirmed selling at a branch other than the member's home club. */
  homeClubAck: boolean
}

export const DEFAULT_TAX_PERCENT = 5

export const PAYMENT_METHODS: { value: InvoicePaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
]

export function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const IST_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today in IST as YYYY-MM-DD. */
export function todayIso(): string {
  return IST_DATE.format(new Date())
}

/** Any ISO date or datetime → its IST calendar day (YYYY-MM-DD). */
export function toIsoDay(value?: string | null): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : IST_DATE.format(d)
}

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toDayString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(day: string, days: number): string {
  const d = parseDay(day)
  d.setUTCDate(d.getUTCDate() + days)
  return toDayString(d)
}

/** Calendar months, clamped to month end: 31 Jan + 1 month = 28/29 Feb. */
export function addMonths(day: string, months: number): string {
  const d = parseDay(day)
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay))
  return toDayString(target)
}

/**
 * Last day of a membership starting on `start`, for display (inclusive): a
 * 12-month plan from 13 Mar 2026 covers through 12 Mar 2027.
 */
export function membershipEndDate(start: string, plan: Pick<MembershipPlan, 'durationMonths' | 'durationDays'>): string {
  if (!start) return ''
  if (plan.durationDays) return addDays(start, plan.durationDays - 1)
  return addDays(addMonths(start, plan.durationMonths || 1), -1)
}

/**
 * Stored membership terms are half-open, [startDate, endDate): the stored end
 * is the first day *after* the term, which is also where a renewal starts.
 * Show `lastCoveredDay` to people; start renewals on `toIsoDay(endDate)`.
 */
export function lastCoveredDay(storedEnd?: string | null): string {
  const end = toIsoDay(storedEnd)
  return end ? addDays(end, -1) : ''
}

/** Whole days from `start` through `end` inclusive. */
export function daysInclusive(start: string, end: string): number {
  return Math.round((parseDay(end).getTime() - parseDay(start).getTime()) / 86_400_000) + 1
}

export function formatDay(day?: string | null): string {
  const iso = toIsoDay(day)
  if (!iso) return '—'
  return parseDay(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function formatShortDay(day?: string | null): string {
  const iso = toIsoDay(day)
  if (!iso) return '—'
  return parseDay(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function locationOpensOn(location?: Location | null): string {
  const opens = toIsoDay(location?.opensOn ?? '')
  return opens && opens > todayIso() ? opens : ''
}

export function taxPercentFor(location?: Location | null): number {
  const rate = location?.settings?.taxRatePercent
  return typeof rate === 'number' && Number.isFinite(rate) ? rate : DEFAULT_TAX_PERCENT
}

export interface SaleTotals {
  price: number
  discount: number
  tax: number
  total: number
  taxPercent: number
}

export function computeTotals(price: number, discountInput: string, taxPercent: number): SaleTotals {
  const discount = Math.min(Math.max(Math.round(Number(discountInput) || 0), 0), price)
  const tax = Math.round((price - discount) * (taxPercent / 100))
  return { price, discount, tax, total: price - discount + tax, taxPercent }
}

/** Current membership that a renewal would follow (Active/Upcoming/Paused, not ended). */
export function renewableMembership(m?: LookupMembership | null): LookupMembership | null {
  if (!m || !['Active', 'Upcoming', 'Paused'].includes(m.status)) return null
  const end = toIsoDay(m.endDate)
  return end && end > todayIso() ? m : null
}

export function personName(p: SalePerson | null): string {
  return p?.name || ''
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  )
}

/** The backend's 4xx shape is `{ error, code, details }`; older routes use `message`. */
export function apiErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data
  const msg = data?.message ?? data?.error
  if (Array.isArray(msg)) return msg.join('; ')
  if (typeof msg === 'string' && msg) return msg
  return err?.message || fallback
}

export interface MembershipOverlap {
  conflictingMembershipId: string
  /** Last day the clashing membership covers (YYYY-MM-DD). */
  endDate: string
  /** The first day this sale could start instead. */
  nextStart: string
}

export function membershipOverlap(err: any): MembershipOverlap | null {
  const data = err?.response?.data
  if (err?.response?.status !== 409 || data?.code !== 'MEMBERSHIP_OVERLAP') return null
  // details.endDate is the clash's exclusive end: the first free day.
  const freeFrom = toIsoDay(data?.details?.endDate)
  return {
    conflictingMembershipId: String(data?.details?.conflictingMembershipId || ''),
    endDate: lastCoveredDay(freeFrom),
    nextStart: freeFrom,
  }
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function invoicePersonName(invoice: Invoice): string {
  return invoice.userId?.name || invoice.lead?.name || 'Customer'
}
