import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  workoutPlanService,
  WorkoutPlanListParams,
} from '@/lib/services/workout-plan.service'
import type {
  CreateWorkoutPlanPayload,
  UpdateWorkoutPlanPayload,
} from '@/types/workout'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useWorkoutPlans(params?: WorkoutPlanListParams) {
  return useQuery({
    queryKey: queryKeys.workoutPlans.list(params),
    queryFn: () => workoutPlanService.list(params),
  })
}

export function useWorkoutPlan(id: string) {
  return useQuery({
    queryKey: queryKeys.workoutPlans.detail(id),
    queryFn: () => workoutPlanService.getById(id),
    enabled: !!id,
  })
}

export function useCreateWorkoutPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateWorkoutPlanPayload) =>
      workoutPlanService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.all() })
      toast.success('Workout plan created')
    },
    onError: (err: any) => {
      console.error('Create Plan Error:', err?.response?.data || err)
      const details = err?.response?.data?.details
      const detailsMsg = Array.isArray(details)
        ? details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ')
        : ''
      const errorMsg = err?.response?.data?.error || 'Failed to create plan'
      toast.error(detailsMsg ? `${errorMsg} (${detailsMsg})` : errorMsg)
    },
  })
}

export function useUpdateWorkoutPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateWorkoutPlanPayload
    }) => workoutPlanService.update(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.all() })
      qc.invalidateQueries({
        queryKey: queryKeys.workoutPlans.detail(variables.id),
      })
      toast.success('Plan updated')
    },
    onError: (err: any) => {
      console.error('Update Plan Error:', err?.response?.data || err)
      const details = err?.response?.data?.details
      const detailsMsg = Array.isArray(details)
        ? details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ')
        : ''
      const errorMsg = err?.response?.data?.error || 'Failed to update plan'
      toast.error(detailsMsg ? `${errorMsg} (${detailsMsg})` : errorMsg)
    },
  })
}

export function useDeleteWorkoutPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workoutPlanService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.all() })
      toast.success(data.message || 'Plan deleted')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete plan')
    },
  })
}

export function useAssignPlanUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      userIds,
      startDate,
    }: {
      id: string
      userIds: string[]
      startDate?: string
    }) => workoutPlanService.assignUsers(id, { userIds, startDate }),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.workoutPlans.detail(variables.id),
      })
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.all() })

      const createdCount = data.created.length
      const skippedCount = data.skipped.length
      const failedCount = data.failed.length
      const startDateStr = data.startDate
        ? new Date(data.startDate).toLocaleDateString()
        : ''

      const parts: string[] = []
      if (createdCount > 0)
        parts.push(`Assigned to ${createdCount} member${createdCount === 1 ? '' : 's'}`)
      if (skippedCount > 0)
        parts.push(`${skippedCount} already had this plan`)
      if (failedCount > 0)
        parts.push(`${failedCount} failed`)

      const msg = parts.length > 0 ? parts.join(' · ') : 'No changes'
      const fullMsg = startDateStr ? `${msg} (starting ${startDateStr})` : msg

      if (failedCount > 0) toast.warning(fullMsg)
      else toast.success(fullMsg)
    },
    onError: (err: any) => {
      console.error('Assign Users Error:', err?.response?.data || err)
      const details = err?.response?.data?.details
      const detailsMsg = Array.isArray(details)
        ? details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ')
        : ''
      const errorMsg = err?.response?.data?.error || 'Failed to assign users'
      toast.error(detailsMsg ? `${errorMsg} (${detailsMsg})` : errorMsg)
    },
  })
}
