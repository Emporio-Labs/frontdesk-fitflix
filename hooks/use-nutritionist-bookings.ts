import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nutritionistBookingService } from '@/lib/services/nutritionist-booking.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useNutritionistBookings() {
  return useQuery({
    queryKey: queryKeys.nutritionistBookings.all(),
    queryFn: nutritionistBookingService.getAll,
    select: (data) => data.bookings,
  })
}

export function useAcceptNutritionistBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => nutritionistBookingService.accept(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.nutritionistBookings.all() })
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.all() })
      toast.success(data.message || 'Booking accepted')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to accept booking')
    },
  })
}

export function useRejectNutritionistBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => nutritionistBookingService.reject(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.nutritionistBookings.all() })
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.all() })
      toast.success(data.message || 'Booking rejected')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reject booking')
    },
  })
}
