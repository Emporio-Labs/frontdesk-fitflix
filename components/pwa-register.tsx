'use client'

import { useEffect } from 'react'

/**
 * Registers the app-shell service worker. Mounted once from the root layout.
 * Registration is deferred to `load` so it never competes with first paint.
 *
 * PRODUCTION ONLY — deliberately. `public/sw.js` caches `/_next/static/`
 * cache-first on the premise that those paths are content-hashed, which holds
 * for a production build but NOT for `next dev`: dev serves chunks at stable,
 * unhashed paths (`/_next/static/chunks/app/admin/nutrition/page.js`). A dev
 * registration therefore pins the first build it ever sees and keeps serving
 * it — and because the worker intercepts ahead of the network, even a hard
 * refresh cannot get past it. Edits silently stop appearing.
 *
 * The dev branch below actively unregisters, so a browser already poisoned by
 * an earlier build heals itself on the next load instead of needing the
 * site data cleared by hand.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()))
        .catch(() => {
          // Nothing registered, or the browser refused — either way there is
          // no stale worker left to serve dev assets.
        })
      return
    }

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[pwa] service worker registration failed', err)
      })
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
