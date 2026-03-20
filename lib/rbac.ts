// Role-based access control definitions

export type UserRole = 'super_admin' | 'clinic_admin' | 'staff' | 'clinician' | 'sales'

export interface Permission {
  resource: string
  action: string
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    { resource: 'memberships', action: 'create' },
    { resource: 'memberships', action: 'read' },
    { resource: 'memberships', action: 'update' },
    { resource: 'memberships', action: 'delete' },
    { resource: 'therapies', action: 'create' },
    { resource: 'therapies', action: 'read' },
    { resource: 'therapies', action: 'update' },
    { resource: 'therapies', action: 'delete' },
    { resource: 'bookings', action: 'create' },
    { resource: 'bookings', action: 'read' },
    { resource: 'bookings', action: 'update' },
    { resource: 'bookings', action: 'delete' },
    { resource: 'dna', action: 'create' },
    { resource: 'dna', action: 'read' },
    { resource: 'dna', action: 'update' },
    { resource: 'dna', action: 'delete' },
    { resource: 'reports', action: 'create' },
    { resource: 'reports', action: 'read' },
    { resource: 'reports', action: 'update' },
    { resource: 'reports', action: 'delete' },
    { resource: 'leads', action: 'create' },
    { resource: 'leads', action: 'read' },
    { resource: 'leads', action: 'update' },
    { resource: 'leads', action: 'delete' },
    { resource: 'audit_logs', action: 'read' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
  ],
  clinic_admin: [
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'create' },
    { resource: 'memberships', action: 'create' },
    { resource: 'memberships', action: 'read' },
    { resource: 'memberships', action: 'update' },
    { resource: 'therapies', action: 'create' },
    { resource: 'therapies', action: 'read' },
    { resource: 'therapies', action: 'update' },
    { resource: 'bookings', action: 'create' },
    { resource: 'bookings', action: 'read' },
    { resource: 'bookings', action: 'update' },
    { resource: 'dna', action: 'read' },
    { resource: 'dna', action: 'update' },
    { resource: 'reports', action: 'read' },
    { resource: 'leads', action: 'read' },
    { resource: 'leads', action: 'update' },
    { resource: 'audit_logs', action: 'read' },
    { resource: 'settings', action: 'read' },
  ],
  staff: [
    { resource: 'users', action: 'read' },
    { resource: 'memberships', action: 'read' },
    { resource: 'therapies', action: 'read' },
    { resource: 'bookings', action: 'read' },
    { resource: 'bookings', action: 'update' },
    { resource: 'dna', action: 'read' },
    { resource: 'reports', action: 'read' },
  ],
  clinician: [
    { resource: 'bookings', action: 'read' },
    { resource: 'bookings', action: 'update' },
    { resource: 'dna', action: 'read' },
    { resource: 'dna', action: 'update' },
    { resource: 'reports', action: 'read' },
    { resource: 'reports', action: 'create' },
  ],
  sales: [
    { resource: 'leads', action: 'read' },
    { resource: 'leads', action: 'create' },
    { resource: 'leads', action: 'update' },
    { resource: 'memberships', action: 'read' },
  ],
}

export function hasPermission(role: UserRole, resource: string, action: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.some(p => p.resource === resource && p.action === action)
}
