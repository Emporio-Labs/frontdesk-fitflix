import axios, { AxiosHeaders } from 'axios'

const DEFAULT_API_BASE_URL = 'http://localhost:3000'

function normalizeApiBaseUrl(rawValue?: string): string {
  const value = String(rawValue ?? '').trim().replace(/\/$/, '')
  if (!value) {
    return DEFAULT_API_BASE_URL
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(value)) {
    return `http://${value}`
  }

  return `https://${value}`
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)
const AUTH_DEBUG = process.env.NEXT_PUBLIC_DEBUG_AUTH === '1'

function logAuthDebug(message: string, meta?: unknown) {
  if (AUTH_DEBUG && typeof window !== 'undefined') {
    console.debug(`[auth-debug] ${message}`, meta ?? '')
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token helpers (hh_token)
export function storeToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem('hh_token', token)
}
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('hh_token')
}
export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem('hh_token')
}

// Inject Authorization (prefer Bearer, fall back to Basic)
apiClient.interceptors.request.use((config) => {
  const requestPath = config.url ?? ''
  const requestUrl = `${config.baseURL ?? API_BASE_URL}${requestPath}`

  if (typeof window !== 'undefined') {
    // Do not attach auth for public auth endpoints.
    const isAuthEndpoint = requestPath.startsWith('/auth/') || requestPath === '/auth'
    if (isAuthEndpoint) {
      logAuthDebug('request', {
        method: config.method,
        url: requestUrl,
        hasAuthHeader: false,
        reason: 'auth endpoint',
      })
      return config
    }

    let hasAuthHeader = false

    // Prefer Bearer token
    const token = getStoredToken()
    if (token) {
      const headers = AxiosHeaders.from(config.headers)
      headers.set('Authorization', `Bearer ${token}`)
      config.headers = headers
      hasAuthHeader = true
      logAuthDebug('request', {
        method: config.method,
        url: requestUrl,
        hasAuthHeader: true,
        headerType: 'bearer',
      })
      return config
    }

    // Fallback: existing Basic behaviour
    const credentials = localStorage.getItem('hh_credentials')
    if (credentials) {
      const headers = AxiosHeaders.from(config.headers)
      headers.set('Authorization', `Basic ${credentials}`)
      config.headers = headers
      hasAuthHeader = true
    }

    logAuthDebug('request', {
      method: config.method,
      url: requestUrl,
      hasAuthHeader,
      headerType: hasAuthHeader ? (token ? 'bearer' : 'basic') : undefined,
    })
  }

  return config
})

// Guard: prevent multiple 401 logouts firing at the same time
let _isLoggingOut = false

apiClient.interceptors.response.use(
  (response) => {
    const url = `${response.config.baseURL ?? API_BASE_URL}${response.config.url ?? ''}`
    logAuthDebug('response', {
      method: response.config.method,
      url,
      status: response.status,
    })
    return response
  },
  (error) => {
    const config = error?.config ?? {}
    const url = `${config.baseURL ?? API_BASE_URL}${config.url ?? ''}`
    logAuthDebug('response-error', {
      method: config.method,
      url,
      status: error?.response?.status,
      message: error?.message,
      serverMessage: error?.response?.data?.message,
    })

    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      const requestPath = config.url ?? ''
      const isAuthEndpoint = requestPath.startsWith('/auth/') || requestPath === '/auth'

      // Only auto-logout if:
      // 1. It's NOT an auth endpoint (login/signup)
      // 2. We're not already logging out (debounce parallel 401s)
      // 3. We're not already on the login page
      if (!isAuthEndpoint && !_isLoggingOut && window.location.pathname !== '/login') {
        _isLoggingOut = true
        logAuthDebug('401 auto-logout triggered', { url, path: window.location.pathname })
        clearCredentials()
        clearToken()
        if (typeof document !== 'undefined') {
          document.cookie = 'hh_authed=; path=/; max-age=0; SameSite=Lax'
        }
        localStorage.removeItem('hh_user')
        // Small delay to let any parallel requests settle before redirect
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          _isLoggingOut = false
        }, 100)
      }
    }

    return Promise.reject(error)
  }
)

// Helper to build Basic Auth header value
export function buildBasicAuth(email: string, password: string): string {
  return btoa(`${email}:${password}`)
}

export function storeCredentials(email: string, password: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hh_credentials', buildBasicAuth(email, password))
    localStorage.setItem('hh_email', email)
  }
}

export function clearCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hh_credentials')
    localStorage.removeItem('hh_email')
  }
}

export function getStoredCredentials(): { email: string; token: string } | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('hh_credentials')
  const email = localStorage.getItem('hh_email')
  if (!token || !email) return null
  return { email, token }
}
