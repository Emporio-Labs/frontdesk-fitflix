import { apiClient } from '@/lib/api-client'

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
