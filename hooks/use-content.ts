import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query-keys'
import {
  CreateContentOverridePayload,
  UpdateContentOverridePayload,
  contentService,
} from '@/lib/services/content.service'

/**
 * Copy overrides are global, not branch-scoped: the app fetches one map for
 * everybody, so these keys deliberately skip `scopedKey`.
 */
export function useContentOverrides() {
  return useQuery({
    queryKey: queryKeys.content.all(),
    queryFn: () => contentService.getAll(),
    select: (data) => data.overrides,
  })
}

const invalidate = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ['content'] })

export function useCreateContentOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateContentOverridePayload) =>
      contentService.create(payload),
    onSuccess: () => {
      invalidate(qc)
      toast.success('Override saved — live in the app within a minute')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to save override'),
  })
}

export function useUpdateContentOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateContentOverridePayload
    }) => contentService.update(id, payload),
    onSuccess: () => {
      invalidate(qc)
      toast.success('Override updated — live in the app within a minute')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to update override'),
  })
}

export function useDeleteContentOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contentService.remove(id),
    onSuccess: () => {
      invalidate(qc)
      // Says what deleting actually does, since "deleted" reads as "the text
      // is gone from the app" when it means the opposite.
      toast.success("Removed — the app's built-in wording is back")
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to remove override'),
  })
}
