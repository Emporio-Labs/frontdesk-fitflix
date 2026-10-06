/*
 * Fitflix service worker — app-shell caching only.
 *
 * SECURITY: this app is auth-gated and runs on shared front-desk tablets, so the
 * cache is restricted to immutable, non-personal build output. HTML documents
 * (except /offline) and /api responses are NEVER cached — doing so could serve
 * one staff member's data to the next person picking up the device.
 */
// Bumped v4 -> v5 (FX-39) for critical operational alert Web Push,
// desktop requireInteraction, and multi-device notification clearing.
const CACHE = 'fitflix-static-v5'

// Sole cached HTML document. Rendered by app/offline/page.tsx as a static route,
// so it survives without any live API call. Served by the fetch handler below
// when a navigation request fails offline.
const OFFLINE_URL = '/offline'

// Immutable, content-hashed build assets + our own icons. Nothing user-specific.
function isCacheable(url) {
  if (url.origin !== self.location.origin) return false
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')
}

self.addEventListener('install', (event) => {
  // Precache the offline shell so it is available before the user first
  // loses connectivity. If the fetch fails (offline install, unlikely) we
  // still activate — the fetch handler only tries the cache and no-ops on miss.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Navigation requests: try network first, fall back to the offline shell.
  // Never cache the successful response — we only want the offline fallback in
  // the cache, so real pages always come from the network with fresh auth.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE)
        const cached = await cache.match(OFFLINE_URL)
        return (
          cached ||
          new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
        )
      }),
    )
    return
  }

  const url = new URL(request.url)
  if (!isCacheable(url)) return // API calls fall through to the network.

  // Cache-first: these paths are content-hashed, so a hit is always current.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit
      return fetch(request).then((response) => {
        if (response.ok && response.status === 200) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})

// -----------------------------------------------------------------------------
// FX-25 · Web Push handlers.
//
// SECURITY: the shared-device rule in the header still applies. Push payload is
// used to render one notification and to remember the deep-link URL for the
// click handler — nothing is written to the CACHE and nothing is persisted
// beyond a single notification's lifetime.
// -----------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { title: 'Fitflix', body: event.data.text() }
    }
  }

  // FX-39.4: Acknowledging clears the device notification on other devices
  const isClearAction =
    payload.action === 'clear' ||
    payload.action === 'close' ||
    payload.data?.action === 'clear'

  if (isClearAction) {
    const targetTag =
      payload.tag ||
      (payload.alertId ? `alert:${payload.alertId}` : null) ||
      (payload.data?.alertId ? `alert:${payload.data.alertId}` : null)

    if (targetTag) {
      event.waitUntil(
        self.registration.getNotifications({ tag: targetTag }).then((notifications) => {
          notifications.forEach((n) => n.close())
        })
      )
      return
    }
  }

  const title = payload.title || 'Fitflix'
  const isCritical =
    payload.severity === 'critical' ||
    payload.data?.severity === 'critical' ||
    payload.requireInteraction === true ||
    payload.data?.requireInteraction === true

  const alertTag =
    payload.tag ||
    (payload.alertId ? `alert:${payload.alertId}` : null) ||
    (payload.data?.alertId ? `alert:${payload.data.alertId}` : null) ||
    'fitflix-push'

  const targetUrl =
    typeof payload.url === 'string'
      ? payload.url
      : payload.alertId
      ? `/admin/overview?alertId=${payload.alertId}`
      : '/'

  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: alertTag,
    renotify: true,
    // FX-39.2: On desktop the notification stays on screen until it's clicked or closed
    requireInteraction: isCritical,
    data: {
      url: targetUrl,
      alertId: payload.alertId || payload.data?.alertId,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const notifData = event.notification.data || {}
  const target =
    typeof notifData.url === 'string'
      ? notifData.url
      : notifData.alertId
      ? `/admin/overview?alertId=${notifData.alertId}`
      : '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if (
            'focus' in client &&
            typeof client.url === 'string' &&
            client.url.startsWith(self.location.origin)
          ) {
            client.focus()
            if ('navigate' in client) {
              return client.navigate(target).catch(() => undefined)
            }
            return undefined
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(target)
        }
        return undefined
      }),
  )
})

// FX-39.4: Local client message handler to clear notifications by tag
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_NOTIFICATION' && event.data.tag) {
    self.registration.getNotifications({ tag: event.data.tag }).then((notifications) => {
      notifications.forEach((n) => n.close())
    })
  }
})
