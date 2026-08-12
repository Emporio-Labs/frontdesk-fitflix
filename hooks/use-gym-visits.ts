import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  gymVisitService,
  type CheckInPayload,
  type CheckOutPayload,
  type GymVisitFilters,
} from '@/lib/services/gym-visit.service'
import { queryKeys } from '@/lib/query-keys'

function extractApiError(err: any, fallback: string): string {
  const msg = err?.response?.data?.message
  if (typeof msg === 'string') return msg
  return err?.response?.data?.error || fallback
}

export function useGymVisits(filters: GymVisitFilters = {}) {
  return useQuery({
    queryKey: queryKeys.gymVisits.all(filters as Record<string, unknown>),
    queryFn: () => gymVisitService.list(filters),
    staleTime: 15_000,
  })
}

export function useCurrentlyIn() {
  return useQuery({
    queryKey: queryKeys.gymVisits.currentlyIn(),
    queryFn: gymVisitService.currentlyIn,
    select: (data) => data.items,
    staleTime: 10_000,
    refetchInterval: 30_000,
  })
}

export function useMyGymVisits(limit = 50) {
  return useQuery({
    queryKey: queryKeys.gymVisits.mine(limit),
    queryFn: () => gymVisitService.getMine(limit),
    select: (data) => data.items,
    staleTime: 30_000,
  })
}

export function useGymVisitAnalytics(range: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.gymVisits.analytics(range as Record<string, unknown>),
    queryFn: () => gymVisitService.getAnalytics(range),
    staleTime: 30_000,
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['gym-visits'] })
}

export function useCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CheckInPayload) => gymVisitService.checkIn(payload),
    onSuccess: (data) => {
      invalidateAll(qc)
      toast.success(data.message)
    },
    onError: (err: any) => {
      toast.error(extractApiError(err, 'Failed to check in member'))
    },
  })
}

export function useQrCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => gymVisitService.qrCheckIn(token),
    onSuccess: (data) => {
      invalidateAll(qc)
      toast.success(data.message)
    },
    onError: (err: any) => {
      const code = err?.response?.data?.code
      if (code === 'INVALID_QR') {
        toast.error('QR code expired — ask the member to refresh it')
        return
      }
      if (code === 'NO_ACTIVE_MEMBERSHIP') {
        toast.error('Member has no active membership')
        return
      }
      toast.error(extractApiError(err, 'Check-in failed'))
    },
  })
}

export function useCheckOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: CheckOutPayload }) =>
      gymVisitService.checkOut(id, payload ?? {}),
    onSuccess: (data) => {
      invalidateAll(qc)
      toast.success(data.message)
    },
    onError: (err: any) => {
      toast.error(extractApiError(err, 'Failed to check out'))
    },
  })
}

export function useDeleteGymVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => gymVisitService.delete(id),
    onSuccess: (data) => {
      invalidateAll(qc)
      toast.success(data.message)
    },
    onError: (err: any) => {
      toast.error(extractApiError(err, 'Failed to delete visit'))
    },
  })
}
