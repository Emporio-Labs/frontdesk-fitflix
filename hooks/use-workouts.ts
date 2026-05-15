import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  workoutService,
  WorkoutSessionListParams,
  WorkoutHistoryParams,
  CreateSessionPayload,
  UpdateSessionPayload,
  AddExercisePayload,
  UpdateWorkoutExercisePayload,
  LogSetPayload,
  UpdateSetPayload,
} from '@/lib/services/workout.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useWorkoutToday() {
  return useQuery({
    queryKey: queryKeys.workoutSessions.today(),
    queryFn: workoutService.getToday,
  })
}

export function useWorkoutSessions(params?: WorkoutSessionListParams) {
  return useQuery({
    queryKey: queryKeys.workoutSessions.mine(params),
    queryFn: () => workoutService.getMySessions(params),
  })
}

export function useWorkoutSession(id: string) {
  return useQuery({
    queryKey: queryKeys.workoutSessions.detail(id),
    queryFn: () => workoutService.getById(id),
    enabled: !!id,
  })
}

export function useWorkoutStats() {
  return useQuery({
    queryKey: queryKeys.workoutSessions.stats(),
    queryFn: workoutService.getStats,
  })
}

export function useWorkoutHistory(params?: WorkoutHistoryParams) {
  return useQuery({
    queryKey: queryKeys.workoutSessions.history(params),
    queryFn: () => workoutService.getHistory(params),
  })
}

export function useCreateWorkoutSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSessionPayload) =>
      workoutService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutSessions.all() })
      toast.success('Workout session created')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create session')
    },
  })
}

export function useUpdateWorkoutSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateSessionPayload
    }) => workoutService.update(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutSessions.all() })
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.detail(variables.id),
      })
      if (variables.payload.status === 'Completed') {
        toast.success('Workout completed!')
      } else {
        toast.success('Session updated')
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update session')
    },
  })
}

export function useDeleteWorkoutSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workoutService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutSessions.all() })
      toast.success(data.message || 'Session deleted')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete session')
    },
  })
}

export function useAddWorkoutExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string
      payload: AddExercisePayload
    }) => workoutService.addExercise(sessionId, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.detail(variables.sessionId),
      })
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.today(),
      })
      toast.success('Exercise added')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to add exercise')
    },
  })
}

export function useUpdateWorkoutExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sessionId,
      id,
      payload,
    }: {
      sessionId: string
      id: string
      payload: UpdateWorkoutExercisePayload
    }) => workoutService.updateExercise(sessionId, id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.detail(variables.sessionId),
      })
      toast.success('Exercise updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update exercise')
    },
  })
}

export function useRemoveWorkoutExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sessionId,
      id,
    }: {
      sessionId: string
      id: string
    }) => workoutService.removeExercise(sessionId, id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.detail(variables.sessionId),
      })
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.today(),
      })
      toast.success('Exercise removed')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to remove exercise')
    },
  })
}

export function useReorderWorkoutExercises() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sessionId,
      order,
    }: {
      sessionId: string
      order: string[]
    }) => workoutService.reorderExercises(sessionId, order),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.detail(variables.sessionId),
      })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to reorder exercises')
    },
  })
}

export function useLogSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sessionId,
      exerciseId,
      payload,
    }: {
      sessionId: string
      exerciseId: string
      payload: LogSetPayload
    }) => workoutService.logSet(sessionId, exerciseId, payload),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.detail(variables.sessionId),
      })
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.today(),
      })
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.stats(),
      })
      if (data.exerciseCompleted) {
        toast.success('Exercise completed!')
      } else {
        toast.success(`Set logged — ${data.setsRemaining} set${data.setsRemaining === 1 ? '' : 's'} remaining`)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to log set')
    },
  })
}

export function useUpdateSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sessionId,
      exerciseId,
      setId,
      payload,
    }: {
      sessionId: string
      exerciseId: string
      setId: string
      payload: UpdateSetPayload
    }) => workoutService.updateSet(sessionId, exerciseId, setId, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.detail(variables.sessionId),
      })
      toast.success('Set updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update set')
    },
  })
}

export function useDeleteSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sessionId,
      exerciseId,
      setId,
    }: {
      sessionId: string
      exerciseId: string
      setId: string
    }) => workoutService.deleteSet(sessionId, exerciseId, setId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.detail(variables.sessionId),
      })
      qc.invalidateQueries({
        queryKey: queryKeys.workoutSessions.stats(),
      })
      toast.success('Set deleted')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete set')
    },
  })
}
