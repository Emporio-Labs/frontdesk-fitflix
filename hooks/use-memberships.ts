import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  membershipService,
  CreateMembershipPayload,
  UpdateMembershipPayload,
  buildRenewalReminders,
} from '@/lib/services/membership.service'
import { useUsers } from '@/hooks/use-users'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useMemberships() {
  return useQuery({
    queryKey: queryKeys.memberships.all(),
    queryFn: membershipService.getAll,
    select: (data) => data.memberships,
  })
}

/**
 * Members whose membership expires in the current IST month, bucketed for
 * renewal calls. Joins the memberships list with the users list client-side —
 * no dedicated backend endpoint. `isLoading`/`isError` reflect either query.
 */
export function useRenewalReminders() {
  const memberships = useMemberships()
  const users = useUsers()

  const data = useMemo(
    () => buildRenewalReminders(memberships.data ?? [], users.data ?? []),
    [memberships.data, users.data]
  )

  return {
    data,
    isLoading: memberships.isLoading || users.isLoading,
    isError: memberships.isError || users.isError,
    refetch: () => Promise.all([memberships.refetch(), users.refetch()]),
  }
}

export function useMyMemberships() {
  return useQuery({
    queryKey: queryKeys.memberships.mine(),
    queryFn: membershipService.getMine,
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

export function usePauseMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      membershipService.pause(id, reason),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.memberships.all() })
      toast.success(data.message || 'Membership frozen')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to freeze membership'),
  })
}

export function useResumeMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => membershipService.resume(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.memberships.all() })
      // Surface a capped credit explicitly — the member will otherwise notice
      // the shortfall themselves and the desk won't know why.
      if (data.cappedBy) {
        toast.warning(
          `Resumed. ${data.creditedDays} of ${data.pausedDays} frozen days credited (capped at the ${data.cappedBy}-day allowance).`
        )
      } else {
        toast.success(data.message || 'Membership resumed')
      }
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to resume membership'),
  })
}
