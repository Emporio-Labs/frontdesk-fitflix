import { apiClient } from '@/lib/api-client'
import type { WorkoutPlan } from '@/types/workout'

export interface WorkoutPlanListResponse {
  plans: WorkoutPlan[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateWorkoutPlanPayload {
  name: string
  description?: string
  difficulty: string
  duration: number
  goal: string
  splitType?: string
  status?: string
  isTemplate?: boolean
  templateCategory?: string
  assignedUsers?: string[]
  days: Array<{
    dayNumber: number
    name: string
    isRestDay?: boolean
    exercises: Array<{
      exerciseId: string
      orderIndex: number
      targetSets: number
      targetReps: number
      targetWeightKg?: number
      restSeconds?: number
      section?: string
      durationSeconds?: number | null
      notes?: string | null
    }>
  }>
}

export interface UpdateWorkoutPlanPayload {
  name?: string
  description?: string
  difficulty?: string
  duration?: number
  goal?: string
  splitType?: string
  status?: string
  isTemplate?: boolean
  templateCategory?: string
  assignedUsers?: string[]
  days?: CreateWorkoutPlanPayload['days']
}

export interface AssignmentScheduleEntry {
  date: string
  dayNumber: number
  dayName: string
  isRestDay: boolean
  status: string
}

export interface AssignmentScheduleResponse {
  assignmentId: string
  schedule: AssignmentScheduleEntry[]
}

export interface BatchUpdateSchedulePayload {
  updates: Array<{
    dayNumber: number
    newScheduledDate: string
  }>
}

export const workoutPlanService = {
  getAll: async (
    filters?: {
      page?: number
      limit?: number
      status?: string
      goal?: string
      difficulty?: string
    }
  ): Promise<WorkoutPlanListResponse> => {
    const params: Record<string, string | number> = {}
    if (filters?.page) params.page = filters.page
    if (filters?.limit) params.limit = filters.limit
    if (filters?.status) params.status = filters.status
    if (filters?.goal) params.goal = filters.goal
    if (filters?.difficulty) params.difficulty = filters.difficulty

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

  update: async (id: string, payload: UpdateWorkoutPlanPayload): Promise<WorkoutPlan> => {
    const { data } = await apiClient.patch(`/workout-plans/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/workout-plans/${id}`)
    return data
  },

  assignUsers: async (
    id: string,
    payload: {
      userIds: string[]
      startDate?: string
    }
  ): Promise<WorkoutPlan> => {
    const { data } = await apiClient.post(`/workout-plans/${id}/assign`, payload)
    return data
  },

  getAssignmentSchedule: async (
    filters?: {
      from?: string
      to?: string
    }
  ): Promise<AssignmentScheduleResponse> => {
    const params: Record<string, string> = {}
    if (filters?.from) params.from = filters.from
    if (filters?.to) params.to = filters.to

    const { data } = await apiClient.get('/workout-plans/assignments/mine/schedule', { params })
    return data
  },

  getMyAssignment: async (): Promise<any> => {
    const { data } = await apiClient.get('/workout-plans/assignments/mine')
    return data
  },

  getTodayAssignment: async (): Promise<any> => {
    const { data } = await apiClient.get('/workout-plans/assignments/mine/today')
    return data
  },

  getAssignmentForDay: async (dayNumber: number): Promise<any> => {
    const { data } = await apiClient.get(`/workout-plans/assignments/mine/days/${dayNumber}`)
    return data
  },

  completeDay: async (
    payload: {
      dayNumber: number
      sessionId: string
    }
  ): Promise<{ ok: boolean; assignmentStatus: string }> => {
    const { data } = await apiClient.post('/workout-plans/assignments/mine/complete-day', payload)
    return data
  },

  swapDays: async (
    payload: {
      dayNumberA: number
      dayNumberB: number
    }
  ): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.post('/workout-plans/assignments/mine/swap-days', payload)
    return data
  },

  batchUpdateSchedule: async (
    assignmentId: string,
    payload: BatchUpdateSchedulePayload
  ): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.patch(
      `/workout-plans/assignments/${assignmentId}/schedule`,
      payload
    )
    return data
  },
}
