import { useQuery } from '@tanstack/react-query'
import { auditService, AuditLogFilters } from '@/lib/services/audit.service'
import { queryKeys } from '@/lib/query-keys'

// FX-30.4 — real audit log feed. Replaces the synthetic client-side fabrication
// that previously hardcoded the actor as 'admin_operator'/'admin_system'.
export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(filters),
    queryFn: () => auditService.getAll(filters),
    select: (data) => data.items,
  })
}
