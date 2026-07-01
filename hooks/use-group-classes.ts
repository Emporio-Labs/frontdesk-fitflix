import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  groupClassService,
  CreateGroupClassPayload,
  UpdateGroupClassPayload,
} from '@/lib/services/group-class.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useGroupClasses() {
  return useQuery({
    queryKey: queryKeys.groupClasses.all(),
    queryFn: groupClassService.getAll,
    select: (data) => data.groupClasses,
  })
}

export function useCreateGroupClass() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateGroupClassPayload) => groupClassService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.groupClasses.all() })
      toast.success(data.message || 'Group class created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create group class')
    },
  })
}

export function useUpdateGroupClass() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGroupClassPayload }) =>
      groupClassService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.groupClasses.all() })
      toast.success(data.message || 'Group class updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update group class')
    },
  })
}

export function useDeleteGroupClass() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => groupClassService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.groupClasses.all() })
      toast.success(data.message || 'Group class deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete group class')
    },
  })
}
