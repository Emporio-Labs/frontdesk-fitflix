// FX-05 / FX-31 — single source of truth for role workspaces.
//
// Framework-agnostic (no React, no 'use client') so it can be imported by both
// the Edge middleware (middleware.ts) and client code (auth-context, sidebar).
// It unifies the role→start-page map that previously drifted across three
// places (auth-context `getRoleStartPage`, the inline targets in `login()`, and
// middleware's local `ROLE_START_PAGES`).

import type { UserRole } from '@/lib/rbac'

/** Waiting page for a staff account that has not been given a role yet (FX-31.4). */
export const PENDING_PATH = '/pending'

/**
 * Where each role lands after login, and where a confined role is sent when it
 * hits a page it may not use. Every UserRole must have an entry.
 */
export const ROLE_START_PAGES: Record<UserRole, string> = {
  super_admin: '/dashboard',
  clinic_admin: '/dashboard',
  // FX-31.1 — branch manager lands on the operations overview.
  manager: '/dashboard',
  staff: '/dashboard',
  clinician: '/dashboard',
  // FX-31.2 — sales lands straight on the lead queue.
  sales: '/admin/leads',
  trainer: '/admin/personal-training',
  nutritionist: '/admin/nutrition',
  sports_scientist: '/admin/sports-scientist',
  // FX-31.4 — no role yet.
  unassigned: PENDING_PATH,
}

/**
 * Path prefixes a confined role may reach under /admin and /dashboard. Any other
 * protected path bounces the role back to its start page (FX-31.3).
 *
 * Only roles enforced by the shared gate in middleware.ts appear here:
 *  - super_admin / clinic_admin / staff / clinician are unrestricted (absent);
 *  - trainer / nutritionist keep their own pre-FX-31 confinement blocks in
 *    middleware.ts and are intentionally NOT listed here (behaviour preserved).
 */
export const ROLE_ALLOWED_PREFIXES: Partial<Record<UserRole, string[]>> = {
  // Branch-ops console. Deliberately excludes org-admin pages (settings,
  // locations, audit-logs, app copy, DNA) and the expert consoles.
  manager: [
    '/dashboard',
    '/admin/users',
    '/admin/leads',
    '/admin/bookings',
    '/admin/spot-booking',
    '/admin/slots',
    '/admin/attendance',
    '/admin/memberships',
    '/admin/membership-plans',
    '/admin/credits',
    '/admin/invoices',
    '/admin/therapies',
    '/admin/alerts',
    '/admin/reports',
    '/admin/promotions',
    '/admin/me/notifications',
  ],
  // Matches the `sales` permission set: leads + memberships (read).
  sales: ['/admin/leads', '/admin/memberships', '/admin/me/notifications'],
  // Nothing but the waiting page.
  unassigned: [PENDING_PATH],
}

/** Resolve a role's start page, tolerant of unknown/undefined input. */
export function getRoleStartPage(role?: UserRole | string | null): string {
  if (role && role in ROLE_START_PAGES) {
    return ROLE_START_PAGES[role as UserRole]
  }
  return '/dashboard'
}

/**
 * True when `pathname` is within the role's allow-list, matching on path
 * segments (so `/admin/leads` allows `/admin/leads/42` but not `/admin/leadsX`).
 * A role with no entry in ROLE_ALLOWED_PREFIXES is not gated here → always true.
 */
export function isPathAllowedForRole(
  role: UserRole | string | undefined,
  pathname: string,
): boolean {
  const allow = role ? ROLE_ALLOWED_PREFIXES[role as UserRole] : undefined
  if (!allow) return true
  return allow.some((p) => pathname === p || pathname.startsWith(p + '/'))
}
