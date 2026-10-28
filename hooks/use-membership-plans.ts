import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  membershipPlanService,
  CreateMembershipPlanPayload,
  UpdateMembershipPlanPayload,
} from '@/lib/services/membership-plan.service'
import { queryKeys } from '@/lib/query-keys'

export function useMembershipPlans() {
  const gymId = process.env.NEXT_PUBLIC_GYM_ID || 'default-gym'

  return useQuery({
    queryKey: [...queryKeys.membershipPlans.all(), gymId],
    queryFn: () => membershipPlanService.getAll(gymId),
    select: (data) => data.plans,
  })
}

/**
 * Active plans sellable at one branch, still within `availableUntil`,
 * founding plans first. Filters client-side too, so a backend that ignores
 * `?locationId=` still yields only this branch's and all-branch plans.
 */
export function useMembershipPlansForLocation(locationId: string | null) {
  return useQuery({
    queryKey: queryKeys.membershipPlans.forLocation(locationId ?? ''),
    queryFn: () => membershipPlanService.getForLocation(locationId as string),
    enabled: !!locationId,
    select: (data) => {
      const today = new Date().toISOString().slice(0, 10)
      return data.plans
        .filter((p) => p.status === 'Active')
        .filter((p) => !p.locationId || p.locationId === locationId)
        .filter((p) => !p.availableUntil || p.availableUntil.slice(0, 10) >= today)
        .sort((a, b) => Number(b.isFounding) - Number(a.isFounding) || a.totalPrice - b.totalPrice)
    },
  })
}

export function useMembershipPlan(id: string) {
  return useQuery({
    queryKey: queryKeys.membershipPlans.detail(id),
    queryFn: () => membershipPlanService.getById(id),
    select: (data) => data.plan,
    enabled: !!id,
  })
}

export function useCreateMembershipPlan() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateMembershipPlanPayload) => membershipPlanService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.membershipPlans.all() })
      toast.success(data.message || 'Membership plan created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create membership plan')
    },
  })
}

export function useUpdateMembershipPlan() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMembershipPlanPayload }) =>
      membershipPlanService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.membershipPlans.all() })
      qc.invalidateQueries({ queryKey: queryKeys.membershipPlans.detail(data.plan.id) })
      toast.success(data.message || 'Membership plan updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update membership plan')
    },
  })
}

export function useDeleteMembershipPlan() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => membershipPlanService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.membershipPlans.all() })
      toast.success(data.message || 'Membership plan deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete membership plan')
    },
  })
}
