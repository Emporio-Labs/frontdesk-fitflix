import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  personalTrainingService,
  ExpertScheduleDto,
} from '@/lib/services/personal-training.service'
import { toast } from 'sonner'

export function usePtTrainers() {
  return useQuery({
    queryKey: ['pt', 'trainers'],
    queryFn: personalTrainingService.getTrainers,
  })
}

export function useTrainerAvailability(trainerId?: string, date?: string) {
  return useQuery({
    queryKey: ['pt', 'availability', trainerId, date],
    queryFn: () => (trainerId && date ? personalTrainingService.getTrainerAvailability(trainerId, date) : []),
    enabled: Boolean(trainerId && date),
  })
}

export function useTrainerSchedule(trainerId?: string) {
  return useQuery({
    queryKey: ['pt', 'schedule', trainerId],
    queryFn: () => (trainerId ? personalTrainingService.getTrainerSchedule(trainerId) : null),
    enabled: Boolean(trainerId),
  })
}

export function useUpdateTrainerSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      trainerId,
      data,
    }: {
      trainerId: string
      data: Partial<ExpertScheduleDto>
    }) => personalTrainingService.updateTrainerSchedule(trainerId, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['pt', 'schedule', variables.trainerId] })
      qc.invalidateQueries({ queryKey: ['pt', 'availability'] })
      toast.success('Trainer availability updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update schedule')
    },
  })
}

export function usePtAdminBookings(filters?: {
  expertId?: string
  date?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['pt', 'admin-bookings', filters],
    queryFn: () => personalTrainingService.getAllBookings(filters),
    refetchInterval: 15_000, // Real-time poll every 15s
  })
}

export function useCompletePtBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      bookingId,
      data,
    }: {
      bookingId: string
      data: {
        workoutNotes?: string
        exercisesCompleted?: Array<{
          name: string
          sets: number
          reps: number
          weight: number
          notes?: string
        }>
        clinicalNotes?: string
      }
    }) => personalTrainingService.completeBooking(bookingId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pt', 'admin-bookings'] })
      toast.success('Session completed and workout log saved')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to complete session')
    },
  })
}

export function useTrainerChangeRequests(enabled: boolean = true) {
  return useQuery({
    queryKey: ['pt', 'trainer-change-requests'],
    queryFn: personalTrainingService.getTrainerChangeRequests,
    enabled,
    refetchInterval: enabled ? 20_000 : false,
  })
}

export function useResolveTrainerChangeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      requestId,
      action,
      adminNotes,
    }: {
      requestId: string
      action: 'APPROVE' | 'REJECT'
      adminNotes?: string
    }) =>
      personalTrainingService.resolveTrainerChangeRequest(requestId, action, adminNotes),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['pt', 'trainer-change-requests'] })
      toast.success(
        `Trainer change request ${variables.action === 'APPROVE' ? 'approved' : 'rejected'}`
      )
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to resolve request')
    },
  })
}
