import { apiClient } from '@/lib/api-client'

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
}

/**
 * The backend Admin model's `toJSON` transform deletes `_id` and exposes an
 * `id` virtual instead. Without this, `admin._id` is `undefined` and admin
 * edit/delete requests hit `/admins/undefined` (HTTP 400). Backfill `_id` from
 * whichever id field is present so both are always usable.
 */
function normalizeAdmin(raw: any): Admin {
  const id = String(raw?._id || raw?.id || '')
  return { ...raw, id, _id: id }
}

export interface CreateAdminPayload {
  adminName: string
  email: string
  phone: string
  password: string
}

export interface UpdateAdminPayload {
  adminName?: string
  email?: string
  phone?: string
  password?: string
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
  create: async (payload: CreateAdminPayload): Promise<{ message: string; admin: Admin }> => {
    const { data } = await apiClient.post('/admins', payload)
    return { ...data, admin: normalizeAdmin(data?.admin ?? data) }
  },
  update: async (id: string, payload: UpdateAdminPayload): Promise<{ message: string; admin: Admin }> => {
    const { data } = await apiClient.patch(`/admins/${id}`, payload)
    return { ...data, admin: normalizeAdmin(data?.admin ?? data) }
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/admins/${id}`)
    return data
  },
}
