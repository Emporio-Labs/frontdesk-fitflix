import { apiClient } from '@/lib/api-client'
import type { OnboardingStep, UserOnboardingSummary } from './user.service'

export type { OnboardingStep, UserOnboardingSummary }

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
export type ExpertAppointmentStatus = 'Pending' | 'Confirmed' | 'Cancelled'

export interface ExpertAppointment {
  id: string
  _id: string
  userId: string
  expertType: ExpertType
  bookingStatus: ExpertAppointmentStatus
  appointmentDate?: string | null
  meetingLink?: string | null
  calComBookingId?: string | null
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

export const onboardingService = {
  // Authenticated user's own onboarding status. Admin dashboards should NOT
  // call this — use `user.onboardingStatus` from `GET /users/:id` instead.
  getStatus: async () => {
    const { data } = await apiClient.get('/onboarding/status')
    return data as OnboardingStatusResponse
  },

  // ASSUMPTION: admin visibility endpoint is GET /onboarding/status/:userId
  // (path param). If the backend uses a query param instead, change to:
  // apiClient.get('/onboarding/status', { params: { userId } })
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
}
