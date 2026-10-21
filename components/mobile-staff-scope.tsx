'use client'

import { useAuth } from '@/hooks/use-auth'

/**
 * FX-09 — role-scoped mobile treatment.
 *
 * Front-desk roles work from a phone. The layouts render this inside the flex
 * wrapper so its children get the `data-mobile-cards="tables"` hook defined in
 * `app/globals.css` when (and only when) one of those roles is signed in — their
 * "Today" pages and reused list pages then render as cards instead of wide
 * tables (FX-47.5).
 *
 * FX-47 widened the set from trainer/nutritionist to every role that now has a
 * short, phone-oriented workspace: staff, sales, manager, clinician and sports
 * scientist too. The org-admin roles (super_admin / clinic_admin) are
 * deliberately excluded — they keep the wide-table layout with horizontal scroll
 * on a phone, unchanged.
 */
const MOBILE_CARD_ROLES = new Set([
  'trainer',
  'nutritionist',
  'staff',
  'sales',
  'manager',
  'clinician',
  'sports_scientist',
])

export function MobileStaffScope({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const isStaffPhoneUser = !!user?.role && MOBILE_CARD_ROLES.has(user.role)

  return (
    <div
      data-mobile-cards={isStaffPhoneUser ? 'tables' : undefined}
      className="contents"
    >
      {children}
    </div>
  )
}
