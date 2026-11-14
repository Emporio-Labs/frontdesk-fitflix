import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { agendaService } from '@/lib/services/agenda.service'

export function useMemberAgenda(
  userId: string,
  options?: { from?: string; to?: string },
) {
  return useQuery({
    queryKey: queryKeys.users.agenda(userId, options?.from, options?.to),
    queryFn: () =>
      agendaService.getMemberAgenda(userId, {
        from: options?.from,
        to: options?.to,
      }),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}
