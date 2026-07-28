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
  bookingVolume?: number
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
  profileImage?: File
}

export interface UpdateTrainerPayload {
  trainerName?: string
  description?: string
  specialities?: string[]
  imageUrl?: string
  keySentence?: string
  isActive?: boolean
  profileImage?: File
}

function buildTrainerRequestBody(payload: CreateTrainerPayload | UpdateTrainerPayload) {
  if (payload.profileImage instanceof File) {
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      if (key === 'profileImage' && value instanceof File) {
        formData.append('profileImage', value)
        return
      }
      if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value))
        return
      }
      formData.append(key, String(value))
    })
    return { body: formData, headers: undefined }
  }

  return { body: payload, headers: undefined }
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
    const { body, headers } = buildTrainerRequestBody(payload)
    const { data } = await apiClient.post('/trainers', body, { headers })
    return data
  },
  update: async (id: string, payload: UpdateTrainerPayload): Promise<{ message: string; trainer: Trainer }> => {
    const { body, headers } = buildTrainerRequestBody(payload)
    const { data } = await apiClient.patch(`/trainers/${id}`, body, { headers })
    return data
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/trainers/${id}`)
    return data
  },
}
