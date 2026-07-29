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
  imageUrl?: string
  keySentence?: string
  isActive?: boolean
}

export interface CreateTrainerPayload {
  trainerName: string
  email: string
  phone: string
  password: string
  description: string
  specialities: string[]
  imageUrl?: string
  keySentence?: string
  isActive?: boolean
}

export interface UpdateTrainerPayload {
  trainerName?: string
  description?: string
  specialities?: string[]
  imageUrl?: string
  keySentence?: string
  isActive?: boolean
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
  getPublicAll: async (): Promise<{ trainers: Trainer[] }> => {
    const { data } = await apiClient.get('/trainers/public')
    return data
  },
  getPublicById: async (id: string): Promise<{ trainer: Trainer }> => {
    const { data } = await apiClient.get(`/trainers/public/${id}`)
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
  getMyMembers: async (): Promise<{ members: any[] }> => {
    const { data } = await apiClient.get('/trainers/me/members')
    return data
  },
  getMyMemberById: async (userId: string): Promise<{ member: any }> => {
    const { data } = await apiClient.get(`/trainers/me/members/${userId}`)
    return data
  },
}
