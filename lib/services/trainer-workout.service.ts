import { apiClient } from '@/lib/api-client'

export interface LoggedSet {
  _id: string
  workoutExerciseId: string
  setNumber: number
  actualReps: number
  actualWeightKg: number
  rpe?: number | null
  isWarmup: boolean
  completedAt: string
  notes?: string | null
  loggedBy?: string | null
  loggedByModel?: 'User' | 'Trainer' | 'Admin'
}

export interface DetailedWorkoutExercise {
  _id: string
  sessionId: string
  exerciseId: string
  orderIndex: number
  section: string
  targetSets: number
  targetReps: number
  targetWeightKg?: number | null
  restSeconds: number
  durationSeconds?: number | null
  notes?: string | null
  isCompleted?: boolean
  exercise?: {
    name: string
    muscleGroup: string
    difficulty: string
    equipment: string
    caloriesPerSet: number
    sectionTypes?: string[]
  } | null
  sets: LoggedSet[]
}

export interface DetailedWorkoutSession {
  _id: string
  userId: string
  date: string
  status: 'Active' | 'Completed' | 'Cancelled'
  startedAt: string
  completedAt?: string | null
  notes?: string | null
  planId?: string | null
  lastTouchedBy?: string | null
  lastTouchedByModel?: 'User' | 'Trainer' | 'Admin'
  updatedAt: string
  exercises: DetailedWorkoutExercise[]
}

/** One row of `GET .../workouts/me/history` — a summary, with no exercise or set data. */
export interface WorkoutHistoryEntry {
  id: string
  date: string
  status: 'Active' | 'Completed' | 'Cancelled'
  startedAt: string
  completedAt?: string | null
  notes?: string | null
  planId?: string | null
  /** Seconds between startedAt and completedAt; 0 while a session is unfinished. */
  duration: number
}

/**
 * `GET .../workouts/me/stats`. Every figure is current-week or to-date — the
 * endpoint returns no time series, so trends have to be derived from history.
 */
export interface WorkoutStats {
  weeklyWorkouts: number
  totalSetsThisWeek: number
  caloriesBurnedWeek: number
  consistencyScore: number
  currentStreak: number
  totalVolumeKg: number
  personalRecords: unknown[]
}

export const trainerWorkoutService = {
  getActiveSession: async (userId: string): Promise<{ session: DetailedWorkoutSession | null; elapsedSeconds: number }> => {
    const { data } = await apiClient.get(`/trainers/me/members/${userId}/workouts/active`)
    return data
  },
  startOverseeing: async (userId: string): Promise<{ isOverseen: boolean }> => {
    const { data } = await apiClient.post(`/trainers/me/members/${userId}/workouts/oversee`)
    return data
  },
  stopOverseeing: async (userId: string): Promise<{ isOverseen: boolean }> => {
    const { data } = await apiClient.delete(`/trainers/me/members/${userId}/workouts/oversee`)
    return data
  },
  /**
   * Paginated session history, newest first. Admins reach this too: the mount
   * is `buildWorkoutRouter(["trainer", "admin"], subjectIsMember)` and the
   * roster ownership check only runs for `role === "trainer"`.
   */
  getHistory: async (
    userId: string,
    params?: { limit?: number; cursor?: string; from?: string; to?: string },
  ): Promise<{ workouts: WorkoutHistoryEntry[]; nextCursor: string | null }> => {
    const { data } = await apiClient.get(
      `/trainers/me/members/${userId}/workouts/me/history`,
      { params },
    )
    return data
  },
  getStats: async (userId: string): Promise<WorkoutStats> => {
    const { data } = await apiClient.get(`/trainers/me/members/${userId}/workouts/me/stats`)
    return data
  },
  /** Full session with exercises and sets — used to expand one row of the journey. */
  getSessionById: async (userId: string, sessionId: string): Promise<DetailedWorkoutSession> => {
    const { data } = await apiClient.get(`/trainers/me/members/${userId}/workouts/${sessionId}`)
    return data
  },
  getTodaySession: async (userId: string): Promise<DetailedWorkoutSession> => {
    const { data } = await apiClient.get(`/trainers/me/members/${userId}/workouts/today`)
    return data
  },
  createSession: async (userId: string, payload?: { notes?: string; planId?: string; exercises?: any[] }): Promise<DetailedWorkoutSession> => {
    const { data } = await apiClient.post(`/trainers/me/members/${userId}/workouts`, payload ?? {})
    return data
  },
  updateSession: async (userId: string, sessionId: string, payload: { status?: 'Active' | 'Completed' | 'Cancelled'; notes?: string }): Promise<DetailedWorkoutSession> => {
    const { data } = await apiClient.patch(`/trainers/me/members/${userId}/workouts/${sessionId}`, payload)
    return data
  },
  addExerciseToSession: async (
    userId: string,
    sessionId: string,
    payload: {
      exerciseId: string
      section: string
      targetSets: number
      targetReps: number
      targetWeightKg?: number
      restSeconds: number
      notes?: string
    }
  ): Promise<DetailedWorkoutExercise> => {
    const { data } = await apiClient.post(`/trainers/me/members/${userId}/workouts/${sessionId}/exercises`, payload)
    return data
  },
  updateWorkoutExercise: async (
    userId: string,
    sessionId: string,
    workoutExerciseId: string,
    payload: { isCompleted?: boolean; notes?: string; targetSets?: number; targetReps?: number; targetWeightKg?: number; section?: string }
  ): Promise<DetailedWorkoutExercise> => {
    const { data } = await apiClient.patch(`/trainers/me/members/${userId}/workouts/${sessionId}/exercises/${workoutExerciseId}`, payload)
    return data
  },
  deleteWorkoutExercise: async (userId: string, sessionId: string, workoutExerciseId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/trainers/me/members/${userId}/workouts/${sessionId}/exercises/${workoutExerciseId}`)
    return data
  },
  logSet: async (
    userId: string,
    sessionId: string,
    workoutExerciseId: string,
    payload: {
      actualReps: number
      actualWeightKg: number
      rpe?: number
      isWarmup?: boolean
      notes?: string
    }
  ): Promise<LoggedSet & { exerciseCompleted: boolean; setsRemaining: number }> => {
    const { data } = await apiClient.post(`/trainers/me/members/${userId}/workouts/${sessionId}/exercises/${workoutExerciseId}/sets`, payload)
    return data
  },
  updateSet: async (
    userId: string,
    sessionId: string,
    workoutExerciseId: string,
    setId: string,
    payload: {
      actualReps?: number
      actualWeightKg?: number
      rpe?: number
      isWarmup?: boolean
      notes?: string
    }
  ): Promise<LoggedSet> => {
    const { data } = await apiClient.patch(`/trainers/me/members/${userId}/workouts/${sessionId}/exercises/${workoutExerciseId}/sets/${setId}`, payload)
    return data
  },
  deleteSet: async (userId: string, sessionId: string, workoutExerciseId: string, setId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/trainers/me/members/${userId}/workouts/${sessionId}/exercises/${workoutExerciseId}/sets/${setId}`)
    return data
  },
  getUserAssignment: async (userId: string): Promise<any> => {
    const { data } = await apiClient.get(`/workout-plans/assignments/user/${userId}`)
    return data
  },
  updateUserDayExercises: async (
    userId: string,
    dayNumber: number,
    payload: { isRestDay?: boolean; exercises: any[] }
  ): Promise<any> => {
    const { data } = await apiClient.patch(`/workout-plans/assignments/user/${userId}/days/${dayNumber}`, payload)
    return data
  },
}
