'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DEFAULT_PUSH_PREFERENCES,
  pushService,
  type PushPreferences,
  type WebPushSubscriptionJson,
} from '@/lib/services/push.service'
import { detectPushEnvironment, urlBase64ToUint8Array, type PushEnvironment } from '@/lib/push-utils'
import { useAuth } from '@/hooks/use-auth'

const PUSH_KEY = ['push'] as const

/**
 * Live-facts snapshot about the browser. Re-evaluates the permission state on
 * every render so a permission granted in Safari's UI reflects without a reload.
 */
export function usePushCapabilities(): PushEnvironment & {
  permission: NotificationPermission | 'unavailable'
  swReady: boolean
} {
  const [env, setEnv] = useState<PushEnvironment>(() => detectPushEnvironment())
  const [permission, setPermission] = useState<NotificationPermission | 'unavailable'>(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'unavailable')
  )
  const [swReady, setSwReady] = useState(false)

  useEffect(() => {
    setEnv(detectPushEnvironment())
    if (typeof Notification !== 'undefined') setPermission(Notification.permission)

    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    let cancelled = false
    navigator.serviceWorker.ready
      .then(() => {
        if (!cancelled) setSwReady(true)
      })
      .catch(() => {
        if (!cancelled) setSwReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { ...env, permission, swReady }
}

async function readCurrentBrowserSubscription(): Promise<PushSubscription | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export function useCurrentSubscription() {
  return useQuery({
    queryKey: [...PUSH_KEY, 'current'] as const,
    queryFn: readCurrentBrowserSubscription,
    // Getting the browser subscription is cheap; don't cache aggressively so
    // toggling reflects immediately.
    staleTime: 0,
  })
}

export function useMyPushDevices(enabled = true) {
  return useQuery({
    queryKey: [...PUSH_KEY, 'devices'] as const,
    queryFn: pushService.listMyDevices,
    enabled,
  })
}

export function useEnablePush() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (preferences: PushPreferences = DEFAULT_PUSH_PREFERENCES) => {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        throw new Error('Service workers are not supported in this browser.')
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error(
          permission === 'denied'
            ? 'Notifications were blocked. Enable them in your browser settings and try again.'
            : 'Permission was not granted.'
        )
      }

      const publicKey = await pushService.getVapidPublicKey()
      if (!publicKey) throw new Error('Missing VAPID public key — contact support.')

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const subscription =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }))

      const json = subscription.toJSON() as WebPushSubscriptionJson
      const device = await pushService.subscribe({
        subscription: json,
        role: user?.role,
        deviceLabel:
          typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : undefined,
        preferences,
      })

      // Best-effort confirmation push; don't fail the enable flow if it errors.
      pushService.sendTestNotification().catch(() => undefined)

      return device
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PUSH_KEY })
      toast.success('Push notifications enabled')
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Could not enable notifications on this device'
      )
    },
  })
}

export function useDisablePush() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const subscription = await readCurrentBrowserSubscription()
      if (!subscription) return
      const endpoint = subscription.endpoint
      try {
        await pushService.unsubscribe(endpoint)
      } catch {
        // Even if the backend delete fails, still unsubscribe locally so the
        // user's toggle behaves like they expect. The stale row can be pruned
        // from the devices list later.
      }
      await subscription.unsubscribe()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PUSH_KEY })
      toast.success('Push notifications disabled on this device')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not disable notifications')
    },
  })
}

export function useRemovePushDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (endpoint: string) => pushService.unsubscribe(endpoint),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PUSH_KEY })
      toast.success('Device removed')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to remove device')
    },
  })
}

export function useUpdatePushPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (preferences: PushPreferences) => pushService.updatePreferences(preferences),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PUSH_KEY })
      toast.success('Notification preferences updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update preferences')
    },
  })
}

export function useSendTestPush() {
  return useMutation({
    mutationFn: () => pushService.sendTestNotification(),
    onSuccess: () => toast.success("Test push sent — you should see it any moment"),
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not send test push')
    },
  })
}
