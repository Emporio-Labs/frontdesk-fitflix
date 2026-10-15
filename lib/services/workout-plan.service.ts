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

export interface WorkoutPlanListFilters {
  page?: number
  limit?: number
  status?: string
  goal?: string
  difficulty?: string
  isTemplate?: boolean
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

/** One problem in an uploaded plan workbook. `row` is the 1-based Excel row. */
export interface PlanImportIssue {
  sheet: string
  row?: number
  column?: string
  message: string
}

export interface PlanImportSummary {
  days: number
  trainingDays: number
  restDays: number
  exercises: number
}

/** Parsed plan returned by a dry-run import (exercise names already resolved). */
export interface PlanImportPreviewPlan {
  name: string
  description: string
  difficulty: string
  duration: number
  goal: string
  splitType: string
  status: string
  isTemplate: boolean
  templateCategory: string | null
  days: Array<{
    dayNumber: number
    name: string
    isRestDay: boolean
    exercises: Array<{
      exerciseId: string
      exerciseName: string
      section: string
      targetSets: number
      targetReps: number
      targetWeightKg: number
      restSeconds: number
      durationSeconds: number | null
      notes: string | null
    }>
  }>
}

export interface PlanImportPreview {
  valid: boolean
  plan: PlanImportPreviewPlan | null
  errors: PlanImportIssue[]
  warnings: PlanImportIssue[]
  summary: PlanImportSummary | null
}

/**
 * `POST /workout-plans/:id/assign`. `skipped` = the member was already on this
 * plan (active — kept as is) or was put back on it; `failed` carries per-member
 * errors. Assigning replaces any other active plan the member had.
 */
export interface AssignUsersResult {
  planId: string
  startDate: string
  created: string[]
  skipped: string[]
  failed: Array<{ userId: string; error: string }>
}

export interface PlanImportResult {
  message: string
  plan: WorkoutPlan
  warnings: PlanImportIssue[]
  summary: PlanImportSummary
}

const excelForm = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return form
}

export const workoutPlanService = {
  getAll: async (filters?: WorkoutPlanListFilters): Promise<WorkoutPlanListResponse> => {
    const params: Record<string, string | number> = {}
    if (filters?.page) params.page = filters.page
    if (filters?.limit) params.limit = filters.limit
    if (filters?.status) params.status = filters.status
    if (filters?.goal) params.goal = filters.goal
    if (filters?.difficulty) params.difficulty = filters.difficulty
    if (filters?.isTemplate !== undefined) params.isTemplate = String(filters.isTemplate)

    const { data } = await apiClient.get('/workout-plans', { params })
    return data
  },

  /**
   * Every matching plan. The API pages at 20 by default (100 max), and lists
   * that called it without a limit silently stopped at 20.
   */
  getAllPages: async (
    filters?: Omit<WorkoutPlanListFilters, 'page' | 'limit'>
  ): Promise<WorkoutPlanListResponse> => {
    const first = await workoutPlanService.getAll({ ...filters, page: 1, limit: 100 })
    const totalPages = first.pagination?.totalPages ?? 1
    if (totalPages <= 1) return first
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        workoutPlanService.getAll({ ...filters, page: i + 2, limit: 100 })
      )
    )
    return {
      plans: [first, ...rest].flatMap((r) => r.plans),
      pagination: { ...first.pagination, page: 1, totalPages: 1 },
    }
  },

  /** Excel template (.xlsx) including the caller's exercise library. */
  downloadImportTemplate: async (): Promise<Blob> => {
    const { data } = await apiClient.get('/workout-plans/import/template', {
      responseType: 'blob',
    })
    return data
  },

  /** The saved plan as a filled import template (.xlsx). */
  exportToExcel: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get(`/workout-plans/${id}/export`, {
      responseType: 'blob',
    })
    return data
  },

  /** Parse + validate an uploaded workbook without saving anything. */
  previewImport: async (file: File): Promise<PlanImportPreview> => {
    const { data } = await apiClient.post('/workout-plans/import', excelForm(file), {
      params: { dryRun: 'true' },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** Create the plan from the workbook. 400 carries `details.errors`. */
  importFromExcel: async (file: File): Promise<PlanImportResult> => {
    const { data } = await apiClient.post('/workout-plans/import', excelForm(file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
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
  ): Promise<AssignUsersResult> => {
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
