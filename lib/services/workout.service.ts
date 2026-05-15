import { apiClient } from '@/lib/api-client'
import type { WorkoutSession, WorkoutExercise, SetLog, SessionStatus } from '@/types/workout'

export interface WorkoutSessionListParams {
  page?: number
  limit?: number
  status?: SessionStatus
}

export interface WorkoutHistoryParams {
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface CreateSessionPayload {
  date?: string
  notes?: string
  planId?: string
  exercises?: {
    exerciseId: string
    targetSets: number
    targetReps: number
    targetWeightKg?: number
    restSeconds?: number
  }[]
}

export interface UpdateSessionPayload {
  status?: SessionStatus
  notes?: string
}

export interface AddExercisePayload {
  exerciseId: string
  targetSets: number
  targetReps: number
  targetWeightKg?: number
  restSeconds?: number
}

export interface UpdateWorkoutExercisePayload {
  targetSets?: number
  targetReps?: number
  targetWeightKg?: number
  restSeconds?: number
}

export interface LogSetPayload {
  actualReps: number
  actualWeightKg: number
  rpe?: number
  isWarmup?: boolean
  notes?: string
}

export interface UpdateSetPayload {
  actualReps?: number
  actualWeightKg?: number
  rpe?: number
  isWarmup?: boolean
  notes?: string
}

export interface WorkoutStats {
  weeklyWorkouts: number
  totalSetsThisWeek: number
  caloriesBurnedWeek: number
  consistencyScore: number
  currentStreak: number
  totalVolumeKg: number
  personalRecords: Record<
    string,
    { maxWeightKg: number; maxReps: number; achievedAt: string }
  >
}

export interface WorkoutHistoryEntry {
  id: string
  date: string
  status: SessionStatus
  duration: number
  exerciseCount: number
  totalSets: number
  totalReps: number
  totalVolumeKg: number
  caloriesBurned: number
  muscleGroups: string[]
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export const workoutService = {
  getToday: async (): Promise<WorkoutSession> => {
    const { data } = await apiClient.get('/workouts/today')
    return data
  },

  getMySessions: async (
    params?: WorkoutSessionListParams
  ): Promise<{ sessions: WorkoutSession[]; pagination: PaginationInfo }> => {
    const { data } = await apiClient.get('/workouts/me', { params })
    return data
  },

  getById: async (id: string): Promise<WorkoutSession> => {
    const { data } = await apiClient.get(`/workouts/${id}`)
    return data
  },

  create: async (payload: CreateSessionPayload): Promise<WorkoutSession> => {
    const { data } = await apiClient.post('/workouts', payload)
    return data
  },

  update: async (
    id: string,
    payload: UpdateSessionPayload
  ): Promise<WorkoutSession> => {
    const { data } = await apiClient.patch(`/workouts/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/workouts/${id}`)
    return data
  },

  addExercise: async (
    sessionId: string,
    payload: AddExercisePayload
  ): Promise<WorkoutExercise> => {
    const { data } = await apiClient.post(
      `/workouts/${sessionId}/exercises`,
      payload
    )
    return data
  },

  updateExercise: async (
    sessionId: string,
    id: string,
    payload: UpdateWorkoutExercisePayload
  ): Promise<WorkoutExercise> => {
    const { data } = await apiClient.patch(
      `/workouts/${sessionId}/exercises/${id}`,
      payload
    )
    return data
  },

  removeExercise: async (
    sessionId: string,
    id: string
  ): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(
      `/workouts/${sessionId}/exercises/${id}`
    )
    return data
  },

  reorderExercises: async (
    sessionId: string,
    order: string[]
  ): Promise<WorkoutExercise[]> => {
    const { data } = await apiClient.patch(
      `/workouts/${sessionId}/exercises/reorder`,
      { order }
    )
    return data
  },

  logSet: async (
    sessionId: string,
    exerciseId: string,
    payload: LogSetPayload
  ): Promise<SetLog & { exerciseCompleted: boolean; setsRemaining: number }> => {
    const { data } = await apiClient.post(
      `/workouts/${sessionId}/exercises/${exerciseId}/sets`,
      payload
    )
    return data
  },

  updateSet: async (
    sessionId: string,
    exerciseId: string,
    setId: string,
    payload: UpdateSetPayload
  ): Promise<SetLog> => {
    const { data } = await apiClient.patch(
      `/workouts/${sessionId}/exercises/${exerciseId}/sets/${setId}`,
      payload
    )
    return data
  },

  deleteSet: async (
    sessionId: string,
    exerciseId: string,
    setId: string
  ): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(
      `/workouts/${sessionId}/exercises/${exerciseId}/sets/${setId}`
    )
    return data
  },

  getStats: async (): Promise<WorkoutStats> => {
    const { data } = await apiClient.get('/workouts/me/stats')
    return data
  },

  getHistory: async (
    params?: WorkoutHistoryParams
  ): Promise<{ workouts: WorkoutHistoryEntry[]; pagination: PaginationInfo }> => {
    const { data } = await apiClient.get('/workouts/me/history', { params })
    return data
  },
}
