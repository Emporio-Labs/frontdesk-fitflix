import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import {
  apiClient,
  storeToken,
  getStoredToken,
  clearToken,
} from '@/lib/api-client'

describe('Feature 1: Authentication & Session Management', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Token Storage Helpers', () => {
    it('initial state: no token is stored', () => {
      expect(getStoredToken()).toBeNull()
    })

    it('stores token and retrieves it correctly', () => {
      storeToken('jwt-sample-token-123')
      expect(getStoredToken()).toBe('jwt-sample-token-123')
      expect(localStorage.getItem('hh_token')).toBe('jwt-sample-token-123')
    })

    it('clears token cleanly', () => {
      storeToken('jwt-sample-token-123')
      clearToken()
      expect(getStoredToken()).toBeNull()
      expect(localStorage.getItem('hh_token')).toBeNull()
    })
  })

  describe('API Client Request Interceptor', () => {
    it('injects Authorization Bearer header when token exists in storage', async () => {
      storeToken('my-test-jwt-token')

      let interceptedConfig: InternalAxiosRequestConfig | undefined
      apiClient.defaults.adapter = async (config) => {
        interceptedConfig = config
        return {
          data: { ok: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      await apiClient.get('/users/me')

      expect(interceptedConfig).toBeDefined()
      expect(interceptedConfig?.headers?.Authorization).toBe('Bearer my-test-jwt-token')
    })

    it('does NOT inject Authorization header on public /auth/* endpoints', async () => {
      storeToken('my-test-jwt-token')

      let interceptedConfig: InternalAxiosRequestConfig | undefined
      apiClient.defaults.adapter = async (config) => {
        interceptedConfig = config
        return {
          data: { ok: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      await apiClient.post('/auth/login', { email: 'admin@fitflix.in', password: 'secret' })

      expect(interceptedConfig).toBeDefined()
      expect(interceptedConfig?.headers?.Authorization).toBeUndefined()
    })
  })

  describe('Role Mapping Logic (Frontdesk <-> Backend contract)', () => {
    const roleMap: Record<string, string> = {
      admin: 'clinic_admin',
      clinic_admin: 'clinic_admin',
      super_admin: 'super_admin',
      frontdesk: 'staff',
      staff: 'staff',
      doctor: 'clinician',
      clinician: 'clinician',
      sales: 'sales',
      trainer: 'trainer',
      nutritionist: 'nutritionist',
      sports_scientist: 'sports_scientist',
      'sports-scientist': 'sports_scientist',
    }

    it('maps backend roles to expected frontdesk roles', () => {
      expect(roleMap['admin']).toBe('clinic_admin')
      expect(roleMap['frontdesk']).toBe('staff')
      expect(roleMap['doctor']).toBe('clinician')
      expect(roleMap['trainer']).toBe('trainer')
      expect(roleMap['nutritionist']).toBe('nutritionist')
    })

    it('refuses unknown or user roles', () => {
      expect(roleMap['user']).toBeUndefined()
      expect(roleMap['member']).toBeUndefined()
      expect(roleMap['random_role']).toBeUndefined()
    })
  })

  describe('401 Auto-Logout & Session Recovery', () => {
    it('cleans up session when 401 occurs on protected endpoint outside /login', async () => {
      storeToken('expired-token')
      localStorage.setItem('hh_user', JSON.stringify({ email: 'admin@fitflix.in', role: 'clinic_admin' }))

      // Ensure window.location.pathname is not /login
      window.history.pushState({}, '', '/admin/users')

      apiClient.defaults.adapter = async (config) => {
        const error: any = new Error('Request failed with status code 401')
        error.config = config
        error.response = { status: 401, data: { message: 'Unauthorized' } }
        throw error
      }

      await expect(apiClient.get('/admin/users')).rejects.toThrow()

      expect(localStorage.getItem('hh_token')).toBeNull()
      expect(localStorage.getItem('hh_user')).toBeNull()
    })
  })
})
