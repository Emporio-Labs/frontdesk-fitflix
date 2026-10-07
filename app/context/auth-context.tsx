'use client'

import React, { createContext, useState, ReactNode, useEffect } from 'react'
import { UserRole } from '@/lib/rbac'
import { storeCredentials, clearCredentials, clearToken, getStoredCredentials, getStoredToken } from '@/lib/api-client'
import { getRoleStartPage } from '@/lib/role-workspaces'

// Re-exported from the shared role-workspaces module (the single source of truth
// for role→start-page) so existing importers (app/page.tsx, app-sidebar.tsx)
// keep working without change.
export { getRoleStartPage }

// Helpers for auth cookie (read by Next.js middleware for route protection).
// Note: this is a presence-only indicator cookie, NOT the auth token.
// The real token lives in localStorage (see lib/api-client.ts).
// SameSite=Strict prevents CSRF. Secure is added when on HTTPS.
function setAuthCookie(role?: string) {
  if (typeof document !== 'undefined') {
    const isSecure = window.location.protocol === 'https:'
    const secureFlag = isSecure ? '; Secure' : ''
    document.cookie = `hh_authed=1; path=/; max-age=86400; SameSite=Strict${secureFlag}`
    if (role) {
      document.cookie = `hh_role=${role}; path=/; max-age=86400; SameSite=Strict${secureFlag}`
    }
  }
}
function clearAuthCookie() {
  if (typeof document !== 'undefined') {
    const isSecure = window.location.protocol === 'https:'
    const secureFlag = isSecure ? '; Secure' : ''
    document.cookie = `hh_authed=; path=/; max-age=0; SameSite=Strict${secureFlag}`
    document.cookie = `hh_role=; path=/; max-age=0; SameSite=Strict${secureFlag}`
  }
}

export interface AuthContextType {
  role: UserRole
  user: {
    id: string
    name: string
    email: string
    role: UserRole
  } | null
  isAuthenticated: boolean
  setRole: (role: UserRole) => void
  setUser: (user: AuthContextType['user']) => void
  login: (email: string, password: string, userData: AuthContextType['user']) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('clinic_admin')
  const [user, setUser] = useState<AuthContextType['user']>(null)

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = getStoredCredentials()
    const token = getStoredToken()
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('hh_user') : null
    if ((stored || token) && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        const validRoles: UserRole[] = [
          'super_admin',
          'clinic_admin',
          'manager',
          'staff',
          'clinician',
          'sales',
          'trainer',
          'nutritionist',
          'sports_scientist',
          'unassigned',
        ]
        if (!validRoles.includes(parsedUser.role)) {
          clearCredentials()
          clearToken()
          clearAuthCookie()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('hh_user')
            localStorage.removeItem('hh_token')
            localStorage.removeItem('hh_refresh_token')
          }
          setUser(null)
          return
        }
        setUser(parsedUser)
        setRole(parsedUser.role)
        // Reinstate auth cookie so middleware allows access on refresh
        setAuthCookie(parsedUser.role)
      } catch (_) {
        clearCredentials()
        clearToken()
        clearAuthCookie()
      }
    } else {
      // If we don't have stored session/token but are on a protected route,
      // clear presence cookie and redirect to login.
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        const isProtected = path.startsWith('/dashboard') || path.startsWith('/admin')
        if (isProtected) {
          clearAuthCookie()
          window.location.href = `/login?from=${encodeURIComponent(path)}`
        }
      }
    }
  }, [])

  const login = (email: string, password: string, userData: AuthContextType['user']) => {
    storeCredentials(email, password)
    setAuthCookie(userData?.role)
    if (userData) {
      localStorage.setItem('hh_user', JSON.stringify(userData))
    }
    setUser(userData)
    setRole(userData?.role ?? 'clinic_admin')
    // Hard redirect — ensures middleware sees the new cookie immediately.
    // Start page comes from the shared role map; trainer/nutritionist keep their
    // existing deep landing pages (hub roots would just bounce once in middleware).
    if (typeof window !== 'undefined') {
      let target = getRoleStartPage(userData?.role)
      if (userData?.role === 'trainer') target = '/admin/personal-training/today'
      else if (userData?.role === 'nutritionist') target = '/admin/nutrition/my-clients'
      window.location.href = target
    }
  }

  const handleLogout = () => {
    clearCredentials()
    clearToken()
    clearAuthCookie()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hh_user')
      localStorage.removeItem('hh_token')
      localStorage.removeItem('hh_refresh_token')
      window.location.href = '/login'
    }
    setUser(null)
    setRole('clinic_admin')
  }

  return (
    <AuthContext.Provider
      value={{
        role,
        user,
        isAuthenticated: !!user,
        setRole,
        setUser,
        login,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
