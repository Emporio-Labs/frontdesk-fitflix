import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  groupClassService,
  CreateGroupClassPayload,
  UpdateGroupClassPayload,
} from '@/lib/services/group-class.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

// Surfaces per-field validation reasons from the backend's zod error shape
// ({ message, errors: [{ path, message }] }) instead of only the generic
// "Invalid class payload" / axios "Request failed with status code 400".
function formatApiError(err: any, fallback: string): string {
  const data = err?.response?.data
  const issues = Array.isArray(data?.errors)
    ? data.errors
        .map((i: any) => `${(Array.isArray(i?.path) ? i.path.join('.') : '') || 'field'}: ${i?.message}`)
        .join('; ')
    : ''
  return [data?.message || err?.message || fallback, issues].filter(Boolean).join(' — ')
}

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
      toast.error(formatApiError(err, 'Failed to create group class'))
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

export function useTogglePublishGroupClass() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      groupClassService.togglePublish(id, isPublished),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.groupClasses.all() })
      if (variables.isPublished) {
        toast.success(data.message || 'Class published successfully')
      } else {
        toast.info(data.message || 'Class unpublished (hidden from members)')
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update publish status')
    },
  })
}
