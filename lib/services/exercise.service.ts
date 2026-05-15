import { apiClient } from '@/lib/api-client'
import type {
  ExerciseFilters,
  ExerciseListResponse,
  Exercise,
  CreateExercisePayload,
  UpdateExercisePayload,
} from '@/types/workout'

export const exerciseService = {
  getAll: async (filters?: ExerciseFilters): Promise<ExerciseListResponse> => {
    const params: Record<string, string | number | boolean> = {}
    if (filters?.muscleGroup) params.muscleGroup = filters.muscleGroup
    if (filters?.difficulty) params.difficulty = filters.difficulty
    if (filters?.equipment) params.equipment = filters.equipment
    if (filters?.search) params.search = filters.search
    if (filters?.isSystem !== undefined) params.isSystem = filters.isSystem
    params.page = filters?.page ?? 1
    params.limit = filters?.limit ?? 50

    const { data } = await apiClient.get('/exercises', { params })
    return data
  },

  getById: async (id: string): Promise<Exercise> => {
    const { data } = await apiClient.get(`/exercises/${id}`)
    return data
  },

  create: async (payload: CreateExercisePayload): Promise<Exercise> => {
    const { data } = await apiClient.post('/exercises', payload)
    return data
  },

  update: async (id: string, payload: UpdateExercisePayload): Promise<Exercise> => {
    const { data } = await apiClient.put(`/exercises/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/exercises/${id}`)
    return data
  },
}
