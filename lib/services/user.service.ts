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

export type ActivityLevel = 'Sedentary' | 'Light' | 'Moderate' | 'Active' | 'VeryActive'

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
  email: string
  phone: string
  password: string
  age: number
  gender: string
  healthGoals: string[]
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

export const userService = {
  getAll: async () => {
    const { data } = await apiClient.get('/users')
    return data as { users: User[] }
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/users/${id}`)
    return data as { user: User }
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

  create: async (payload: CreateUserPayload) => {
    const { data } = await apiClient.post('/users', payload)
    return data as { message: string; user: User }
  },

  update: async (id: string, payload: UpdateUserPayload) => {
    const { data } = await apiClient.patch(`/users/${id}`, payload)
    return data as { message: string; user: User }
  },

  onboard: async (id: string, payload: OnboardUserPayload) => {
    const { data } = await apiClient.patch(`/users/${id}/onboard`, payload)
    return data as { message: string; user: User }
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    const { data } = await apiClient.patch('/users/me/password', payload)
    return data as { message: string }
  },

  delete: async (id: string) => {
    const { data } = await apiClient.delete(`/users/${id}`)
    return data as { message: string }
  },
}
