import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Inject Basic Auth from localStorage on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const credentials = localStorage.getItem('hh_credentials')
    if (credentials) {
      config.headers['Authorization'] = `Basic ${credentials}`
    }
  }
  return config
})

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
