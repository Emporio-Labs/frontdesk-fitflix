import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ONBOARDING_STEP_ORDER,
  onboardingStepLabel,
} from '@/components/onboarding-timeline'
import {
  normalizeProfile,
  normalizeHealthMarkers,
} from '@/lib/onboarding-normalize'
import { onboardingService } from '@/lib/services/onboarding.service'
import { apiClient } from '@/lib/api-client'

describe('Feature 5: Member Onboarding Timeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Timeline Step Labels & Sequence Mapping', () => {
    it('returns friendly labels for known centre-managed steps', () => {
      expect(onboardingStepLabel('ACTIVE_X_TEST')).toBe('Active X test')
      expect(onboardingStepLabel('DNA_SAMPLE')).toBe('DNA sample')
      expect(onboardingStepLabel('VALD_TEST')).toBe('VALD test')
      expect(onboardingStepLabel('PLAN_TRAINER_ASSIGNMENT')).toBe('Plan & PT trainer')
    })

    it('falls back to capitalized words for app-owned steps not in the timeline list', () => {
      // Current behavior: HEALTH_MARKERS is not in ONBOARDING_STEP_ORDER
      expect(onboardingStepLabel('HEALTH_MARKERS')).toBe('Health Markers')
      expect(onboardingStepLabel('HEALTH_GOALS')).toBe('Health Goals')
      expect(onboardingStepLabel('CONSENT')).toBe('Consent')
      expect(onboardingStepLabel(null)).toBe('—')
    })

    it('demonstrates the step mismatch between mobile app steps and frontdesk timeline', () => {
      const appOwnedStepKeys = [
        'HEALTH_MARKERS',
        'HEALTH_GOALS',
        'CONSENT',
        'REPORT_UPLOAD',
        'NUTRITIONIST_BOOKING',
      ]

      const frontdeskTimelineKeys = ONBOARDING_STEP_ORDER.map((s) => s.key)

      // None of the mobile app onboarding steps exist in the frontdesk timeline!
      for (const step of appOwnedStepKeys) {
        expect(frontdeskTimelineKeys).not.toContain(step)
      }
    })
  })

  describe('Health Profile & Markers Normalization', () => {
    it('picks height and weight regardless of field naming variants', () => {
      const rawWithSuffixes = {
        heightInCm: 178,
        weightInKg: 75,
        bloodPressure: '120/80',
      }

      const normalized = normalizeHealthMarkers(rawWithSuffixes as any)
      expect(normalized).toBeDefined()
      expect(normalized?.height).toBe(178)
      expect(normalized?.weight).toBe(75)
    })

    it('unwraps nested profile and data response layers', () => {
      const layeredResponse = {
        profile: {
          healthMarkers: { height: 180, weight: 80 },
          healthGoals: { primaryGoals: ['Build muscle'] },
          consent: { accepted: true, signedAt: '2026-10-01' },
        },
      }

      const unwrapped = normalizeProfile(layeredResponse as any)
      expect(unwrapped.healthMarkers?.height).toBe(180)
      expect(unwrapped.consent?.accepted).toBe(true)
    })
  })

  describe('Onboarding Service API Invocations', () => {
    it('calls getStatusByUser with the target userId', async () => {
      let sentUrl = ''

      apiClient.defaults.adapter = async (config) => {
        sentUrl = config.url || ''
        return {
          data: {
            currentStep: 'HEALTH_MARKERS',
            completedSteps: [],
            onboardingCompleted: false,
            allowedNextStep: 'HEALTH_MARKERS',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      const res = await onboardingService.getStatusByUser('usr_target_123')
      expect(sentUrl).toBe('/onboarding/status/usr_target_123')
      expect(res.currentStep).toBe('HEALTH_MARKERS')
    })

    it('calls updateSharedStep with step name and completion flag', async () => {
      let sentUrl = ''
      let sentBody: any

      apiClient.defaults.adapter = async (config) => {
        sentUrl = config.url || ''
        sentBody = JSON.parse(config.data || '{}')
        return {
          data: {
            message: 'Step updated',
            status: { currentStep: 'DNA_SAMPLE', completedSteps: ['ACTIVE_X_TEST'] },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      await onboardingService.updateSharedStep('usr_123', 'ACTIVE_X_TEST', true)
      expect(sentUrl).toBe('/onboarding/steps/usr_123/ACTIVE_X_TEST')
      expect(sentBody.completed).toBe(true)
    })
  })
})
