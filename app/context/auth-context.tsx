'use client'

import React, { createContext, useState, ReactNode, useEffect } from 'react'
import { UserRole } from '@/lib/rbac'
import { storeCredentials, clearCredentials, getStoredCredentials } from '@/lib/api-client'

// Helpers for auth cookie (read by Next.js middleware)
function setAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'hh_authed=1; path=/; max-age=86400; SameSite=Lax'
  }
}
function clearAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'hh_authed=; path=/; max-age=0; SameSite=Lax'
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
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('hh_user') : null
    if (stored && storedUser) {
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
    clearAuthCookie()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hh_user')
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
