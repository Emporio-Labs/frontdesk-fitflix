import { apiClient } from '@/lib/api-client'

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertSound = 'chime' | 'siren' | 'pulse' | 'bell'

export interface EscalationStep {
  role: string
  afterMinutes: number
}

export interface AlertRule {
  _id?: string
  alertType: string
  title: string
  description: string
  severity: AlertSeverity
  firstResponderRole: string
  escalationLadder: EscalationStep[]
  sound: AlertSound
  isDefault?: boolean
  updatedBy?: {
    userId: string
    name: string
    role: string
    updatedAt: string
  }
  createdAt?: string
  updatedAt?: string
}

export const alertRuleService = {
  getAllRules: async (): Promise<AlertRule[]> => {
    const { data } = await apiClient.get('/api/v1/admin/settings/alert-rules')
    return data?.rules ?? []
  },

  updateRule: async (
    alertType: string,
    payload: {
      severity?: AlertSeverity
      firstResponderRole?: string
      escalationLadder?: EscalationStep[]
      sound?: AlertSound
      title?: string
      description?: string
    }
  ): Promise<AlertRule> => {
    const { data } = await apiClient.put(
      `/api/v1/admin/settings/alert-rules/${alertType}`,
      payload
    )
    return data?.rule
  },

  resetRules: async (): Promise<void> => {
    await apiClient.post('/api/v1/admin/settings/alert-rules/reset')
  },
}
