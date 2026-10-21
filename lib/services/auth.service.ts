import { apiClient } from '@/lib/api-client'

export interface LoginPayload {
  email: string
  password: string
}

export interface SignupPayload {
  username: string
  email: string
  phone: string
  password: string
  age: number
  gender: number
  healthGoals: string
}

// FX-30.2 — first-sign-in / set-password flow. A staff account is created in an
// `invited` state (see admin.service.ts) and the backend emails a one-time link
// to `/set-password?token=...`. The person sets their own password through that
// link; no plaintext password is ever typed by an admin or sent back to the UI.
export interface VerifyInviteResult {
  valid: boolean
  email?: string
  name?: string
  expiresAt?: string
  message?: string
}

export interface SetPasswordPayload {
  token: string
  password: string
}

export const authService = {
  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post('/auth/login', payload)
    return data
  },
  signup: async (payload: SignupPayload) => {
    const { data } = await apiClient.post('/auth/signup', payload)
    return data
  },

  // ASSUMPTION: GET /auth/invite/:token validates a first-sign-in token and
  // returns whether it is still usable plus the account's email/name for display.
  // Path is under /auth/* so the api-client request interceptor skips the Bearer
  // header (the person is not signed in yet). If the backend uses a query param
  // (`/auth/invite?token=`) or a different field name, adjust here only.
  verifyInvite: async (token: string): Promise<VerifyInviteResult> => {
    const { data } = await apiClient.get(`/auth/invite/${encodeURIComponent(token)}`)
    return {
      valid: Boolean(data?.valid ?? data?.ok ?? false),
      email: data?.email ?? data?.user?.email,
      name: data?.name ?? data?.user?.name ?? data?.user?.adminName,
      expiresAt: data?.expiresAt,
      message: data?.message,
    }
  },

  // ASSUMPTION: POST /auth/set-password consumes the one-time token and sets the
  // password. It does NOT sign the person in — they go to /login afterwards.
  setPassword: async (payload: SetPasswordPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/auth/set-password', payload)
    return { message: data?.message || 'Password set successfully' }
  },
}
