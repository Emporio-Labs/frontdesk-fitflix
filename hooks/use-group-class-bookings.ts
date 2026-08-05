import { useQuery } from '@tanstack/react-query'
import { groupClassBookingService } from '@/lib/services/group-class-booking.service'
import { queryKeys } from '@/lib/query-keys'

export function useGroupClassBookings() {
  return useQuery({
    queryKey: queryKeys.groupClassBookings.all(),
    queryFn: groupClassBookingService.getAll,
    select: (data) => data.bookings,
  })
}
