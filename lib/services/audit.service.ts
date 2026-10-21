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

// FX-45.1 — every entry records which branch the change happened in, so the
// owner can answer "who did this, when, and where". May be absent on legacy
// rows written before branch stamping, or on genuinely branch-less org actions.
export interface AuditBranch {
  id: string
  name?: string
}

export interface AuditLog {
  id: string
  actor: AuditActor
  // One of: created | updated | cancelled | deleted (FX-45.1 — the four kinds of
  // change staff make). Lowercased; unknown values pass through untouched.
  action: string
  entityType: string
  entityId: string
  branch: AuditBranch | null
  changes: Record<string, { before: unknown; after: unknown }>
  timestamp: string
}

export interface AuditLogFilters {
  action?: string
  entityType?: string
  search?: string
  // FX-45.2 — server-side narrowing seams. Branch is normally carried by the
  // X-Location-Id header (location-scope-provider), so managers are confined to
  // their own branch by the backend regardless of what the UI sends; these are
  // here for an admin who wants to narrow a cross-branch view by date or branch.
  branchId?: string
  from?: string
  to?: string
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

function normalizeBranch(raw: any): AuditBranch | null {
  // Accept a nested object (branch/location) or flat id/name fields, mirroring
  // the actor normalisation. A missing branch stays null — honest about rows
  // that predate branch stamping rather than inventing a location.
  const branch = raw?.branch ?? raw?.location ?? null
  const id = String(
    branch?.id ?? branch?._id ?? raw?.branchId ?? raw?.locationId ?? ''
  )
  const name = String(
    branch?.name ?? branch?.code ?? raw?.branchName ?? raw?.locationName ?? ''
  ).trim()
  if (!id && !name) return null
  return { id, name: name || undefined }
}

function normalizeLog(raw: any): AuditLog {
  return {
    id: String(raw?.id ?? raw?._id ?? ''),
    actor: normalizeActor(raw),
    action: String(raw?.action ?? '').toLowerCase(),
    entityType: String(raw?.entityType ?? raw?.entity ?? ''),
    entityId: String(raw?.entityId ?? raw?.entity?.id ?? ''),
    branch: normalizeBranch(raw),
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
  // actor (name) and a branch per entry, covering every create/edit/cancel/
  // delete across entity types (FX-45.1 — today only bookings emit rows). The
  // backend scopes the response to the caller's branch via the X-Location-Id
  // header, so a manager only ever receives their own branch's rows (FX-45.3).
  // Filters are passed as query params. If the backend exposes this under a
  // different path or shape, correct this service only — the hook and page
  // stay stable.
  getAll: async (filters?: AuditLogFilters): Promise<{ items: AuditLog[] }> => {
    const { data } = await apiClient.get('/audit-logs', { params: filters })
    return { items: extractList(data).map(normalizeLog) }
  },
}
