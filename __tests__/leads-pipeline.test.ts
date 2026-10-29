import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  buildReminderSummary,
  buildLeadAnalytics,
  leadService,
  Lead,
  LeadStatus,
} from '@/lib/services/lead.service'
import { apiClient } from '@/lib/api-client'

describe('Feature 4: Leads & Pipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Lead Reminder Summaries (IST-Aware)', () => {
    const today = new Date()
    const todayIso = today.toISOString().slice(0, 10)

    it('identifies today follow-ups and missed follow-ups accurately', () => {
      const mockLeads: Lead[] = [
        {
          id: 'lead_1',
          name: 'Aakash Verma',
          email: 'aakash@example.com',
          phone: '9876543210',
          source: 'Walk-in',
          status: 'contacted',
          temperature: 'warm',
          notes: 'Interested in annual plan',
          interestedIn: 'Annual',
          tags: [],
          ownerId: 'staff_1',
          assignedStaffName: 'Priya',
          createdAt: '2026-10-01',
          updatedAt: '2026-10-01',
          followUpDate: `${todayIso}T10:00:00.000Z`,
          contactCount: 1,
          isDeleted: false,
          revision: 1,
          convertedUserId: '',
          locationId: 'loc_1',
          pendingInvoiceId: '',
          interactions: [],
          fcmTokens: [],
          stageHistory: [],
        },
        {
          id: 'lead_2',
          name: 'Sunita Rao',
          email: 'sunita@example.com',
          phone: '9876543211',
          source: 'Instagram',
          status: 'new',
          temperature: 'cold',
          notes: 'Missed follow-up from last week',
          interestedIn: 'Yoga',
          tags: [],
          ownerId: 'staff_1',
          assignedStaffName: 'Priya',
          createdAt: '2026-10-01',
          updatedAt: '2026-10-01',
          followUpDate: '2026-10-10T10:00:00.000Z', // past date
          contactCount: 0,
          isDeleted: false,
          revision: 1,
          convertedUserId: '',
          locationId: 'loc_1',
          pendingInvoiceId: '',
          interactions: [],
          fcmTokens: [],
          stageHistory: [],
        },
      ]

      const summary = buildReminderSummary(mockLeads)
      expect(summary).toBeDefined()
      expect(summary.timezone).toBe('Asia/Kolkata')
      expect(summary.missed.length).toBe(1)
      expect(summary.missed[0].id).toBe('lead_2')
    })

    it('ignores deleted or converted leads in missed reminders', () => {
      const mockLeads: Lead[] = [
        {
          id: 'lead_converted',
          name: 'Converted Member',
          email: 'converted@example.com',
          phone: '9876543212',
          source: 'Website',
          status: 'converted', // already converted
          temperature: 'hot',
          notes: 'Paid yesterday',
          interestedIn: 'Monthly',
          tags: [],
          ownerId: '',
          assignedStaffName: '',
          createdAt: '2026-10-01',
          updatedAt: '2026-10-20',
          followUpDate: '2026-10-05T00:00:00.000Z', // overdue, but converted
          contactCount: 3,
          isDeleted: false,
          revision: 2,
          convertedUserId: 'usr_conv',
          locationId: 'loc_1',
          pendingInvoiceId: '',
          interactions: [],
          fcmTokens: [],
          stageHistory: [],
        },
      ]

      const summary = buildReminderSummary(mockLeads)
      expect(summary.missed.length).toBe(0)
    })
  })

  describe('Lead Pipeline Analytics & Stage Metrics', () => {
    it('computes stage counts and heat distribution accurately', () => {
      const leads: Lead[] = [
        {
          id: 'l1',
          name: 'Lead 1',
          email: 'l1@test.com',
          phone: '9999999991',
          source: 'Web',
          status: 'new',
          temperature: 'cold',
          notes: '',
          interestedIn: '',
          tags: [],
          ownerId: '',
          assignedStaffName: '',
          createdAt: '2026-10-01',
          updatedAt: '2026-10-01',
          contactCount: 0,
          isDeleted: false,
          revision: 1,
          convertedUserId: '',
          locationId: '',
          pendingInvoiceId: '',
          interactions: [],
          fcmTokens: [],
          stageHistory: [],
        },
        {
          id: 'l2',
          name: 'Lead 2',
          email: 'l2@test.com',
          phone: '9999999992',
          source: 'Web',
          status: 'contacted',
          temperature: 'warm',
          notes: '',
          interestedIn: '',
          tags: [],
          ownerId: '',
          assignedStaffName: '',
          createdAt: '2026-10-01',
          updatedAt: '2026-10-01',
          contactCount: 1,
          isDeleted: false,
          revision: 1,
          convertedUserId: '',
          locationId: '',
          pendingInvoiceId: '',
          interactions: [],
          fcmTokens: [],
          stageHistory: [],
        },
      ]

      const analytics = buildLeadAnalytics(leads)
      expect(analytics.stageCounts.new).toBe(1)
      expect(analytics.stageCounts.contacted).toBe(1)
      expect(analytics.stageCounts.qualified).toBe(0)
      expect(analytics.heatDistribution.cold).toBe(1)
      expect(analytics.heatDistribution.warm).toBe(1)
      expect(analytics.heatDistribution.hot).toBe(0)
    })
  })

  describe('Lead Service API Invocations', () => {
    it('creates lead and attaches temperature tags correctly', async () => {
      let sentBody: any

      apiClient.defaults.adapter = async (config) => {
        sentBody = JSON.parse(config.data || '{}')
        return {
          data: {
            message: 'Lead created',
            lead: {
              _id: 'lead_new_1',
              leadName: sentBody.leadName,
              phone: sentBody.phone,
              email: sentBody.email,
              status: 'New',
              tags: sentBody.tags,
            },
          },
          status: 201,
          statusText: 'Created',
          headers: {},
          config,
        }
      }

      const res = await leadService.create({
        name: 'Deepak Patel',
        phone: '9123456780',
        temperature: 'warm',
        source: 'Walk-in',
      })

      expect(res.lead.name).toBe('Deepak Patel')
      // Current behavior: if no email is supplied, it auto-generates noemail-<phone>@fitflix.in
      expect(sentBody.email).toBe('noemail-9123456780@fitflix.in')
      expect(sentBody.tags).toContain('temperature:warm')
    })
  })
})
