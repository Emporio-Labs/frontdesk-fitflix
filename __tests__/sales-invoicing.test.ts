import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  computeTotals,
  addDays,
  addMonths,
  membershipEndDate,
  daysInclusive,
  membershipOverlap,
  apiErrorMessage,
  newIdempotencyKey,
} from '@/components/sales/sale-utils'
import { invoiceService } from '@/lib/services/invoice.service'
import { apiClient } from '@/lib/api-client'

describe('Feature 2: New Sales & Invoicing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Sale Calculations & Taxes', () => {
    it('calculates 18% tax correctly on full price', () => {
      const totals = computeTotals(10000, '0', 18)
      expect(totals.price).toBe(10000)
      expect(totals.discount).toBe(0)
      expect(totals.tax).toBe(1800) // 18% of 10000
      expect(totals.total).toBe(11800)
    })

    it('calculates tax after discount deduction', () => {
      // 10,000 price - 2,000 discount = 8,000 taxable. 18% of 8,000 = 1,440.
      const totals = computeTotals(10000, '2000', 18)
      expect(totals.discount).toBe(2000)
      expect(totals.tax).toBe(1440)
      expect(totals.total).toBe(9440)
    })

    it('clamps discount so it cannot exceed the plan price', () => {
      const totals = computeTotals(5000, '99999', 18)
      expect(totals.discount).toBe(5000)
      expect(totals.tax).toBe(0)
      expect(totals.total).toBe(0)
    })

    it('handles negative or invalid discount input gracefully', () => {
      const totals = computeTotals(5000, '-500', 18)
      expect(totals.discount).toBe(0)
      expect(totals.total).toBe(5900)
    })
  })

  describe('Membership Date & Term Calculations', () => {
    it('calculates inclusive membership end date for duration in days', () => {
      // Starting 2026-03-01 for 30 days covers through 2026-03-30 inclusive
      const end = membershipEndDate('2026-03-01', { durationDays: 30 })
      expect(end).toBe('2026-03-30')
    })

    it('calculates calendar month duration clamped to month-end', () => {
      // 1 month starting Jan 31 clamps to Feb 28
      const oneMonthFromJan31 = addMonths('2026-01-31', 1)
      expect(oneMonthFromJan31).toBe('2026-02-28')
    })

    it('calculates inclusive whole days correctly', () => {
      expect(daysInclusive('2026-03-01', '2026-03-30')).toBe(30)
      expect(daysInclusive('2026-03-01', '2026-03-01')).toBe(1)
    })
  })

  describe('Idempotency & Double-Charge Protection', () => {
    it('generates unique idempotency keys for each invoice attempt', () => {
      const key1 = newIdempotencyKey()
      const key2 = newIdempotencyKey()
      expect(key1).toBeDefined()
      expect(key2).toBeDefined()
      expect(key1).not.toBe(key2)
    })
  })

  describe('Membership Overlap Conflict Parsing', () => {
    it('parses 409 MEMBERSHIP_OVERLAP error details into actionable dates', () => {
      const mockError = {
        response: {
          status: 409,
          data: {
            code: 'MEMBERSHIP_OVERLAP',
            message: 'A membership already covers this period',
            details: {
              conflictingMembershipId: 'mem_123',
              endDate: '2026-06-01', // exclusive end (first free day)
            },
          },
        },
      }

      const overlap = membershipOverlap(mockError)
      expect(overlap).not.toBeNull()
      expect(overlap?.conflictingMembershipId).toBe('mem_123')
      expect(overlap?.nextStart).toBe('2026-06-01')
      expect(overlap?.endDate).toBe('2026-05-31') // last covered day
    })

    it('returns null for other 4xx errors', () => {
      const genericError = {
        response: {
          status: 400,
          data: { code: 'VALIDATION_ERROR', message: 'Invalid phone' },
        },
      }
      expect(membershipOverlap(genericError)).toBeNull()
    })
  })

  describe('API Error Message Normalization', () => {
    it('extracts backend error strings correctly', () => {
      expect(apiErrorMessage({ response: { data: { error: 'Branch closed' } } }, 'Fallback')).toBe('Branch closed')
      expect(apiErrorMessage({ response: { data: { message: 'Member suspended' } } }, 'Fallback')).toBe('Member suspended')
      expect(apiErrorMessage({ message: 'Network offline' }, 'Fallback')).toBe('Network offline')
      expect(apiErrorMessage(null, 'Fallback')).toBe('Fallback')
    })
  })

  describe('Invoice Service API Calls', () => {
    it('passes idempotency key header on createSaleInvoice', async () => {
      let sentHeaders: any
      apiClient.defaults.adapter = async (config) => {
        sentHeaders = config.headers
        return {
          data: { invoice: { id: 'inv_1', invoiceNumber: 'INV-101', total: 1000 } },
          status: 201,
          statusText: 'Created',
          headers: {},
          config,
        }
      }

      await invoiceService.createSale(
        {
          items: [{ name: 'Gold Annual', price: 10000, quantity: 1 }],
          planSnapshot: { name: 'Gold', durationInDays: 365, price: 10000, includedCredits: 10 },
          planId: 'plan_1',
          locationId: 'loc_1',
          startDate: '2026-04-01',
          durationMonths: 12,
        },
        'unique-idempotency-key-abc'
      )

      expect(sentHeaders?.['Idempotency-Key'] || sentHeaders?.['idempotency-key']).toBe('unique-idempotency-key-abc')
    })
  })
})
