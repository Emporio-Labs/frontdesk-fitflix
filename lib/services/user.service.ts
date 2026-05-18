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

export interface User {
  _id: string
  username: string
  email: string
  phone: string
  age: string
  gender: string
  healthGoals: string[]
  createdAt: string
  updatedAt: string
  onboarded?: boolean
  onboardingStatus?: UserOnboardingSummary
  healthMarkers?: HealthMarkers
  reports?: MedicalReport[]
  expertAppointments?: ExpertAppointment[]
}

export interface CreateUserPayload {
  username: string
  email: string
  phone: string
  password: string
  age: string
  gender: string
  healthGoals: string[]
}

export interface UpdateUserPayload {
  username?: string
  phone?: string
  age?: string
  gender?: string
  healthGoals?: string[]
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

  create: async (payload: CreateUserPayload) => {
    const { data } = await apiClient.post('/users', payload)
    return data as { message: string; user: User }
  },

  update: async (id: string, payload: UpdateUserPayload) => {
    const { data } = await apiClient.patch(`/users/${id}`, payload)
    return data as { message: string; user: User }
  },

  delete: async (id: string) => {
    const { data } = await apiClient.delete(`/users/${id}`)
    return data as { message: string }
  },
}
