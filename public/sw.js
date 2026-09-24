/*
 * Fitflix service worker — app-shell caching only.
 *
 * SECURITY: this app is auth-gated and runs on shared front-desk tablets, so the
 * cache is restricted to immutable, non-personal build output. HTML documents
 * (except /offline) and /api responses are NEVER cached — doing so could serve
 * one staff member's data to the next person picking up the device.
 */
// Bumped v3 -> v4 (FX-25) so the `activate` handler evicts the previous static
// cache and forces this build's push + notificationclick handlers to install.
// Change this on every SW behavioural change.
const CACHE = 'fitflix-static-v4'

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
  const title = payload.title || 'Fitflix'
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || 'fitflix-push',
    renotify: true,
    data: {
      url: typeof payload.url === 'string' ? payload.url : '/',
    },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target =
    (event.notification.data && event.notification.data.url) || '/'
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
