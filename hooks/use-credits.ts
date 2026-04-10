import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  creditService,
  CreditTransactionSource,
  CreditHistoryQuery,
  TopUpCreditsPayload,
} from '@/lib/services/credit.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

interface UseCreditHistoryOptions extends CreditHistoryQuery {
  enabled?: boolean
}

interface UseUserCreditHistoryOptions extends CreditHistoryQuery {
  userId: string
  enabled?: boolean
}

export function useMyCreditBalance(enabled = true) {
  return useQuery({
    queryKey: queryKeys.credits.myBalance(),
    queryFn: creditService.getMyBalance,
    enabled,
  })
}

export function useMyCreditHistory(options: UseCreditHistoryOptions = {}) {
  const { limit = 50, sourceType, enabled = true } = options

  return useQuery({
    queryKey: queryKeys.credits.myHistory(limit, sourceType),
    queryFn: () => creditService.getMyHistory({ limit, sourceType }),
    enabled,
  })
}

export function useUserCreditBalance(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.credits.userBalance(userId),
    queryFn: () => creditService.getUserBalance(userId),
    enabled: enabled && Boolean(userId),
  })
}

export function useUserCreditHistory(options: UseUserCreditHistoryOptions) {
  const { userId, limit = 50, sourceType, enabled = true } = options

  return useQuery({
    queryKey: queryKeys.credits.userHistory(userId, limit, sourceType),
    queryFn: () => creditService.getUserHistory(userId, { limit, sourceType }),
    enabled: enabled && Boolean(userId),
  })
}

export function useTopUpUserCredits() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: TopUpCreditsPayload }) =>
      creditService.topUpUserCredits(userId, payload),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.credits.userBalance(variables.userId) })
      qc.invalidateQueries({ queryKey: queryKeys.credits.userHistory(variables.userId) })
      qc.invalidateQueries({ queryKey: queryKeys.memberships.all() })
      toast.success(data.message || 'Credits topped up')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to top up credits')
    },
  })
}

export type { CreditTransactionSource }
