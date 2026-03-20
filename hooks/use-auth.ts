import { useContext } from 'react'
import { AuthContext, AuthContextType } from '@/app/context/auth-context'

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRole() {
  const { role } = useAuth()
  return role
}

export function useCanAccess(resource: string, action: string): boolean {
  const { role } = useAuth()
  const { hasPermission } = require('@/lib/rbac')
  return hasPermission(role, resource, action)
}
