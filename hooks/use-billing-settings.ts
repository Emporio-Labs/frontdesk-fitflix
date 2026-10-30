import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  settingsService,
  BillingSettings,
  UpdateBillingSettingsPayload,
} from '@/lib/services/settings.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useBillingSettings() {
  return useQuery({
    queryKey: queryKeys.settings.billing(),
    queryFn: settingsService.getBillingSettings,
    select: (data) => data.settings,
  })
}

export function useUpdateBillingSettings() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateBillingSettingsPayload) =>
      settingsService.updateBillingSettings(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.billing() })
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success(data.message || 'Billing & tax settings updated successfully')
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to update billing settings',
      )
    },
  })
}
