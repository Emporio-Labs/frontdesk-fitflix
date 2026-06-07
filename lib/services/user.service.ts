import { apiClient } from '@/lib/api-client'
import type { MedicalReport, ExpertAppointment } from './onboarding.service'

export type OnboardingStep =
  | 'HEALTH_MARKERS'
  | 'HEALTH_GOALS'
  | 'CONSENT'
  | 'REPORT_UPLOAD'
  | 'SPORTS_SCIENTIST_BOOKING'
  | 'NUTRITIONIST_BOOKING'
  | 'COMPLETED'

export interface UserOnboardingSummary {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  healthMarkersCompleted: boolean
  healthGoalsCompleted: boolean
  consentCompleted: boolean
  reportsUploaded: boolean
  sportsScientistBooked: boolean
  nutritionistBooked: boolean
  onboardingCompleted: boolean
}

export type ActivityLevel = 'Sedentary' | 'Light' | 'Moderate' | 'Active' | 'VeryActive'

export interface HealthMarkers {
  height?: number | string
  weight?: number | string
  age?: number | string
  gender?: string
  bodyFatPercent?: number | string
  medicalConditions?: string[] | string
  injuries?: string[] | string
  allergies?: string[] | string
  medications?: string[] | string
  diseaseHistory?: string[] | string
  sleepHours?: number | string
  activityLevel?: string
  smoking?: string
  alcohol?: string
  diet?: string
  occupation?: string
  stressLevel?: string
  hydration?: string | number
  bmi?: number | string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface HealthMarkersSnapshot {
  weight?: number          // kg
  height?: number          // cm
  activityLevel?: ActivityLevel
  sleepHours?: number
  allergies?: string[]
}

export interface HealthGoalsSnapshot {
  targetWeight?: number
  workoutExperience?: 'None' | 'Beginner' | 'Intermediate' | 'Advanced'
  foodPreferences?: string[]
}

export interface User {
  /** Canonical ID — use this for new code, API calls, and cache keys. */
  id: string
  /** Backward-compat alias for id — populated identically. Existing UI code using ._id continues to work. */
  _id: string
  username: string
  email: string
  phone: string
  age: number
  gender: string
  healthGoals: string[]
  dateOfBirth?: string
  emergencyContact?: string
  address?: string
  onboarded?: boolean
  createdAt: string
  updatedAt: string
  onboardingStatus?: UserOnboardingSummary
  healthMarkers?: HealthMarkers
  healthGoalsSnapshot?: HealthGoalsSnapshot
  reports?: MedicalReport[]
  expertAppointments?: ExpertAppointment[]
}

export interface CreateUserPayload {
  username: string
  email?: string
  phone: string
  password?: string
  age: number
  gender: string
  healthGoals?: string[]
  dateOfBirth?: string
  emergencyContact?: string
  address?: string
}

export interface UpdateUserPayload {
  username?: string
  phone?: string
  age?: number
  gender?: string
  healthGoals?: string[]
  dateOfBirth?: string
  emergencyContact?: string
  address?: string
}

export interface OnboardUserPayload {
  username?: string
  phone?: string
  age?: number
  gender?: string
  healthGoals?: string[]
  onboarded?: boolean
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface UserReport {
  id: string
  title: string
  summary: string
  suggestions: string[]
  recommendations: string[]
  insights: string[]
  generated_date: string
  pdf_url: string
}

export interface HpodMetric {
  _id: string
  reportId: string
  reportDate: string
  recordedAt: string
  receivedAt: string
  patientName: string
  patientEmail: string
  patientPhone: string
  age: string
  gender: string
  vitals: Record<string, unknown>
  bodyComposition: Record<string, unknown>
  ecg: Record<string, unknown>
  idealBodyWeight_kg: number
  weightToLose_kg: number
  testsNotTaken: string[]
  healthInsight: string
  concerns: string[]
}

function normalizeUser(raw: any): User {
  const id = String(raw?._id || raw?.id || '')
  return {
    id,
    _id: id,
    username: String(raw?.username || ''),
    email: String(raw?.email || ''),
    phone: String(raw?.phone || ''),
    age: Number(raw?.age || 0),
    gender: String(raw?.gender || ''),
    healthGoals: Array.isArray(raw?.healthGoals) ? raw.healthGoals.map(String) : [],
    createdAt: String(raw?.createdAt || ''),
    updatedAt: String(raw?.updatedAt || raw?.createdAt || ''),
    onboarded: raw?.onboarded != null ? Boolean(raw.onboarded) : undefined,
    onboardingStatus: raw?.onboardingStatus ?? undefined,
    healthMarkers: raw?.healthMarkers ?? undefined,
    healthGoalsSnapshot: raw?.healthGoalsSnapshot ?? undefined,
    expertAppointments: raw?.expertAppointments ?? undefined,
    reports: raw?.reports ?? undefined,
  }
}

function extractUserList(data: any): any[] {
  if (Array.isArray(data?.users)) return data.users
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data
  return []
}

export const userService = {
  getAll: async (): Promise<{ users: User[] }> => {
    const { data } = await apiClient.get('/users')
    return { users: extractUserList(data).map(normalizeUser) }
  },

  getById: async (id: string): Promise<{ user: User }> => {
    const { data } = await apiClient.get(`/users/${id}`)
    
    if (data?.success && data?.data?.user) {
      const normalized = normalizeUser(data.data.user)
      if (data.data.healthMarkers) {
        normalized.healthMarkers = data.data.healthMarkers
      }
      if (data.data.reports) {
        normalized.reports = data.data.reports
      }
      if (data.data.onboarding) {
        normalized.onboardingStatus = data.data.onboarding
      }
      return { user: normalized }
    }
    
    return { user: normalizeUser(data?.user ?? data?.data ?? data) }
  },

  getMe: async () => {
    const { data } = await apiClient.get('/users/me')
    return data as { user: User }
  },

  getMyReports: async () => {
    const { data } = await apiClient.get('/users/me/reports')
    return data as { reports: UserReport[] }
  },

  getMyHpodMetrics: async () => {
    const { data } = await apiClient.get('/users/me/hpod-metrics')
    return data as { history: HpodMetric[] }
  },

  create: async (payload: CreateUserPayload): Promise<{ message: string; user: User }> => {
    const { data } = await apiClient.post('/users', payload)
    return {
      message: data?.message || 'User created successfully',
      user: normalizeUser(data?.user ?? data?.data ?? data),
    }
  },

  update: async (id: string, payload: UpdateUserPayload): Promise<{ message: string; user: User }> => {
    const { data } = await apiClient.patch(`/users/${id}`, payload)
    return {
      message: data?.message || 'User updated successfully',
      user: normalizeUser(data?.user ?? data?.data ?? data),
    }
  },

  onboard: async (id: string, payload: OnboardUserPayload) => {
    const { data } = await apiClient.patch(`/users/${id}/onboard`, payload)
    return data as { message: string; user: User }
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    const { data } = await apiClient.patch('/users/me/password', payload)
    return data as { message: string }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/users/${id}`)
    return { message: data?.message || 'User deleted successfully' }
  },
}
