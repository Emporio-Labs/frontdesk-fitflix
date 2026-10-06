import { apiClient } from '@/lib/api-client'

// FX-30 — account lifecycle. A personal front-desk/admin account starts as
// `invited` (created but the person has not set a password yet), becomes `active`
// once they set a password and sign in, and can be `disabled` (e.g. the shared
// frontdesk@fitflix.in login once everyone has migrated).
export type AdminStatus = 'invited' | 'active' | 'disabled'

export interface Admin {
  /** Populated by {@link normalizeAdmin} — the API's `toJSON` transform emits
   * `id` and deletes `_id`, so we backfill `_id` to keep existing UI code
   * (edit/delete by `admin._id`) working. */
  _id: string
  id: string
  adminName: string
  email: string
  phone: string
  createdAt: string
  updatedAt: string
  /** FX-30.3 — account state. Defaults to 'active' when the backend omits it. */
  status: AdminStatus
  /** True while an invite is outstanding and the person has not yet set a password. */
  invitePending: boolean
  /** FX-30.3 — used to tell who has actually migrated off the shared login. */
  lastLoginAt?: string
  /** Optional backend role string (e.g. 'frontdesk'); maps to the `staff` UI role. */
  staffRole?: string
}

/**
 * The backend Admin model's `toJSON` transform deletes `_id` and exposes an
 * `id` virtual instead. Without this, `admin._id` is `undefined` and admin
 * edit/delete requests hit `/admins/undefined` (HTTP 400). Backfill `_id` from
 * whichever id field is present so both are always usable.
 */
function normalizeAdmin(raw: any): Admin {
  const id = String(raw?._id || raw?.id || '')
  const rawStatus = String(raw?.status || '').toLowerCase()
  const status: AdminStatus =
    rawStatus === 'invited' || rawStatus === 'disabled' || rawStatus === 'active'
      ? (rawStatus as AdminStatus)
      : 'active' // backend omits status on legacy rows → treat as active
  // Derive invitePending from an explicit flag, or infer it from the status when
  // the backend does not send one.
  const invitePending =
    raw?.invitePending != null ? Boolean(raw.invitePending) : status === 'invited'
  return {
    ...raw,
    id,
    _id: id,
    status,
    invitePending,
    lastLoginAt: raw?.lastLoginAt ? String(raw.lastLoginAt) : undefined,
    staffRole: raw?.staffRole ? String(raw.staffRole) : undefined,
  }
}

// FX-30.2 — invite-based creation. No password field: the backend creates the
// account in `invited` state and emails a first-sign-in link. `password` is
// deliberately absent from every payload below so a plaintext password can never
// be typed by an admin or sent over the wire.
export interface InviteAdminPayload {
  adminName: string
  email: string
  phone: string
  /** Optional backend role; defaults to a front-desk role server-side. */
  staffRole?: string
}

export interface UpdateAdminPayload {
  adminName?: string
  email?: string
  phone?: string
  staffRole?: string
}

export const adminService = {
  getAll: async (): Promise<{ admins: Admin[] }> => {
    const { data } = await apiClient.get('/admins')
    const admins = Array.isArray(data?.admins) ? data.admins : Array.isArray(data) ? data : []
    return { admins: admins.map(normalizeAdmin) }
  },
  getById: async (id: string): Promise<{ admin: Admin }> => {
    const { data } = await apiClient.get(`/admins/${id}`)
    return { admin: normalizeAdmin(data?.admin ?? data) }
  },

  // ASSUMPTION: POST /admins accepts a no-password body, creates the account in
  // `invited` state, and emails the first-sign-in link. Some backends return the
  // link in the response instead of emailing it — surfaced as `inviteLink` so the
  // UI can offer a copyable fallback. If the invite lives at a distinct route
  // (e.g. POST /admins/invite), change the path here only.
  invite: async (
    payload: InviteAdminPayload
  ): Promise<{ message: string; admin: Admin; inviteLink?: string }> => {
    const { data } = await apiClient.post('/admins', payload)
    return {
      message: data?.message || 'Invite sent',
      admin: normalizeAdmin(data?.admin ?? data),
      inviteLink: data?.inviteLink ?? data?.link,
    }
  },

  // ASSUMPTION: POST /admins/:id/resend-invite re-issues the first-sign-in link
  // (also used as "send a reset link" for an existing account).
  resendInvite: async (id: string): Promise<{ message: string; inviteLink?: string }> => {
    const { data } = await apiClient.post(`/admins/${id}/resend-invite`, {})
    return { message: data?.message || 'Invite link resent', inviteLink: data?.inviteLink ?? data?.link }
  },

  update: async (id: string, payload: UpdateAdminPayload): Promise<{ message: string; admin: Admin }> => {
    const { data } = await apiClient.patch(`/admins/${id}`, payload)
    return { ...data, admin: normalizeAdmin(data?.admin ?? data) }
  },

  // ASSUMPTION: PATCH /admins/:id/status { status } toggles the account state.
  // Used to disable/enable a personal account and to disable the shared
  // frontdesk@fitflix.in login once everyone has migrated (FX-30.3).
  setStatus: async (id: string, status: AdminStatus): Promise<{ message: string; admin: Admin }> => {
    const { data } = await apiClient.patch(`/admins/${id}/status`, { status })
    return {
      message: data?.message || `Account ${status}`,
      admin: normalizeAdmin(data?.admin ?? data),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/admins/${id}`)
    return data
  },
}
