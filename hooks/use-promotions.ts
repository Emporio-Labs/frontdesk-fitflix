import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLocationScope } from '@/components/location-scope-provider'
import { queryKeys } from '@/lib/query-keys'
import {
  CreatePromotionPayload,
  UpdatePromotionPayload,
  promotionService,
} from '@/lib/services/promotion.service'

/**
 * Promotions are per-branch, so every key here goes through `scopedKey`.
 *
 * Without it, switching branches would serve branch A's promotions from cache
 * under branch B — silent, and indistinguishable from stale data.
 */
export function usePromotions(includeInactive = false) {
  const { scopedKey, selectedLocationId } = useLocationScope()

  return useQuery({
    queryKey: scopedKey(queryKeys.promotions.all(includeInactive)),
    queryFn: () =>
      promotionService.getAll({
        locationId: selectedLocationId,
        includeInactive,
      }),
    select: (data) => data.promotions,
  })
}

export function usePromotion(id: string) {
  return useQuery({
    queryKey: queryKeys.promotions.detail(id),
    queryFn: () => promotionService.getById(id),
    select: (data) => data.promotion,
    enabled: !!id,
  })
}

/**
 * Invalidate every branch's promotion list, not just the active scope.
 *
 * A company-wide promotion (locationId: null) appears in every branch's list,
 * so narrowing this to the current scope would leave the other branches
 * showing a stale copy.
 */
const invalidatePromotions = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ['promotions'] })

export function useCreatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePromotionPayload) =>
      promotionService.create(payload),
    onSuccess: (data) => {
      invalidatePromotions(qc)
      toast.success(data.message || 'Promotion created')
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message || 'Failed to create promotion'
      ),
  })
}

export function useUpdatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdatePromotionPayload
    }) => promotionService.update(id, payload),
    onSuccess: (data) => {
      invalidatePromotions(qc)
      toast.success(data.message || 'Promotion updated')
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message || 'Failed to update promotion'
      ),
  })
}

export function useDeletePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promotionService.remove(id),
    onSuccess: (data) => {
      invalidatePromotions(qc)
      toast.success(data.message || 'Promotion deleted')
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message || 'Failed to delete promotion'
      ),
  })
}
