/*
 * Fitflix service worker — app-shell caching only.
 *
 * SECURITY: this app is auth-gated and runs on shared front-desk tablets, so the
 * cache is restricted to immutable, non-personal build output. HTML documents
 * (except /offline) and /api responses are NEVER cached — doing so could serve
 * one staff member's data to the next person picking up the device.
 */
// Bumped v2 -> v3 so the `activate` handler evicts the previous static cache
// (which did not know about /offline) and forces a fresh precache. Change this
// on every SW behavioural change.
const CACHE = 'fitflix-static-v3'

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
