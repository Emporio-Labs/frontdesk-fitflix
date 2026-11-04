import { API_BASE_URL } from '@/lib/api-client'

const LOCAL_HOST = /^(localhost|127\.0\.0\.1)$/i

/**
 * Point a backend-served asset at the API this build talks to.
 *
 * The backend builds `/events/assets/*` URLs from its own `BACKEND_URL`, and
 * when that env var is missing it falls back to `http://localhost:3000`. Those
 * links were saved into the database as-is, so a deployed console asks the
 * viewer's own machine for the image and gets nothing. Re-homing the path onto
 * `API_BASE_URL` repairs both old rows and new uploads.
 */
export function resolveAssetUrl(url?: string | null): string {
  const value = String(url ?? '').trim()
  if (!value) return ''

  try {
    const parsed = new URL(value)
    const api = new URL(API_BASE_URL)
    if (
      LOCAL_HOST.test(parsed.hostname) &&
      !LOCAL_HOST.test(api.hostname) &&
      parsed.pathname.startsWith('/events/assets/')
    ) {
      return `${api.origin}${parsed.pathname}${parsed.search}`
    }
  } catch {
    // Relative or malformed — leave it for the browser to resolve.
  }
  return value
}
