/**
 * Web Push helpers — pure functions with no side-effects. Safe to import from
 * client or server code (guards on `window` before touching browser APIs).
 */

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = typeof atob !== 'undefined' ? atob(base64) : ''
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export interface PushEnvironment {
  /** True if the browser exposes Service Worker + Push + Notification APIs. */
  supported: boolean
  /** True on iPhone / iPad / iPod devices (any iOS Safari-derived UA). */
  isIos: boolean
  /** Parsed major.minor iOS version (e.g. 16.4). null on non-iOS or unknown. */
  iosVersion: number | null
  /** True when the page runs from the home-screen shell rather than a browser tab. */
  isStandalone: boolean
  /**
   * True when it is possible for this browser to actually receive a Web Push.
   * On iOS this requires iOS 16.4+ AND the page being installed to the home screen
   * (Apple did not enable Web Push in mobile Safari — only in installed PWAs).
   */
  meetsIosRequirement: boolean
}

function parseIosVersion(ua: string): number | null {
  const m = /OS (\d+)_(\d+)/.exec(ua)
  if (!m) return null
  const major = Number(m[1])
  const minor = Number(m[2])
  if (Number.isNaN(major) || Number.isNaN(minor)) return null
  return Number(`${major}.${minor}`)
}

export function detectPushEnvironment(): PushEnvironment {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supported: false,
      isIos: false,
      iosVersion: null,
      isStandalone: false,
      meetsIosRequirement: false,
    }
  }

  const ua = navigator.userAgent || ''
  const isIos = /iP(ad|hone|od)/.test(ua)
  const iosVersion = isIos ? parseIosVersion(ua) : null

  // Standalone: the display mode (spec) or the iOS-specific navigator.standalone.
  const nav = navigator as Navigator & { standalone?: boolean }
  const standaloneMedia =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  const isStandalone = Boolean(standaloneMedia || nav.standalone)

  const hasServiceWorker = 'serviceWorker' in navigator
  const hasPushManager = typeof window.PushManager !== 'undefined'
  const hasNotification = typeof window.Notification !== 'undefined'
  const supported = hasServiceWorker && hasPushManager && hasNotification

  const meetsIosRequirement = isIos
    ? isStandalone && iosVersion !== null && iosVersion >= 16.4
    : true

  return {
    supported,
    isIos,
    iosVersion,
    isStandalone,
    meetsIosRequirement,
  }
}
