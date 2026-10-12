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
  // FX-47.2 — branch manager lands on their "Today" (open alerts, staff on duty).
  manager: '/admin/today',
  // FX-47.2 — front desk lands on their "Today" (check-ins, payments due).
  staff: '/admin/today',
  // FX-47.1 — clinician lands on the bookings board (their appointment schedule;
  // /admin/appointments is just a redirect to it).
  clinician: '/admin/bookings',
  // FX-47.2 — sales lands on their "Today" (claimable leads, callbacks due).
  sales: '/admin/today',
  // FX-47.2 — trainer lands on their existing "Today" (sessions, members needing plans).
  trainer: '/admin/personal-training/today',
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
 *  - super_admin / clinic_admin are the power roles — unrestricted (absent);
 *  - trainer / nutritionist keep their own pre-FX-31 confinement blocks in
 *    middleware.ts and are intentionally NOT listed here (behaviour preserved);
 *  - FX-47 (F1/F3): staff, clinician and sports_scientist used to fall through
 *    to the full ~31-item admin menu with no confinement. They now each have a
 *    short allow-list matching their role-scoped sidebar menu, so unusable admin
 *    pages bounce back to their start page.
 */
export const ROLE_ALLOWED_PREFIXES: Partial<Record<UserRole, string[]>> = {
  // Branch-ops console. Deliberately excludes org-admin pages (settings,
  // locations, app copy, DNA) and the expert consoles. FX-45.3 adds the audit
  // trail: a manager may open it, but the backend scopes it to their own branch.
  // FX-47.2 — lands on /admin/today instead of the generic /dashboard (whose
  // Quick Actions offered manager-forbidden actions — F2).
  manager: [
    '/admin/today',
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
    '/admin/audit-logs',
    '/admin/me/notifications',
  ],
  // FX-47.2 — sales: their "Today" + the lead queue and memberships they can read.
  sales: ['/admin/today', '/admin/leads', '/admin/memberships', '/admin/me/notifications'],
  // FX-47 — front desk: their "Today" + the pages in navStaffGroup. Matches the
  // `staff` permission set (read-mostly): attendance, members, bookings, spot
  // booking, memberships.
  staff: [
    '/admin/today',
    '/admin/attendance',
    '/admin/users',
    '/admin/bookings',
    '/admin/spot-booking',
    '/admin/memberships',
    '/admin/me/notifications',
  ],
  // FX-47 — clinician: the appointment/bookings board + the clinical pages in
  // navClinicianGroup (members, DNA, reports).
  clinician: [
    '/admin/bookings',
    '/admin/users',
    '/admin/dna',
    '/admin/reports',
    '/admin/me/notifications',
  ],
  // FX-47 (F3) — sports scientist: their own console + member lookup. Previously
  // fell through to the full admin menu with no link back to this console.
  sports_scientist: [
    '/admin/sports-scientist',
    '/admin/users',
    '/admin/me/notifications',
  ],
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
