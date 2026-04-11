import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  bookingService,
  CreateBookingPayload,
  UpdateBookingPayload,
  BookingStatusValue,
} from '@/lib/services/booking.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useBookings() {
  return useQuery({
    queryKey: queryKeys.bookings.all(),
    queryFn: bookingService.getAll,
    select: (data) => data.bookings,
  })
}

export function useMyBookings() {
  return useQuery({
    queryKey: queryKeys.bookings.mine(),
    queryFn: bookingService.getMine,
    select: (data) => data.bookings,
  })
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: () => bookingService.getById(id),
    select: (data) => data.booking,
    enabled: !!id,
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => bookingService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings.all() })
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      qc.invalidateQueries({ queryKey: ['credits'] })

      const consumed = data?.credits?.consumed
      const bypassed = data?.booking?.creditsBypassed ?? data?.credits?.bypassed

      if (bypassed) {
        toast.success('Booking created. Credits were bypassed for this booking.')
        return
      }

      if (typeof consumed === 'number') {
        toast.success(
          `Booking created. ${consumed} credit${consumed === 1 ? '' : 's'} consumed.`
        )
        return
      }

      toast.success(data.message || 'Booking created successfully')
    },
    onError: (err: any) => {
      const status = err?.response?.status

      if (status === 409) {
        qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
        toast.error('That slot just got filled. Availability has been refreshed.')
        return
      }

      if (status === 402) {
        toast.error('Insufficient credits for this booking.')
        return
      }

      toast.error(err?.response?.data?.message || 'Failed to create booking')
    },
  })
}

export function useUpdateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBookingPayload }) =>
      bookingService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings.all() })
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      toast.success(data.message || 'Booking updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update booking')
    },
  })
}

export function useDeleteBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bookingService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings.all() })
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      qc.invalidateQueries({ queryKey: ['credits'] })
      toast.success(data.message || 'Booking deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete booking')
    },
  })
}

export function useChangeBookingStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatusValue }) =>
      bookingService.changeStatus(id, status),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings.all() })
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      qc.invalidateQueries({ queryKey: ['credits'] })

      if (variables.status === 2) {
        const refunded = data?.credits?.refunded ?? 0

        if (refunded > 0) {
          toast.success(
            `Booking cancelled. ${refunded} credit${refunded === 1 ? '' : 's'} refunded.`
          )
          return
        }

        toast.success('Booking already cancelled. No additional refund was applied.')
        return
      }

      toast.success(data.message || 'Booking status updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update booking status')
    },
  })
}
