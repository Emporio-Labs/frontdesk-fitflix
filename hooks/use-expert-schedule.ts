import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  type AppointmentModeValue,
  type ExpertScheduleDto,
  type ExpertTypeValue,
  expertScheduleService,
} from '@/lib/services/expert-schedule.service'

export function useExpertDirectory(expertType: ExpertTypeValue, enabled = true) {
  return useQuery({
    queryKey: ['experts', expertType, 'directory'],
    queryFn: () => expertScheduleService.getDirectory(expertType),
    enabled,
  })
}

export function usePooledAvailability(
  expertType: ExpertTypeValue,
  params: { date?: string; mode?: AppointmentModeValue }
) {
  return useQuery({
    queryKey: ['experts', expertType, 'availability', params.date, params.mode],
    queryFn: () =>
      expertScheduleService.getPooledAvailability(expertType, {
        date: params.date as string,
        mode: params.mode,
      }),
    enabled: Boolean(params.date),
  })
}

export function useExpertSchedule(
  expertType: ExpertTypeValue,
  expertId?: string
) {
  return useQuery({
    queryKey: ['experts', expertType, 'schedule', expertId],
    queryFn: () =>
      expertId ? expertScheduleService.getSchedule(expertType, expertId) : null,
    enabled: Boolean(expertId),
  })
}

export function useUpdateExpertSchedule(expertType: ExpertTypeValue) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      expertId,
      data,
    }: {
      expertId: string
      data: Partial<ExpertScheduleDto>
    }) => expertScheduleService.updateSchedule(expertType, expertId, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ['experts', expertType, 'schedule', variables.expertId],
      })
      qc.invalidateQueries({ queryKey: ['experts', expertType, 'availability'] })
      // The trainer pages read the same schedule through their own key.
      qc.invalidateQueries({ queryKey: ['pt', 'schedule'] })
      qc.invalidateQueries({ queryKey: ['pt', 'availability'] })
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to update schedule'
      )
    },
  })
}
