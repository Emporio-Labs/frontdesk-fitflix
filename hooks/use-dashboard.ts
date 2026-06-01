import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/lib/services/dashboard.service'
import { queryKeys } from '@/lib/query-keys'

export function useDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics(),
    queryFn: dashboardService.getMetrics,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}
