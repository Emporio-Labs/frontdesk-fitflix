import { apiClient } from '@/lib/api-client'

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
