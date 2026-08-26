/*
 * Fitflix service worker — app-shell caching only.
 *
 * SECURITY: this app is auth-gated and runs on shared front-desk tablets, so the
 * cache is restricted to immutable, non-personal build output. HTML documents and
 * /api responses are NEVER cached — doing so could serve one staff member's data
 * to the next person picking up the device.
 */
// Bumped v1 -> v2 so the `activate` handler below evicts anything a previous
// worker cached. That matters because dev registrations (now disabled — see
// components/pwa-register.tsx) could pin unhashed `next dev` chunks, and the
// eviction is keyed on this name changing.
const CACHE = 'fitflix-static-v2'

// Immutable, content-hashed build assets + our own icons. Nothing user-specific.
function isCacheable(url) {
  if (url.origin !== self.location.origin) return false
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')
}

self.addEventListener('install', () => {
  // Take over as soon as the new worker is ready rather than waiting for all tabs.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (!isCacheable(url)) return // Documents and API calls fall through to the network.

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
    })
  )
})
