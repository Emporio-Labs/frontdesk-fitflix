import { apiClient } from '@/lib/api-client'
import type { PopulatedUserRef } from '@/lib/populated'
import type { HealthMarkers, OnboardingStep, UserOnboardingSummary } from './user.service'

export type { HealthMarkers, OnboardingStep, UserOnboardingSummary }

// ── /onboarding/status (User only) ────────────────────────────────────────────
// Returns the authenticated user's onboarding pointer. The endpoint does not
// accept a `userId` parameter — it reads the caller's auth context. Admins
// should not call this endpoint; admin onboarding visibility comes from
// `user.onboardingStatus` on `GET /users/:id` instead.
export interface OnboardingStatusResponse {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  onboardingCompleted: boolean
  allowedNextStep: OnboardingStep | null
}

// ── Medical report (returned by POST /onboarding/reports) ─────────────────────
export interface MedicalReport {
  id: string
  _id: string
  userId: string
  reportName: string
  reportType: string
  reportUrl?: string | null
  uploadedAt: string
  createdAt?: string
  updatedAt?: string
}

// ── Expert appointment (returned by POST /onboarding/appointments) ────────────
export type ExpertType = 'sports_scientist' | 'nutritionist'
export type ExpertAppointmentStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed'

export interface ExpertAppointment {
  id: string
  _id: string
  userId: PopulatedUserRef
  expertType: ExpertType
  bookingStatus: ExpertAppointmentStatus
  appointmentDate?: string | null
  appointmentStart?: string | null
  meetingLink?: string | null
  meetingUrl?: string | null
  calComBookingId?: string | null
  calIdBookingId?: string | null
  createdAt?: string
  updatedAt?: string
}

// ── POST payload DTOs (typed for future user-facing flows) ────────────────────
export interface HealthMarkersPayload {
  weight: number
  height: number
  allergies?: string[]
  medications?: string[]
  diseaseHistory?: string[]
  sleepHours?: number
  activityLevel?: 'Sedentary' | 'Light' | 'Moderate' | 'Active' | 'VeryActive'
}

export interface HealthGoalsPayload {
  goals: string[]
  targetWeight?: number
  timeline?: string
  workoutExperience?: 'None' | 'Beginner' | 'Intermediate' | 'Advanced'
  foodPreferences?: string[]
}

export interface ConsentPayload {
  accepted: true
  signatureUrl?: string
}

export interface ReportUploadPayload {
  reportName: string
  reportType: string
  reportUrl?: string
}

export interface OnboardingAppointmentPayload {
  expertType: ExpertType
  appointmentDate?: string
  meetingLink?: string
  calComBookingId?: string
}

// ── Aggregated onboarding profile (GET /users/:id/onboarding-profile) ─────────
// Wide types — backend schema not yet locked. Defensive readers in
// `lib/onboarding-normalize.ts` walk known shape variants.
export interface HealthGoalsData {
  goals?: string[] | string
  primaryGoals?: string[] | string
  targetWeight?: number | string
  targetWeightKg?: number | string
  currentWeight?: number | string
  timeline?: string
  targetDate?: string
  workoutExperience?: string
  workoutGoals?: string[] | string
  foodPreferences?: string[] | string
  dietPreferences?: string[] | string
  transformationTargets?: string[] | string | Record<string, unknown>
  notes?: string
  userNotes?: string
  [key: string]: unknown
}

export interface ConsentData {
  accepted?: boolean
  consentGiven?: boolean
  consentDate?: string
  signedAt?: string
  acceptedAt?: string
  version?: string | number
  consentVersion?: string | number
  signature?: string
  signatureUrl?: string
  ipAddress?: string
  ip?: string
  userAgent?: string
  [key: string]: unknown
}

export interface OnboardingProfileResponse {
  healthMarkers?: HealthMarkers
  healthGoals?: HealthGoalsData
  consent?: ConsentData
  consentForm?: ConsentData
  reports?: MedicalReport[]
  medicalReports?: MedicalReport[]
  expertAppointments?: ExpertAppointment[]
  appointments?: ExpertAppointment[]
  onboardingStatus?: UserOnboardingSummary
  profile?: Partial<OnboardingProfileResponse>
  data?: Partial<OnboardingProfileResponse>
  [key: string]: unknown
}

export const onboardingService = {
  // Authenticated user's own onboarding status. Admin dashboards should NOT
  // call this — use `user.onboardingStatus` from `GET /users/:id` instead.
  getStatus: async () => {
    const { data } = await apiClient.get('/onboarding/status')
    return data as OnboardingStatusResponse
  },

  getOnboardingProfile: async (userId: string) => {
    const { data } = await apiClient.get(`/users/${userId}/onboarding-profile`)
    return data as OnboardingProfileResponse
  },

  // Admin visibility — GET /onboarding/status/:userId
  getStatusByUser: async (userId: string): Promise<OnboardingStatusResponse> => {
    const { data } = await apiClient.get(`/onboarding/status/${userId}`)
    return data as OnboardingStatusResponse
  },

  submitHealthMarkers: async (payload: HealthMarkersPayload) => {
    const { data } = await apiClient.post('/onboarding/health-markers', payload)
    return data as { message: string; healthMarkers: unknown }
  },

  submitHealthGoals: async (payload: HealthGoalsPayload) => {
    const { data } = await apiClient.post('/onboarding/health-goals', payload)
    return data as { message: string; healthGoals: unknown }
  },

  submitConsent: async (payload: ConsentPayload) => {
    const { data } = await apiClient.post('/onboarding/consent', payload)
    return data as { message: string; consentForm: unknown }
  },

  submitReport: async (payload: ReportUploadPayload) => {
    const { data } = await apiClient.post('/onboarding/reports', payload)
    return data as { message: string; report: MedicalReport }
  },

  submitAppointment: async (payload: OnboardingAppointmentPayload) => {
    const { data } = await apiClient.post('/onboarding/appointments', payload)
    return data as { message: string; appointment: ExpertAppointment }
  },

  complete: async () => {
    const { data } = await apiClient.post('/onboarding/complete')
    return data as { message: string; completedAt: string }
  },

  cancelNutritionistAppointment: async (userId: string) => {
    // TODO(backend): confirm endpoint shape — see BACKEND_REQUIREMENTS.txt §6.
    const { data } = await apiClient.delete(
      `/onboarding/appointments/nutritionist/${userId}`
    )
    return data as { message: string }
  },
}
