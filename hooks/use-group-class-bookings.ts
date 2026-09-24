import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groupClassBookingService } from '@/lib/services/group-class-booking.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useGroupClassBookings(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.groupClassBookings.all(),
    queryFn: groupClassBookingService.getAll,
    select: (data) => data.bookings,
    refetchInterval: options?.refetchInterval,
  })
}

export function useUpdateGroupClassBookingStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      groupClassBookingService.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.groupClassBookings.all() })
      qc.invalidateQueries({ queryKey: ['credits'] })
      const label =
        variables.status === 'completed'
          ? 'Marked attended'
          : variables.status === 'noshow'
          ? 'Marked no-show'
          : `Status set to ${variables.status}`
      toast.success(label)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update class booking')
    },
  })
}
