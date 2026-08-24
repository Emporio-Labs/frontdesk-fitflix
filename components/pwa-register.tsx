'use client'

import { useEffect } from 'react'

/**
 * Registers the app-shell service worker. Mounted once from the root layout.
 * Registration is deferred to `load` so it never competes with first paint.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

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
