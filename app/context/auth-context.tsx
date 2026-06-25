'use client'

import React, { createContext, useState, ReactNode, useEffect } from 'react'
import { UserRole } from '@/lib/rbac'
import { storeCredentials, clearCredentials, clearToken, getStoredCredentials, getStoredToken } from '@/lib/api-client'

// Helpers for auth cookie (read by Next.js middleware for route protection).
// Note: this is a presence-only indicator cookie, NOT the auth token.
// The real token lives in localStorage (see lib/api-client.ts).
// SameSite=Strict prevents CSRF. Secure is added when on HTTPS.
function setAuthCookie() {
  if (typeof document !== 'undefined') {
    const isSecure = window.location.protocol === 'https:'
    const secureFlag = isSecure ? '; Secure' : ''
    document.cookie = `hh_authed=1; path=/; max-age=86400; SameSite=Strict${secureFlag}`
  }
}
function clearAuthCookie() {
  if (typeof document !== 'undefined') {
    const isSecure = window.location.protocol === 'https:'
    const secureFlag = isSecure ? '; Secure' : ''
    document.cookie = `hh_authed=; path=/; max-age=0; SameSite=Strict${secureFlag}`
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
        setUser(parsedUser)
        setRole(parsedUser.role)
        // Reinstate auth cookie so middleware allows access on refresh
        setAuthCookie()
      } catch (_) {
        clearCredentials()
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
    setAuthCookie()
    if (userData) {
      localStorage.setItem('hh_user', JSON.stringify(userData))
    }
    setUser(userData)
    setRole(userData?.role ?? 'clinic_admin')
    // Hard redirect — ensures middleware sees the new cookie immediately
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard'
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
