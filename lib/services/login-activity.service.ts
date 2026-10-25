import { apiClient } from '@/lib/api-client'

export interface LoginEvent {
  id: string
  accountId: string
  accountKind: 'user' | 'admin' | 'trainer'
  role: string
  name: string
  email: string
  locationId: { id: string; name: string } | null
  ip: string
  createdAt: string
}

/** `staff` = everyone except members (role "user"); `all` = no role filter. */
export type LoginRoleFilter = 'staff' | 'all' | 'admin' | 'trainer'

export interface LoginActivityParams {
  /** First IST day, YYYY-MM-DD (inclusive) */
  from: string
  /** Last IST day, YYYY-MM-DD (inclusive) */
  to: string
  role?: LoginRoleFilter
}

export const loginActivityService = {
  list: async ({ from, to, role = 'staff' }: LoginActivityParams) => {
    const params: Record<string, string> = { from, to }
    if (role === 'staff') params.excludeRole = 'user'
    else if (role !== 'all') params.role = role
    const { data } = await apiClient.get('/admins/login-events', { params })
    return data as { items: LoginEvent[]; truncated: boolean }
  },
}
