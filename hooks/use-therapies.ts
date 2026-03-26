import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  therapyService,
  CreateTherapyPayload,
  UpdateTherapyPayload,
} from '@/lib/services/therapy.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useTherapies() {
  return useQuery({
    queryKey: queryKeys.therapies.all(),
    queryFn: therapyService.getAll,
    select: (data) => data.therapies,
  })
}

export function useTherapy(id: string) {
  return useQuery({
    queryKey: queryKeys.therapies.detail(id),
    queryFn: () => therapyService.getById(id),
    select: (data) => data.therapy,
    enabled: !!id,
  })
}

export function useCreateTherapy() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateTherapyPayload) => therapyService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.therapies.all() })
      toast.success(data.message || 'Therapy created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create therapy')
    },
  })
}

export function useUpdateTherapy() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTherapyPayload }) =>
      therapyService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.therapies.all() })
      qc.invalidateQueries({ queryKey: queryKeys.therapies.detail(data.therapy.id) })
      toast.success(data.message || 'Therapy updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update therapy')
    },
  })
}

export function useDeleteTherapy() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => therapyService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.therapies.all() })
      toast.success(data.message || 'Therapy deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete therapy')
    },
  })
}
