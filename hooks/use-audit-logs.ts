import { useQuery } from '@tanstack/react-query'
import { auditService, AuditLogFilters } from '@/lib/services/audit.service'
import { queryKeys } from '@/lib/query-keys'
import { useLocationScope } from '@/components/location-scope-provider'

// FX-30.4 — real audit log feed. Replaces the synthetic client-side fabrication
// that previously hardcoded the actor as 'admin_operator'/'admin_system'.
//
// FX-45.3 — fold the selected branch into the key so switching branch refetches
// (the X-Location-Id header scopes the response, and confines a manager to their
// own branch) and never serves the previous branch's rows from cache.
export function useAuditLogs(filters?: AuditLogFilters) {
  const { scopedKey } = useLocationScope()
  return useQuery({
    queryKey: scopedKey(queryKeys.auditLogs.list(filters)),
    queryFn: () => auditService.getAll(filters),
    select: (data) => data.items,
  })
}
