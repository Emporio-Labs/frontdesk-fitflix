import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  serviceService,
  CreateServicePayload,
  UpdateServicePayload,
} from '@/lib/services/service.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.all(),
    queryFn: serviceService.getAll,
    select: (data) => data.services,
  })
}

export function useService(id: string) {
  return useQuery({
    queryKey: queryKeys.services.detail(id),
    queryFn: () => serviceService.getById(id),
    select: (data) => data.service,
    enabled: !!id,
  })
}

export function useCreateService() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateServicePayload) => serviceService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.services.all() })
      toast.success(data.message || 'Service created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create service')
    },
  })
}

export function useUpdateService() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateServicePayload }) =>
      serviceService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.services.all() })
      qc.invalidateQueries({ queryKey: queryKeys.services.detail(data.service.id) })
      toast.success(data.message || 'Service updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update service')
    },
  })
}

export function useDeleteService() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => serviceService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.services.all() })
      toast.success(data.message || 'Service deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete service')
    },
  })
}
