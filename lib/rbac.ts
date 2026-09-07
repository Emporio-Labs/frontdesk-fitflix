// Role-based access control definitions

// `nutritionist` and `sports_scientist` are issued by the backend from
// `User.staffRole`. They exist here so an expert signing in can edit their own
// availability; everything else they need is on their dedicated dashboard.
export type UserRole =
  | 'super_admin'
  | 'clinic_admin'
  | 'staff'
  | 'clinician'
  | 'sales'
  | 'trainer'
  | 'nutritionist'
  | 'sports_scientist'

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
    { resource: 'nutrition', action: 'create' },
    { resource: 'nutrition', action: 'read' },
    { resource: 'nutrition', action: 'update' },
    { resource: 'nutrition', action: 'delete' },
    { resource: 'sports_scientist', action: 'create' },
    { resource: 'sports_scientist', action: 'read' },
    { resource: 'sports_scientist', action: 'update' },
    { resource: 'sports_scientist', action: 'delete' },
    { resource: 'audit_logs', action: 'read' },
    { resource: 'attendance', action: 'read' },
    { resource: 'attendance', action: 'create' },
    { resource: 'attendance', action: 'update' },
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
    { resource: 'nutrition', action: 'create' },
    { resource: 'nutrition', action: 'read' },
    { resource: 'nutrition', action: 'update' },
    { resource: 'nutrition', action: 'delete' },
    { resource: 'sports_scientist', action: 'create' },
    { resource: 'sports_scientist', action: 'read' },
    { resource: 'sports_scientist', action: 'update' },
    { resource: 'sports_scientist', action: 'delete' },
    { resource: 'audit_logs', action: 'read' },
    { resource: 'attendance', action: 'read' },
    { resource: 'attendance', action: 'create' },
    { resource: 'attendance', action: 'update' },
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
    { resource: 'nutrition', action: 'read' },
    { resource: 'sports_scientist', action: 'read' },
    { resource: 'sports_scientist', action: 'update' },
    { resource: 'attendance', action: 'read' },
    { resource: 'attendance', action: 'create' },
    { resource: 'attendance', action: 'update' },
  ],
  clinician: [
    { resource: 'users', action: 'read' },
    { resource: 'bookings', action: 'read' },
    { resource: 'bookings', action: 'update' },
    { resource: 'schedules', action: 'read' },
    { resource: 'schedules', action: 'update' },
    { resource: 'dna', action: 'read' },
    { resource: 'dna', action: 'update' },
    { resource: 'reports', action: 'read' },
    { resource: 'reports', action: 'create' },
    { resource: 'nutrition', action: 'read' },
    { resource: 'nutrition', action: 'update' },
    { resource: 'sports_scientist', action: 'read' },
    { resource: 'sports_scientist', action: 'update' },
  ],
  sales: [
    { resource: 'leads', action: 'read' },
    { resource: 'leads', action: 'create' },
    { resource: 'leads', action: 'update' },
    { resource: 'memberships', action: 'read' },
  ],
  trainer: [
    { resource: 'users', action: 'read' },
    { resource: 'workout_plans', action: 'create' },
    { resource: 'workout_plans', action: 'read' },
    { resource: 'workout_plans', action: 'update' },
    { resource: 'workout_sessions', action: 'create' },
    { resource: 'workout_sessions', action: 'read' },
    { resource: 'workout_sessions', action: 'update' },
    { resource: 'exercises', action: 'read' },
  ],
  nutritionist: [
    { resource: 'users', action: 'read' },
    { resource: 'nutrition_plans', action: 'create' },
    { resource: 'nutrition_plans', action: 'read' },
    { resource: 'nutrition_plans', action: 'update' },
  ],
  sports_scientist: [
    { resource: 'users', action: 'read' },
  ],
}

/**
 * Expert roles that own an ExpertSchedule and may edit their own availability.
 * Admin and front-desk roles may edit anyone's; the backend is the authority
 * on both, this only decides what the UI offers.
 */
export const EXPERT_SELF_SERVICE_ROLES: UserRole[] = [
  'trainer',
  'nutritionist',
  'sports_scientist',
]

export function hasPermission(role: UserRole, resource: string, action: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.some(p => p.resource === resource && p.action === action)
}
