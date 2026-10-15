import { apiClient } from '@/lib/api-client'

export interface AlertTypeMetrics {
  type: string
  title: string
  firedCount: number
  acknowledgedCount: number
  breachedCount: number
  complianceRate: number
}

export interface PersonPerformanceMetrics {
  userId?: string
  name: string
  role: string
  handledCount: number
  avgResponseSeconds: number
  slowestResponseSeconds: number
  breachCount: number
}

export interface RolePerformanceMetrics {
  role: string
  handledCount: number
  avgResponseSeconds: number
  slowestResponseSeconds: number
  breachCount: number
}

export interface EscalationMilestone {
  role: string
  afterMinutes: number
  scheduledAt: string
  escalated: boolean
}

export interface AlertBreachItem {
  id: string
  type: string
  title: string
  severity: string
  branch: {
    id: string
    name: string
    code: string
  }
  createdAt: string
  slaMinutes: number
  slaBreachedAt: string
  status: string
  acknowledgedBy?: {
    userId?: string
    name?: string
    role?: string
  }
  acknowledgedAt?: string
  responseSeconds?: number
  escalationLadder: EscalationMilestone[]
  fullEscalationTrail: string[]
}

export interface AlertReportResponse {
  dateRange: {
    startDate: string
    endDate: string
  }
  branch?: {
    id: string
    name: string
  }
  summary: {
    totalFired: number
    totalAcknowledged: number
    totalBreached: number
    overallComplianceRate: number
    avgResponseSeconds: number
    slowestResponseSeconds: number
  }
  byType: AlertTypeMetrics[]
  byPerson: PersonPerformanceMetrics[]
  byRole: RolePerformanceMetrics[]
  breaches: AlertBreachItem[]
}

export interface GetAlertReportParams {
  startDate?: string
  endDate?: string
  branchId?: string
}

export const alertReportService = {
  getReport: async (params?: GetAlertReportParams): Promise<AlertReportResponse> => {
    const cleanParams: Record<string, string> = {}
    if (params?.startDate) cleanParams.startDate = params.startDate
    if (params?.endDate) cleanParams.endDate = params.endDate
    if (params?.branchId && params.branchId !== 'all') cleanParams.branchId = params.branchId

    const { data } = await apiClient.get<{ report: AlertReportResponse }>('/api/v1/alerts/reports', {
      params: cleanParams,
    })
    return data.report
  },

  downloadCsv: async (params?: GetAlertReportParams): Promise<void> => {
    const cleanParams: Record<string, string> = {}
    if (params?.startDate) cleanParams.startDate = params.startDate
    if (params?.endDate) cleanParams.endDate = params.endDate
    if (params?.branchId && params.branchId !== 'all') cleanParams.branchId = params.branchId

    const response = await apiClient.get('/api/v1/alerts/reports/export', {
      params: cleanParams,
      responseType: 'blob',
    })

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const branchTag = params?.branchId && params.branchId !== 'all' ? `branch-${params.branchId}` : 'all-branches'
    const startTag = params?.startDate ? params.startDate.slice(0, 10) : 'start'
    const endTag = params?.endDate ? params.endDate.slice(0, 10) : 'end'
    link.setAttribute('download', `alert-sla-report-${branchTag}-${startTag}-to-${endTag}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
