import { apiClient } from '@/lib/api-client'

export interface Nutritionist {
  id: string
  _id?: string
  name: string
  bio: string
  specialties: string[]
  certifications: string[]
  imageUrl: string
  status: 'ACTIVE' | 'INACTIVE'
  sessionVolume: number
  createdAt?: string
  updatedAt?: string
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
  certifications?: string[]
  imageUrl?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface AssignmentLog {
  id: string
  _id?: string
  nutritionistId: string
  nutritionistName: string
  type: 'category' | 'member'
  details: string
  assignedBy: string
  timestamp: string
  createdAt?: string
}

export const nutritionistService = {
  getAll: async (): Promise<{ nutritionists: Nutritionist[] }> => {
    const { data } = await apiClient.get('/api/v1/admin/nutritionists')
    return {
      nutritionists: Array.isArray(data?.nutritionists) ? data.nutritionists : (Array.isArray(data) ? data : [])
    }
  },

  getNutritionists: async () => {
    const { data } = await apiClient.get('/api/v1/admin/nutritionists')
    return data as { nutritionists: Nutritionist[] }
  },

  create: async (payload: CreateNutritionistPayload): Promise<{ message: string; nutritionist: Nutritionist }> => {
    const { data } = await apiClient.post('/api/v1/admin/nutritionists', payload)
    return data
  },

  update: async (id: string, payload: UpdateNutritionistPayload): Promise<{ message: string; nutritionist: Nutritionist }> => {
    const { data } = await apiClient.put(`/api/v1/admin/nutritionists/${id}`, payload)
    return data
  },

  getAssignmentLogs: async () => {
    const { data } = await apiClient.get('/api/v1/admin/nutritionists/assignments')
    return data as { logs: AssignmentLog[] }
  },

  assignNutritionist: async (payload: {
    type: 'category' | 'member'
    nutritionistId: string
    categories?: string[]
    memberId?: string
  }) => {
    const { data } = await apiClient.post('/api/v1/admin/nutritionists/assignments', payload)
    return data as { message: string; warning?: string | null; log?: AssignmentLog }
  },

  updateNutritionist: async (id: string, payload: Partial<Nutritionist>) => {
    const { data } = await apiClient.put(`/api/v1/admin/nutritionists/${id}`, payload)
    return data as { message: string; nutritionist: Nutritionist }
  }
}
