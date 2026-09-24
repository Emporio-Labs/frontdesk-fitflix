'use client'

import { useAuth } from '@/hooks/use-auth'

/**
 * FX-09 — role-scoped mobile treatment.
 *
 * Trainers and nutritionists work from a phone. The layouts render this inside
 * the flex wrapper so its children get the `data-mobile-cards="tables"` hook
 * defined in `app/globals.css` when (and only when) one of those roles is
 * signed in. Admin roles never get the attribute, so a clinic admin looking
 * at admin pages on a phone still sees the wide-table layout with a
 * horizontal scroll (FX-09.5 is about desktop, but keeping admin phone
 * behaviour unchanged too avoids surprising anyone).
 */
export function MobileStaffScope({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const isStaffPhoneUser = user?.role === 'trainer' || user?.role === 'nutritionist'

  return (
    <div
      data-mobile-cards={isStaffPhoneUser ? 'tables' : undefined}
      className="contents"
    >
      {children}
    </div>
  )
}
