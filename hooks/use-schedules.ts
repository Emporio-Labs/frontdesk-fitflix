import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  scheduleService,
  CreateSchedulePayload,
  UpdateSchedulePayload,
} from '@/lib/services/schedule.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useMySchedule() {
  return useQuery({
    queryKey: queryKeys.schedules.mine(),
    queryFn: scheduleService.getMine,
    select: (data) => data.schedule,
  })
}

export function useSchedule(userId: string) {
  return useQuery({
    queryKey: queryKeys.schedules.user(userId),
    queryFn: () => scheduleService.getByUserId(userId),
    select: (data) => data.schedule,
    enabled: !!userId,
  })
}

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSchedulePayload) => scheduleService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.schedules.mine() })
      toast.success(data.message || 'Schedule created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create schedule')
    },
  })
}

export function useUpdateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateSchedulePayload }) =>
      scheduleService.update(userId, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.schedules.user(data.schedule.user._id) })
      toast.success(data.message || 'Schedule updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update schedule')
    },
  })
}

export function useReschedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, newScheduledDate }: { userId: string; newScheduledDate: string }) =>
      scheduleService.reschedule(userId, newScheduledDate),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.schedules.user(data.schedule.user._id) })
      toast.success(data.message || 'Schedule rescheduled successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reschedule — must be within 7 days')
    },
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => scheduleService.delete(userId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.schedules.mine() })
      toast.success(data.message || 'Schedule deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete schedule')
    },
  })
}
