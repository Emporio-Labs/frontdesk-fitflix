import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLocationScope } from '@/components/location-scope-provider'
import { queryKeys } from '@/lib/query-keys'
import {
  SendMemberNotificationPayload,
  memberNotificationService,
} from '@/lib/services/member-notification.service'

/**
 * FX-20.3 — club notifications are per-branch, so the history key goes through
 * `scopedKey` (same reasoning as `use-promotions`): without it, switching branch
 * would serve one club's sent history under another, indistinguishable from
 * stale data.
 */
export function useMemberNotifications() {
  const { scopedKey, selectedLocationId } = useLocationScope()

  return useQuery({
    queryKey: scopedKey(queryKeys.memberNotifications.all()),
    queryFn: () =>
      memberNotificationService.getAll({ locationId: selectedLocationId }),
    select: (data) => data.items,
  })
}

export function useSendMemberNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SendMemberNotificationPayload) =>
      memberNotificationService.send(payload),
    onSuccess: (data) => {
      // A company-wide send (locationId: null) lands in every branch's history,
      // so clear all branches rather than only the active scope — same as
      // `invalidatePromotions`.
      qc.invalidateQueries({ queryKey: ['member-notifications'] })
      toast.success(data.message || 'Notification sent')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to send notification'),
  })
}
