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
    // Keep logs grouped and consistent for quick auth flow debugging.
    console.debug(`[auth-debug] ${message}`, meta ?? '')
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Inject Basic Auth from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const requestPath = config.url ?? ''
  const requestUrl = `${config.baseURL ?? API_BASE_URL}${requestPath}`

  if (typeof window !== 'undefined') {
    // Do not attach Basic auth for public auth endpoints.
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

    const credentials = localStorage.getItem('hh_credentials')
    let hasAuthHeader = false
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
    })
  }
  return config
})

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
