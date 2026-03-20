import { apiClient } from '@/lib/api-client'

export interface LoginPayload {
  email: string
  password: string
}

export interface SignupPayload {
  username: string
  email: string
  phone: string
  password: string
  age: number
  gender: number
  healthGoals: string
}

export const authService = {
  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post('/auth/login', payload)
    return data
  },
  signup: async (payload: SignupPayload) => {
    const { data } = await apiClient.post('/auth/signup', payload)
    return data
  },
}
