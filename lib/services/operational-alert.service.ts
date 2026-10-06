import { apiClient } from '@/lib/api-client'

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'
export type AlertType =
  | 'lead_unclaimed'
  | 'trainer_missing'
  | 'session_starting_no_host'
  | 'capacity_breached'
  | 'emergency_call'
  | 'operational_disruption'
  | 'manual_staff_alert'

export interface OperationalAlert {
  _id: string
  id?: string
  type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  title: string
  message: string
  branchId: {
    _id: string
    name: string
    code?: string
  } | string
  targetRoles: string[]
  targetUserId?: string
  relatedEntity: {
    entityType: 'lead' | 'session' | 'booking' | 'other'
    entityId: string
    summary?: string
  }
  acknowledgedBy?: {
    userId: string
    name: string
    role: string
  }
  acknowledgedAt?: string
  resolvedBy?: {
    userId: string
    name: string
    role: string
  }
  resolvedAt?: string
  resolutionReason?: string
  createdAt: string
  updatedAt: string
}

export interface QueryAlertsParams {
  branchId?: string
  status?: AlertStatus | 'active'
  severity?: AlertSeverity
}

export const operationalAlertService = {
  getActiveAlerts: async (branchId?: string): Promise<OperationalAlert[]> => {
    const params: QueryAlertsParams = { status: 'active' }
    if (branchId && branchId !== 'all') params.branchId = branchId
    const { data } = await apiClient.get('/api/v1/alerts', { params })
    return data?.alerts ?? []
  },

  getAllAlerts: async (params?: QueryAlertsParams): Promise<OperationalAlert[]> => {
    const { data } = await apiClient.get('/api/v1/alerts', { params })
    return data?.alerts ?? []
  },

  acknowledgeAlert: async (alertId: string): Promise<OperationalAlert> => {
    const { data } = await apiClient.patch(`/api/v1/alerts/${alertId}/acknowledge`)
    return data?.alert
  },

  resolveAlert: async (alertId: string, reason?: string): Promise<OperationalAlert> => {
    const { data } = await apiClient.patch(`/api/v1/alerts/${alertId}/resolve`, { reason })
    return data?.alert
  },

  createAlert: async (payload: {
    type: AlertType
    severity?: AlertSeverity
    title: string
    message: string
    branchId: string
    relatedEntity: {
      entityType: 'lead' | 'session' | 'booking' | 'other'
      entityId: string
      summary?: string
    }
  }): Promise<OperationalAlert> => {
    const { data } = await apiClient.post('/api/v1/alerts', payload)
    return data?.alert
  },
}
