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

export type ActivityLevel = 'Sedentary' | 'Light' | 'Moderate' | 'Active' | 'VeryActive'

// Optional snapshot of the user's onboarding health markers (weight/height/activity).
// Backend may populate this on GET /users/:id later — the UI degrades gracefully
// when the field is absent.
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
  age: string
  gender: string
  healthGoals: string[]
  createdAt: string
  updatedAt: string
  onboarded?: boolean
  onboardingStatus?: UserOnboardingSummary
  healthMarkers?: HealthMarkersSnapshot
  healthGoalsSnapshot?: HealthGoalsSnapshot
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

function normalizeUser(raw: any): User {
  const id = String(raw?._id || raw?.id || '')
  return {
    id,
    _id: id,
    username: String(raw?.username || ''),
    email: String(raw?.email || ''),
    phone: String(raw?.phone || ''),
    age: String(raw?.age || ''),
    gender: String(raw?.gender || ''),
    healthGoals: Array.isArray(raw?.healthGoals) ? raw.healthGoals.map(String) : [],
    createdAt: String(raw?.createdAt || ''),
    updatedAt: String(raw?.updatedAt || raw?.createdAt || ''),
    onboarded: raw?.onboarded != null ? Boolean(raw.onboarded) : undefined,
    onboardingStatus: raw?.onboardingStatus ?? undefined,
    healthMarkers: raw?.healthMarkers ?? undefined,
    healthGoalsSnapshot: raw?.healthGoalsSnapshot ?? undefined,
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
    return { user: normalizeUser(data?.user ?? data?.data ?? data) }
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

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/users/${id}`)
    return { message: data?.message || 'User deleted successfully' }
  },
}
