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
      toast.success(data.message || 'Booking created successfully')
    },
    onError: (err: any) => {
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
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings.all() })
      toast.success(data.message || 'Booking status updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update booking status')
    },
  })
}
