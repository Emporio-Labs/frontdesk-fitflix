import { apiClient } from '@/lib/api-client'

export interface Nutritionist {
  _id: string
  id: string
  name: string
  bio: string
  specialties: string[]
  imageUrl?: string
  status: 'ACTIVE' | 'INACTIVE'
  sessionVolume: number
  createdAt: string
  updatedAt: string
}

export interface CreateNutritionistPayload {
  name: string
  bio: string
  specialties: string[]
  imageUrl?: string
  status: 'ACTIVE' | 'INACTIVE'
}

export interface UpdateNutritionistPayload {
  name?: string
  bio?: string
  specialties?: string[]
  imageUrl?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export const nutritionistService = {
  getAll: async (): Promise<{ nutritionists: Nutritionist[] }> => {
    const { data } = await apiClient.get('/api/v1/admin/nutritionists')
    return {
      nutritionists: Array.isArray(data?.nutritionists) ? data.nutritionists : (Array.isArray(data) ? data : [])
    }
  },

  create: async (payload: CreateNutritionistPayload): Promise<{ message: string; nutritionist: Nutritionist }> => {
    const { data } = await apiClient.post('/api/v1/admin/nutritionists', payload)
    return data
  },

  update: async (id: string, payload: UpdateNutritionistPayload): Promise<{ message: string; nutritionist: Nutritionist }> => {
    const { data } = await apiClient.put(`/api/v1/admin/nutritionists/${id}`, payload)
    return data
  }
}
