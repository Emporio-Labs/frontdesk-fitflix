import type {
  ConsentData,
  HealthGoalsData,
  OnboardingProfileResponse,
} from '@/lib/services/onboarding.service'
import type {
  ExpertAppointment,
  MedicalReport,
} from '@/lib/services/onboarding.service'
import type {
  HealthMarkers,
  UserOnboardingSummary,
} from '@/lib/services/user.service'

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as object).length === 0
  ) {
    return true
  }
  return false
}

export function pickFirst<T>(...values: Array<T | undefined | null>): T | undefined {
  for (const v of values) {
    if (!isEmpty(v)) return v as T
  }
  return undefined
}

export interface NormalizedProfile {
  healthMarkers?: HealthMarkers
  healthGoals?: HealthGoalsData
  consent?: ConsentData
  reports?: MedicalReport[]
  expertAppointments?: ExpertAppointment[]
  onboardingStatus?: UserOnboardingSummary
}

export function normalizeProfile(
  raw?: OnboardingProfileResponse | null,
): NormalizedProfile {
  if (!raw) return {}
  const layers: Array<Partial<OnboardingProfileResponse> | undefined> = [
    raw,
    raw.profile,
    raw.data,
  ]

  const pickFromLayers = <K extends keyof OnboardingProfileResponse>(
    ...keys: K[]
  ): OnboardingProfileResponse[K] | undefined => {
    for (const layer of layers) {
      if (!layer) continue
      for (const key of keys) {
        const v = layer[key]
        if (!isEmpty(v)) return v as OnboardingProfileResponse[K]
      }
    }
    return undefined
  }

  return {
    healthMarkers: pickFromLayers('healthMarkers') as HealthMarkers | undefined,
    healthGoals: pickFromLayers('healthGoals') as HealthGoalsData | undefined,
    consent: pickFromLayers('consent', 'consentForm') as ConsentData | undefined,
    reports: pickFromLayers('reports', 'medicalReports') as MedicalReport[] | undefined,
    expertAppointments: pickFromLayers('expertAppointments', 'appointments') as
      | ExpertAppointment[]
      | undefined,
    onboardingStatus: pickFromLayers('onboardingStatus') as
      | UserOnboardingSummary
      | undefined,
  }
}

export function normalizeHealthMarkers(
  m?: HealthMarkers,
): HealthMarkers | undefined {
  if (!m || isEmpty(m)) return undefined
  const source = m as Record<string, unknown>
  const height = pickFirst(
    source.height,
    source.heightCm,
    source.heightInCm,
    source.heightInCms,
  )
  const weight = pickFirst(
    source.weight,
    source.weightKg,
    source.weightInKg,
    source.weightInKgs,
  )

  const normalized: HealthMarkers = { ...m }
  if (!isEmpty(height)) normalized.height = height as HealthMarkers['height']
  if (!isEmpty(weight)) normalized.weight = weight as HealthMarkers['weight']

  const hasAny = Object.values(normalized).some((v) => !isEmpty(v))
  return hasAny ? normalized : undefined
}
