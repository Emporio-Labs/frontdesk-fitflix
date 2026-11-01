import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dashboardService } from '@/lib/services/dashboard.service'
import { operationalAlertService } from '@/lib/services/operational-alert.service'
import { apiClient } from '@/lib/api-client'

describe('Feature 11: Dashboard Overview & Operational Alerts Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Dashboard Metrics Contract Mismatch Edge Cases', () => {
    it('exposes contract collapse: backend returns nested byStatus/totalsByStatus maps, causing frontend parser to produce zeroed metrics', async () => {
      // Live FITFLIX_BACKEND response format from getDashboardMetrics:
      const liveBackendResponse = {
        leads: {
          byStatus: { New: 12, Contacted: 5, Qualified: 3, Converted: 8 },
          recentCount: 12,
        },
        invoices: {
          byStatus: { PAID: 25, PENDING: 6, DRAFT: 2 },
          totalsByStatus: { PAID: 185000, PENDING: 42000 },
        },
        memberships: {
          activeCount: 64,
        },
        users: {
          totalCount: 120,
        },
      }

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: liveBackendResponse })

      const metrics = await dashboardService.getMetrics()

      // The frontend parser looks for raw.invoices.paid and raw.invoices.revenue directly.
      // Because backend returns nested totalsByStatus, the parser collapses to 0:
      expect(metrics.invoices.paid).toBe(0)
      expect(metrics.invoices.revenue).toBe(0)
      expect(metrics.memberships.active).toBe(0)
      expect(metrics.recentInvoices).toEqual([])
      expect(metrics.recentLeads).toEqual([])
    })

    it('exposes that getMetrics throws an unhandled rejection on network failure instead of returning EMPTY_METRICS', async () => {
      // Despite comment stating safe fallback EMPTY_METRICS is returned when backend is unreachable,
      // getMetrics lacks a try/catch block around apiClient.get
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Network error'))

      await expect(dashboardService.getMetrics()).rejects.toThrow('Network error')
    })
  })

  describe('Operational Alerts & Dismissal Edge Cases', () => {
    it('normalizes operational alert items with severity and timestamp', async () => {
      const mockAlerts = [
        {
          _id: 'alert_capacity_1',
          type: 'capacity_breached',
          severity: 'warning',
          status: 'open',
          title: 'High Branch Occupancy',
          message: 'Branch occupancy has reached 92% capacity.',
          createdAt: '2026-10-28T10:00:00Z',
          updatedAt: '2026-10-28T10:00:00Z',
        },
      ]

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { alerts: mockAlerts } })

      const alerts = await operationalAlertService.getActiveAlerts()

      expect(alerts).toHaveLength(1)
      expect(alerts[0].severity).toBe('warning')
      expect(alerts[0].title).toBe('High Branch Occupancy')
    })
  })
})
