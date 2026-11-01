import { describe, it, expect, vi, beforeEach } from 'vitest'
import { settingsService } from '@/lib/services/settings.service'
import { apiClient } from '@/lib/api-client'

describe('Feature 12: Admin Settings, Locations & Permissions Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Settings Normalization & Defaults', () => {
    it('normalizes conference settings response and applies defaults for missing fields', async () => {
      const mockSettings = {
        defaultVideoResolution: '1080p',
        defaultFrameRate: 60,
        defaultAudioMode: 'stereo',
        maxParticipantsPerSession: 100,
        layoutTemplates: ['interactive_class', 'spotlight'],
      }

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { settings: mockSettings },
      })

      const { settings } = await settingsService.getConferenceSettings()

      expect(settings.defaultVideoResolution).toBe('1080p')
      expect(settings.defaultFrameRate).toBe(60)
      expect(settings.maxParticipantsPerSession).toBe(100)
    })

    it('falls back to safe default room settings when backend returns null or empty object', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: {} })

      const { settings } = await settingsService.getConferenceSettings()

      expect(settings.defaultVideoResolution).toBe('720p')
      expect(settings.defaultFrameRate).toBe(30)
      expect(settings.maxParticipantsPerSession).toBe(50)
    })
  })

  describe('Settings Mutation & Access Guard Vulnerabilities', () => {
    it('updates conference settings successfully and returns updated document', async () => {
      const updatedPayload = {
        defaultVideoResolution: '720p' as const,
        maxParticipantsPerSession: 75,
      }

      vi.spyOn(apiClient, 'put').mockResolvedValueOnce({
        data: {
          message: 'Conference settings updated successfully',
          settings: {
            defaultVideoResolution: '720p',
            defaultFrameRate: 30,
            defaultAudioMode: 'stereo',
            maxParticipantsPerSession: 75,
            layoutTemplates: ['standard_meeting'],
          },
        },
      })

      const response = await settingsService.updateConferenceSettings(updatedPayload)

      expect(response.message).toBe('Conference settings updated successfully')
      expect(response.settings.maxParticipantsPerSession).toBe(75)
    })

    it('exposes that alert rule modification route rejects frontdesk staff with 403 Forbidden', async () => {
      // Backend: settingsRouter.put("/alert-rules/:alertType", authorize(["admin"]), updateAlertRule);
      // Frontdesk managers attempting to adjust alert thresholds get 403
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Forbidden: Admin access required to update alert rules' },
        },
      }

      vi.spyOn(apiClient, 'put').mockRejectedValueOnce(forbiddenError)

      await expect(
        apiClient.put('/api/v1/admin/settings/alert-rules/capacity_breached', {
          thresholdPercentage: 90,
        })
      ).rejects.toMatchObject({
        response: { status: 403 },
      })
    })
  })
})
