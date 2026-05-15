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
      toast.error(err?.response?.data?.error || 'Failed to create plan')
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
      toast.error(err?.response?.data?.error || 'Failed to update plan')
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
    mutationFn: ({ id, userIds }: { id: string; userIds: string[] }) =>
      workoutPlanService.assignUsers(id, userIds),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.workoutPlans.detail(variables.id),
      })
      toast.success('Users assigned')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to assign users')
    },
  })
}
