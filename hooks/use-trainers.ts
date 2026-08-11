import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainerService, CreateTrainerPayload, UpdateTrainerPayload } from '@/lib/services/trainer.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useTrainers() {
  return useQuery({
    queryKey: queryKeys.trainers.all(),
    queryFn: trainerService.getAll,
    select: (data) => data.trainers,
  })
}

export function useTrainer(id: string) {
  return useQuery({
    queryKey: queryKeys.trainers.detail(id),
    queryFn: () => trainerService.getById(id),
    select: (data) => data.trainer,
    enabled: !!id,
  })
}

export function useCreateTrainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTrainerPayload) => trainerService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.trainers.all() })
      toast.success(data.message || 'Trainer created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create trainer')
    },
  })
}

export function useUpdateTrainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTrainerPayload }) =>
      trainerService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.trainers.all() })
      qc.invalidateQueries({ queryKey: queryKeys.trainers.detail(data.trainer._id) })
      toast.success(data.message || 'Trainer updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update trainer')
    },
  })
}

export function useDeleteTrainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => trainerService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.trainers.all() })
      toast.success(data.message || 'Trainer deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete trainer')
    },
  })
}

export function usePublicTrainers() {
  return useQuery({
    queryKey: queryKeys.trainers.publicAll(),
    queryFn: trainerService.getPublicAll,
    select: (data) => data.trainers,
  })
}

export function usePublicTrainer(id: string) {
  return useQuery({
    queryKey: queryKeys.trainers.publicDetail(id),
    queryFn: () => trainerService.getPublicById(id),
    select: (data) => data.trainer,
    enabled: !!id,
  })
}

export function useAssignTrainerToUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, trainerId }: { userId: string; trainerId: string | null }) =>
      trainerService.assignTrainerToUser(userId, trainerId),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.users.detail(variables.userId) })
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      qc.invalidateQueries({ queryKey: queryKeys.trainers.all() })
      toast.success(data.message || 'Assigned trainer updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to assign trainer')
    },
  })
}
