import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groupClassBookingService } from '@/lib/services/group-class-booking.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useGroupClassBooking(id: string) {
  return useQuery({
    queryKey: queryKeys.groupClassBookings.detail(id),
    queryFn: () => groupClassBookingService.getById(id),
    select: (data) => data.booking,
    enabled: Boolean(id),
  })
}

export function useCancelGroupClassBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { adminOverride?: boolean; reason?: string } }) =>
      groupClassBookingService.cancel(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groupClassBookings.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.groupClassBookings.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all() })
      queryClient.invalidateQueries({ queryKey: ['credits'] })
      toast.success('Booking cancelled successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to cancel booking')
    },
  })
}

export function useRescheduleGroupClassBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: { sessionId?: string; bookingDate?: string; startTime?: string; endTime?: string; reason?: string }
    }) => groupClassBookingService.reschedule(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groupClassBookings.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.groupClassBookings.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all() })
      queryClient.invalidateQueries({ queryKey: ['credits'] })
      toast.success('Booking rescheduled successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to reschedule booking')
    },
  })
}
