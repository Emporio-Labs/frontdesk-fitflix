import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  settingsService,
  ConferenceSettings,
} from '@/lib/services/settings.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useConferenceSettings() {
  return useQuery({
    queryKey: queryKeys.settings.conference(),
    queryFn: settingsService.getConferenceSettings,
    select: (data) => data.settings,
  })
}

export function useUpdateConferenceSettings() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<ConferenceSettings>) =>
      settingsService.updateConferenceSettings(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.conference() })
      toast.success(data.message || 'Conference settings updated successfully')
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to update conference settings',
      )
    },
  })
}
