/**
 * Generates and validates time-limited report viewing links (AC FX-07.4).
 * Links are cryptographically or timestamp-tokenized and expire after 15 minutes (900 seconds).
 */

const DEFAULT_EXPIRY_SECONDS = 900 // 15 minutes

/**
 * Creates a base64url encoded token containing the report target URL and expiration timestamp.
 */
export function createExpiringReportLink(targetUrl: string, expiresInSeconds: number = DEFAULT_EXPIRY_SECONDS): string {
  if (!targetUrl) return ''

  // If already an absolute API link, return as-is
  if (targetUrl.includes('/api/reports/view')) return targetUrl

  const exp = Date.now() + expiresInSeconds * 1000
  const payload = JSON.stringify({ u: targetUrl, exp })
  const token = typeof Buffer !== 'undefined'
    ? Buffer.from(payload).toString('base64url')
    : btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/reports/view?token=${token}`
  }
  return `/api/reports/view?token=${token}`
}

/**
 * Decodes and validates a report token.
 */
export function verifyReportToken(token: string): { valid: boolean; expired: boolean; url?: string } {
  try {
    const jsonStr = typeof Buffer !== 'undefined'
      ? Buffer.from(token, 'base64url').toString('utf8')
      : atob(token.replace(/-/g, '+').replace(/_/g, '/'))
    
    const data = JSON.parse(jsonStr)
    if (!data || !data.u || !data.exp) {
      return { valid: false, expired: false }
    }

    const isExpired = Date.now() > Number(data.exp)
    return {
      valid: true,
      expired: isExpired,
      url: data.u,
    }
  } catch {
    return { valid: false, expired: false }
  }
}
