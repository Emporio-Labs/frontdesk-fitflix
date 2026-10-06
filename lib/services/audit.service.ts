import { apiClient } from '@/lib/api-client'

// FX-30.4 — the audit trail must show the person who acted, not "Frontdesk".
// Each entry carries a resolved `actor` so the UI can render a real name instead
// of the shared-login label or a hardcoded 'admin_operator'.
export interface AuditActor {
  id: string
  name: string
  role?: string
  email?: string
}

export interface AuditLog {
  id: string
  actor: AuditActor
  action: string
  entityType: string
  entityId: string
  changes: Record<string, { before: unknown; after: unknown }>
  timestamp: string
}

export interface AuditLogFilters {
  action?: string
  entityType?: string
  search?: string
  [key: string]: unknown
}

function normalizeActor(raw: any): AuditActor {
  // The backend may send the actor as a nested object or as flat fields; accept
  // either and never fall back to a literal "Frontdesk" — an unresolved actor
  // shows its role or "Unknown", which is honest about missing data.
  const actor = raw?.actor ?? raw?.performedBy ?? raw?.user ?? {}
  const id = String(actor?.id ?? actor?._id ?? raw?.actorId ?? '')
  const name = String(
    actor?.name ?? actor?.adminName ?? actor?.username ?? raw?.actorName ?? ''
  ).trim()
  const role = actor?.role ?? actor?.staffRole ?? raw?.actorRole
  return {
    id,
    name,
    role: role ? String(role) : undefined,
    email: actor?.email ? String(actor.email) : undefined,
  }
}

function normalizeLog(raw: any): AuditLog {
  return {
    id: String(raw?.id ?? raw?._id ?? ''),
    actor: normalizeActor(raw),
    action: String(raw?.action ?? '').toLowerCase(),
    entityType: String(raw?.entityType ?? raw?.entity ?? ''),
    entityId: String(raw?.entityId ?? raw?.entity?.id ?? ''),
    changes: raw?.changes ?? {},
    timestamp: String(raw?.timestamp ?? raw?.createdAt ?? ''),
  }
}

function extractList(data: any): any[] {
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.logs)) return data.logs
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data
  return []
}

export const auditService = {
  // ASSUMPTION: GET /audit-logs returns { items: AuditLog[] } with a resolved
  // actor (name) per entry. Filters are passed as query params. If the backend
  // exposes this under a different path or shape, correct this service only —
  // the hook and page stay stable.
  getAll: async (filters?: AuditLogFilters): Promise<{ items: AuditLog[] }> => {
    const { data } = await apiClient.get('/audit-logs', { params: filters })
    return { items: extractList(data).map(normalizeLog) }
  },
}
