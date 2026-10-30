import { apiClient } from '@/lib/api-client'

export interface ConferenceSettings {
  defaultVideoResolution: '360p' | '540p' | '720p' | '1080p'
  defaultFrameRate: 15 | 30 | 60
  defaultAudioMode: 'mono' | 'stereo'
  maxParticipantsPerSession: number
  layoutTemplates: string[]
}

export interface BillingSettings {
  taxRatePercent: number
  gstin?: string
  currency?: string
  sacCode?: string
}

export interface UpdateBillingSettingsPayload {
  taxRatePercent?: number
  gstin?: string
  currency?: string
  sacCode?: string
  syncLocations?: boolean
}

export const settingsService = {
  getConferenceSettings: async (): Promise<{ settings: ConferenceSettings }> => {
    const { data } = await apiClient.get('/api/v1/admin/settings/rooms')
    return {
      settings: data?.settings ?? {
        defaultVideoResolution: '720p',
        defaultFrameRate: 30,
        defaultAudioMode: 'stereo',
        maxParticipantsPerSession: 50,
        layoutTemplates: ['interactive_class', 'large_event', 'standard_meeting'],
      },
    }
  },

  updateConferenceSettings: async (
    payload: Partial<ConferenceSettings>,
  ): Promise<{ message: string; settings: ConferenceSettings }> => {
    const { data } = await apiClient.put('/api/v1/admin/settings/rooms', payload)
    return {
      message: data?.message || 'Conference settings updated successfully',
      settings: data?.settings,
    }
  },

  getBillingSettings: async (): Promise<{ settings: BillingSettings }> => {
    const { data } = await apiClient.get('/api/v1/admin/settings/billing')
    return {
      settings: data?.settings ?? {
        taxRatePercent: 5,
        currency: 'INR',
        sacCode: '999723',
        gstin: '',
      },
    }
  },

  updateBillingSettings: async (
    payload: UpdateBillingSettingsPayload,
  ): Promise<{ message: string; settings: BillingSettings }> => {
    const { data } = await apiClient.put('/api/v1/admin/settings/billing', payload)
    return {
      message: data?.message || 'Billing settings updated successfully',
      settings: data?.settings,
    }
  },
}
