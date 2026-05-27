import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workoutPlanService } from '@/lib/services/workout-plan.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'
import type {
  CreateWorkoutPlanPayload,
  UpdateWorkoutPlanPayload,
  BatchUpdateSchedulePayload,
} from '@/lib/services/workout-plan.service'

export function useWorkoutPlans(filters?: { page?: number; limit?: number; status?: string; goal?: string; difficulty?: string }) {
  return useQuery({
    queryKey: queryKeys.workoutPlans.list(filters),
    queryFn: () => workoutPlanService.getAll(filters),
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
    mutationFn: (payload: CreateWorkoutPlanPayload) => workoutPlanService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.all() })
      toast.success('Workout plan created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create workout plan')
    },
  })
}

export function useUpdateWorkoutPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWorkoutPlanPayload }) =>
      workoutPlanService.update(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.all() })
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.detail(variables.id) })
      toast.success('Workout plan updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update workout plan')
    },
  })
}

export function useDeleteWorkoutPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workoutPlanService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.all() })
      toast.success('Workout plan deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete workout plan')
    },
  })
}

export function useAssignWorkoutPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { userIds: string[]; startDate?: string } }) =>
      workoutPlanService.assignUsers(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.all() })
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.assignments.all() })
      toast.success('Users assigned to workout plan')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to assign users')
    },
  })
}

export function useMyWorkoutAssignment() {
  return useQuery({
    queryKey: queryKeys.workoutPlans.assignments.mine(),
    queryFn: () => workoutPlanService.getMyAssignment(),
  })
}

export function useTodayWorkoutAssignment() {
  return useQuery({
    queryKey: queryKeys.workoutPlans.assignments.today(),
    queryFn: () => workoutPlanService.getTodayAssignment(),
  })
}

export function useWorkoutAssignmentForDay(dayNumber: number) {
  return useQuery({
    queryKey: ['workout-plans', 'assignments', 'day', dayNumber],
    queryFn: () => workoutPlanService.getAssignmentForDay(dayNumber),
    enabled: dayNumber > 0,
  })
}

export function useAssignmentSchedule(filters?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: queryKeys.workoutPlans.assignments.schedule(filters?.from, filters?.to),
    queryFn: () => workoutPlanService.getAssignmentSchedule(filters),
  })
}

export function useCompleteWorkoutDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { dayNumber: number; sessionId: string }) =>
      workoutPlanService.completeDay(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.assignments.all() })
      toast.success('Workout day completed')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to complete workout day')
    },
  })
}

export function useSwapWorkoutDays() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { dayNumberA: number; dayNumberB: number }) =>
      workoutPlanService.swapDays(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.assignments.all() })
      toast.success('Workout days swapped')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to swap workout days')
    },
  })
}

export function useBatchUpdateWorkoutSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: string; payload: BatchUpdateSchedulePayload }) =>
      workoutPlanService.batchUpdateSchedule(assignmentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutPlans.assignments.all() })
      toast.success('Workout schedule updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update schedule')
    },
  })
}
