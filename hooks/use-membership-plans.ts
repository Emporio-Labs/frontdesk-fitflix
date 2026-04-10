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
