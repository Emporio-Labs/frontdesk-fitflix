import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainerWorkoutService } from '@/lib/services/trainer-workout.service'
import { toast } from 'sonner'

export function useActiveMemberWorkoutSession(userId: string) {
  return useQuery({
    queryKey: ['trainer', 'member-workouts', userId, 'active'],
    queryFn: () => trainerWorkoutService.getActiveSession(userId),
    enabled: !!userId,
    refetchInterval: 10000, // 10s polling for live session sync
  })
}

export function useStartMemberWorkoutSession(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload?: { notes?: string; planId?: string; exercises?: any[] }) =>
      trainerWorkoutService.createSession(userId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', 'member-workouts', userId] })
      toast.success('Workout session started')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to start session')
    },
  })
}

export function useCompleteMemberWorkoutSession(userId: string, sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      trainerWorkoutService.updateSession(userId, sessionId, { status: 'Completed' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', 'member-workouts', userId] })
      toast.success('Workout session completed!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to complete session')
    },
  })
}

export function useAddExerciseToMemberSession(userId: string, sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      exerciseId: string
      section: string
      targetSets: number
      targetReps: number
      targetWeightKg?: number
      restSeconds: number
      notes?: string
    }) => trainerWorkoutService.addExerciseToSession(userId, sessionId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', 'member-workouts', userId] })
      toast.success('Exercise added')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add exercise')
    },
  })
}

export function useLogMemberSet(userId: string, sessionId: string, workoutExerciseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      actualReps: number
      actualWeightKg: number
      rpe?: number
      isWarmup?: boolean
      notes?: string
    }) => trainerWorkoutService.logSet(userId, sessionId, workoutExerciseId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', 'member-workouts', userId] })
      toast.success('Set logged!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to log set')
    },
  })
}

export function useUpdateMemberSet(userId: string, sessionId: string, workoutExerciseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      setId,
      payload,
    }: {
      setId: string
      payload: { actualReps?: number; actualWeightKg?: number; rpe?: number; isWarmup?: boolean; notes?: string }
    }) => trainerWorkoutService.updateSet(userId, sessionId, workoutExerciseId, setId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', 'member-workouts', userId] })
      toast.success('Set updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update set')
    },
  })
}

export function useDeleteMemberSet(userId: string, sessionId: string, workoutExerciseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (setId: string) =>
      trainerWorkoutService.deleteSet(userId, sessionId, workoutExerciseId, setId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', 'member-workouts', userId] })
      toast.success('Set deleted')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete set')
    },
  })
}

export function useDeleteMemberExercise(userId: string, sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (workoutExerciseId: string) =>
      trainerWorkoutService.deleteWorkoutExercise(userId, sessionId, workoutExerciseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', 'member-workouts', userId] })
      toast.success('Exercise removed')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to remove exercise')
    },
  })
}
