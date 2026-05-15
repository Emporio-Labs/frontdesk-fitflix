import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { exerciseService } from '@/lib/services/exercise.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'
import type {
  ExerciseFilters,
  CreateExercisePayload,
  UpdateExercisePayload,
} from '@/types/workout'

export function useExercises(filters?: ExerciseFilters) {
  return useQuery({
    queryKey: queryKeys.exercises.list(filters),
    queryFn: () => exerciseService.getAll(filters),
  })
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: queryKeys.exercises.detail(id),
    queryFn: () => exerciseService.getById(id),
    enabled: !!id,
  })
}

export function useCreateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateExercisePayload) => exerciseService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.exercises.all() })
      toast.success('Exercise created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create exercise')
    },
  })
}

export function useUpdateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateExercisePayload }) =>
      exerciseService.update(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.exercises.all() })
      qc.invalidateQueries({ queryKey: queryKeys.exercises.detail(variables.id) })
      toast.success('Exercise updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update exercise')
    },
  })
}

export function useDeleteExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => exerciseService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.exercises.all() })
      toast.success(data.message || 'Exercise deleted')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete exercise')
    },
  })
}
