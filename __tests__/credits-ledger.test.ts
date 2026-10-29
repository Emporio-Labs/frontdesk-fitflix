import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creditService } from '@/lib/services/credit.service'
import { apiClient } from '@/lib/api-client'

describe('Feature 8: Credits & Ledger Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Credit Balance Normalization & Edge Cases', () => {
    it('normalizes legacy and current backend balance envelopes into a uniform CreditBalance shape', async () => {
      // Backend may return totalCredits/availableCredits or totalIncluded/totalRemaining
      const mockLegacyResponse = {
        userId: 'usr_123',
        totalCredits: 30,
        availableCredits: 12,
        membershipDetails: [
          {
            membershipId: 'mem_1',
            planName: 'Gold 30 Credits',
            creditsIncluded: 30,
            creditsRemaining: 12,
            endDate: '2026-12-31T23:59:59.000Z',
          },
        ],
      }

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockLegacyResponse })

      const balance = await creditService.getUserBalance('usr_123')

      expect(balance.userId).toBe('usr_123')
      expect(balance.totalIncluded).toBe(30)
      expect(balance.totalRemaining).toBe(12)
      expect(balance.memberships).toHaveLength(1)
      expect(balance.memberships[0].id).toBe('mem_1')
      expect(balance.memberships[0].planName).toBe('Gold 30 Credits')
      expect(balance.memberships[0].creditsRemaining).toBe(12)
    })

    it('gracefully handles missing or malformed balance fields without throwing NaN', async () => {
      const mockMalformedResponse = {
        user: 'usr_456',
        totalCredits: undefined,
        availableCredits: null,
        memberships: [
          {
            _id: 'mem_2',
            planName: undefined,
            creditsIncluded: 'invalid_number',
            creditsRemaining: null,
          },
        ],
      }

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockMalformedResponse })

      const balance = await creditService.getUserBalance('usr_456')

      expect(balance.userId).toBe('usr_456')
      expect(balance.totalIncluded).toBe(0)
      expect(balance.totalRemaining).toBe(0)
      expect(balance.memberships[0].planName).toBe('Plan')
      expect(balance.memberships[0].creditsIncluded).toBe(0)
      expect(balance.memberships[0].creditsRemaining).toBe(0)
    })
  })

  describe('Role-Based Access Control Edge Cases (Frontdesk staff vs Admin)', () => {
    it('exposes that frontdesk staff receives 403 Forbidden on balance lookup because route requires admin or user', async () => {
      // Backend route: /credits/users/:userId/balance authorize(["admin", "user"])
      // Frontdesk staff has role: "frontdesk"
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      }

      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(forbiddenError)

      await expect(creditService.getUserBalance('usr_789')).rejects.toMatchObject({
        response: { status: 403 },
      })
    })

    it('exposes that frontdesk staff receives 403 Forbidden when attempting credit top-up', async () => {
      // Backend route: /credits/users/:userId/topup authorize(["admin"])
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Only admins can top up credits' },
        },
      }

      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(forbiddenError)

      await expect(
        creditService.topUpUserCredits('usr_789', {
          amount: 5,
          reason: 'Receptionist spot booking comp',
        })
      ).rejects.toMatchObject({
        response: { status: 403 },
      })
    })
  })

  describe('Ledger History & Pagination Edge Cases', () => {
    it('normalizes transaction types and preserves negative amounts for consumption', async () => {
      const mockHistoryResponse = {
        userId: 'usr_123',
        count: 3,
        transactions: [
          {
            _id: 'tx_1',
            membership: 'mem_1',
            amount: -2,
            type: 'Consume',
            sourceType: 'Booking',
            sourceId: 'book_999',
            reason: 'Session booking',
            createdAt: '2026-10-25T10:00:00Z',
          },
          {
            _id: 'tx_2',
            membership: 'mem_1',
            amount: 5,
            type: 'AdminTopUp',
            sourceType: 'Admin',
            reason: 'Service recovery top-up',
            createdAt: '2026-10-26T11:00:00Z',
          },
          {
            _id: 'tx_3',
            membership: 'mem_1',
            amount: 2,
            type: 'Refund',
            sourceType: 'Booking',
            sourceId: 'book_999',
            reason: 'Booking cancelled by trainer',
            createdAt: '2026-10-27T12:00:00Z',
          },
        ],
      }

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockHistoryResponse })

      const history = await creditService.getUserHistory('usr_123', { limit: 50 })

      expect(history.transactions).toHaveLength(3)
      expect(history.transactions[0].amount).toBe(-2)
      expect(history.transactions[0].type).toBe('Consume')
      expect(history.transactions[1].amount).toBe(5)
      expect(history.transactions[1].type).toBe('AdminTopUp')
      expect(history.transactions[2].amount).toBe(2)
      expect(history.transactions[2].type).toBe('Refund')
    })

    it('exposes that transaction count reflects the page length rather than total ledger records in database', async () => {
      // Backend returns count: transactions.length instead of total matching documents
      const mockHistory = {
        userId: 'usr_123',
        count: 2, // only returned batch
        transactions: [
          { _id: 'tx_1', amount: -1, type: 'Consume' },
          { _id: 'tx_2', amount: -1, type: 'Consume' },
        ],
      }

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockHistory })

      const history = await creditService.getUserHistory('usr_123', { limit: 2 })

      // Client pagination assumes history.count is total records to calculate total pages,
      // which leads to missing older transactions beyond the first query batch
      expect(history.count).toBe(2)
      expect(history.transactions).toHaveLength(2)
    })
  })

  describe('Top-Up and Debit Limitations', () => {
    it('verifies that top-up response reflects new remaining balance', async () => {
      const mockTopUpResponse = {
        message: 'Credits topped up',
        membershipId: 'mem_active_1',
        toppedUp: 10,
        creditsRemaining: 15,
      }

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockTopUpResponse })

      const result = await creditService.topUpUserCredits('usr_123', {
        membershipId: 'mem_active_1',
        amount: 10,
        reason: 'Customer goodwill',
      })

      expect(result.toppedUp).toBe(10)
      expect(result.creditsRemaining).toBe(15)
      expect(result.membershipId).toBe('mem_active_1')
    })
  })
})
