import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  sportsScientistBookingService,
  type AcceptSportsScientistBookingPayload,
  type RejectSportsScientistBookingPayload,
} from '@/lib/services/sports-scientist.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useSportsScientistBookings(status?: string) {
  return useQuery({
    queryKey: status
      ? [...queryKeys.sportsScientistBookings.all(), { status }]
      : queryKeys.sportsScientistBookings.all(),
    queryFn: () => sportsScientistBookingService.getAll(status),
    select: (data) => data.bookings,
  })
}

export function useAcceptSportsScientistBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload?: AcceptSportsScientistBookingPayload
    }) => sportsScientistBookingService.accept(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.sportsScientistBookings.all() })
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.all() })
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      toast.success(data.message || 'Booking accepted')
    },
    onError: (err: any) => {
      const resData = err?.response?.data
      const msg =
        resData?.error || resData?.message || err?.message || 'Failed to accept booking'
      if (err?.response?.status === 409 || resData?.code?.includes('SLOT')) {
        toast.warning(msg, { duration: 5000 })
        qc.invalidateQueries({ queryKey: queryKeys.sportsScientistBookings.all() })
        qc.invalidateQueries({ queryKey: queryKeys.users.all() })
        qc.invalidateQueries({ queryKey: queryKeys.onboarding.all() })
        qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      } else {
        toast.error(msg)
      }
    },
  })
}

export function useRejectSportsScientistBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload?: RejectSportsScientistBookingPayload
    }) => sportsScientistBookingService.reject(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.sportsScientistBookings.all() })
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.all() })
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      toast.success(data.message || 'Booking rejected')
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to reject booking',
      )
    },
  })
}

export function useCompleteSportsScientistBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sportsScientistBookingService.complete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.sportsScientistBookings.all() })
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.all() })
      toast.success(data.message || 'Consultation marked as completed')
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to complete consultation',
      )
    },
  })
}
