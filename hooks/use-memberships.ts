import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  membershipService,
  CreateMembershipPayload,
  UpdateMembershipPayload,
} from '@/lib/services/membership.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useMemberships() {
  return useQuery({
    queryKey: queryKeys.memberships.all(),
    queryFn: membershipService.getAll,
    select: (data) => data.memberships,
  })
}

export function useMembership(id: string) {
  return useQuery({
    queryKey: queryKeys.memberships.detail(id),
    queryFn: () => membershipService.getById(id),
    select: (data) => data.membership,
    enabled: !!id,
  })
}

export function useCreateMembership() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateMembershipPayload) => membershipService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.memberships.all() })
      toast.success(data.message || 'Membership created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create membership')
    },
  })
}

export function useUpdateMembership() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMembershipPayload }) =>
      membershipService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.memberships.all() })
      qc.invalidateQueries({ queryKey: queryKeys.memberships.detail(data.membership.id) })
      toast.success(data.message || 'Membership updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update membership')
    },
  })
}

export function useDeleteMembership() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => membershipService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.memberships.all() })
      toast.success(data.message || 'Membership deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete membership')
    },
  })
}
