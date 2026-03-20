import { apiClient } from '@/lib/api-client'

export interface Trainer {
  _id: string
  trainerName: string
  email: string
  phone: string
  description: string
  specialities: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateTrainerPayload {
  trainerName: string
  email: string
  phone: string
  password: string
  description: string
  specialities: string[]
}

export interface UpdateTrainerPayload {
  trainerName?: string
  description?: string
  specialities?: string[]
}

export const trainerService = {
  getAll: async (): Promise<{ trainers: Trainer[] }> => {
    const { data } = await apiClient.get('/trainers')
    return data
  },
  getById: async (id: string): Promise<{ trainer: Trainer }> => {
    const { data } = await apiClient.get(`/trainers/${id}`)
    return data
  },
  create: async (payload: CreateTrainerPayload): Promise<{ message: string; trainer: Trainer }> => {
    const { data } = await apiClient.post('/trainers', payload)
    return data
  },
  update: async (id: string, payload: UpdateTrainerPayload): Promise<{ message: string; trainer: Trainer }> => {
    const { data } = await apiClient.patch(`/trainers/${id}`, payload)
    return data
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/trainers/${id}`)
    return data
  },
}
