import { apiClient } from '@/lib/api-client'
import type {
  WorkoutPlan,
  CreateWorkoutPlanPayload,
  UpdateWorkoutPlanPayload,
  PlanStatus,
  PlanGoal,
  Difficulty,
} from '@/types/workout'

export interface WorkoutPlanListParams {
  page?: number
  limit?: number
  status?: PlanStatus
  goal?: PlanGoal
  difficulty?: Difficulty
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export const workoutPlanService = {
  list: async (
    params?: WorkoutPlanListParams
  ): Promise<{ plans: WorkoutPlan[]; pagination: PaginationInfo }> => {
    const { data } = await apiClient.get('/workout-plans', { params })
    return data
  },

  getById: async (id: string): Promise<WorkoutPlan> => {
    const { data } = await apiClient.get(`/workout-plans/${id}`)
    return data
  },

  create: async (payload: CreateWorkoutPlanPayload): Promise<WorkoutPlan> => {
    const { data } = await apiClient.post('/workout-plans', payload)
    return data
  },

  update: async (
    id: string,
    payload: UpdateWorkoutPlanPayload
  ): Promise<WorkoutPlan> => {
    const { data } = await apiClient.patch(`/workout-plans/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/workout-plans/${id}`)
    return data
  },

  assignUsers: async (
    id: string,
    userIds: string[]
  ): Promise<WorkoutPlan> => {
    const { data } = await apiClient.post(`/workout-plans/${id}/assign`, {
      userIds,
    })
    return data
  },
}
