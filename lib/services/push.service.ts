import { apiClient } from '@/lib/api-client'

/**
 * FX-25 — Web Push subscription service.
 *
 * ASSUMPTION (FX-25): the `/notifications/web-push/*` routes are UNVERIFIED and are
 * tracked as a backend dependency. The existing `POST /notifications/fcm-token`
 * endpoint documented in the backend is FCM-only (Flutter user app) and cannot
 * accept a browser PushSubscription (endpoint / p256dh / auth). Every method
 * below carries the same assumption — replace the paths and response shapes with
 * the real contract when the backend lands.
 */

export type PushEventKind =
  | 'ONE_ON_ONE_BOOKED'
  | 'ONE_ON_ONE_CANCELLED'
  | 'ONE_ON_ONE_RESCHEDULED'
  | 'CONSULTATION_BOOKED'
  | 'CONSULTATION_CANCELLED'
  | 'CONSULTATION_RESCHEDULED'
  | 'CLASS_STARTING_SOON'

export interface PushPreferences {
  oneOnOneEvents: boolean
  consultationEvents: boolean
  classReminder: boolean
}

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  oneOnOneEvents: true,
  consultationEvents: true,
  classReminder: true,
}

export interface WebPushSubscriptionJson {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

export interface RegisteredDevice {
  id: string
  endpoint: string
  deviceLabel?: string
  role?: string
  createdAt: string
  lastNotifiedAt?: string
  preferences?: PushPreferences
}

export interface SubscribePayload {
  subscription: WebPushSubscriptionJson
  role?: string
  deviceLabel?: string
  preferences: PushPreferences
}

export const pushService = {
  /**
   * Prefers the client-side env var to avoid an extra round-trip. Falls back to
   * the backend endpoint when the env var is empty (dev, or when the ops team
   * wants to rotate the VAPID pair without a redeploy of the frontend).
   */
  getVapidPublicKey: async (): Promise<string> => {
    const fromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (fromEnv && fromEnv.length > 0) return fromEnv
    // ASSUMPTION (FX-25): GET /notifications/vapid-key returns { publicKey: string }.
    const { data } = await apiClient.get('/notifications/vapid-key')
    return data.publicKey
  },

  // ASSUMPTION (FX-25): GET /notifications/web-push/subscriptions returns
  // { devices: RegisteredDevice[] } scoped to the signed-in user.
  listMyDevices: async (): Promise<RegisteredDevice[]> => {
    const { data } = await apiClient.get('/notifications/web-push/subscriptions')
    return data.devices || []
  },

  // ASSUMPTION (FX-25): POST /notifications/web-push/subscriptions accepts the
  // browser subscription plus role/preferences and returns { device }.
  subscribe: async (payload: SubscribePayload): Promise<RegisteredDevice> => {
    const { data } = await apiClient.post('/notifications/web-push/subscriptions', payload)
    return data.device
  },

  // ASSUMPTION (FX-25): DELETE /notifications/web-push/subscriptions/:endpoint
  // removes the subscription for that endpoint (URL-encoded).
  unsubscribe: async (endpoint: string): Promise<void> => {
    await apiClient.delete(
      `/notifications/web-push/subscriptions/${encodeURIComponent(endpoint)}`
    )
  },

  // ASSUMPTION (FX-25): PATCH /notifications/web-push/preferences updates the
  // per-user preferences that gate which event types fan out to the caller.
  updatePreferences: async (preferences: PushPreferences): Promise<PushPreferences> => {
    const { data } = await apiClient.patch(
      '/notifications/web-push/preferences',
      preferences
    )
    return data.preferences || preferences
  },

  // ASSUMPTION (FX-25): POST /notifications/web-push/test fires a "You're all set"
  // push to the caller's registered endpoints. Used for the "Send test" button on
  // the settings page.
  sendTestNotification: async (): Promise<void> => {
    await apiClient.post('/notifications/web-push/test', {})
  },
}
