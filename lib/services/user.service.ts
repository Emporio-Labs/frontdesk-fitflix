import { apiClient } from '@/lib/api-client'

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
